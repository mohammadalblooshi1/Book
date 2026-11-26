"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canEdit, requireWorkspace } from "@/lib/session";
import * as L from "@/lib/listings";
import { FloorPlan } from "@/lib/floor-plan";
import { deleteImage } from "@/lib/media";
import { sendEmail } from "@/lib/email";
import type { FormState } from "@/lib/actions/public";

const ListingSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(120),
  purpose: z.enum(["sale", "rent"]),
  property_type: z.enum(L.PROPERTY_TYPES, "Choose a property type"),
  emirate: z.enum(L.EMIRATES, "Choose an emirate"),
  community: z.string().trim().max(120).default(""),
  price_aed: z.coerce.number().int("Price must be a whole number").min(1, "Enter a price").max(2_000_000_000),
  bedrooms: z.coerce.number().int().min(0).max(50),
  bathrooms: z.coerce.number().int().min(0).max(50),
  size_sqft: z.coerce.number().int().min(0).max(10_000_000),
  description: z.string().trim().max(8000).default(""),
  permit_number: z.string().trim().max(60).default(""),
  contact_name: z.string().trim().max(120).default(""),
  contact_phone: z.string().trim().max(40).regex(/^[+\d\s()-]*$/, "Phone can contain digits, spaces and + - ( ) only").default(""),
});

function errorsOf(e: z.ZodError) {
  const out: Record<string, string> = {};
  e.issues.forEach((i) => (out[String(i.path[0])] ??= i.message));
  return out;
}

export async function createListingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, ws } = await requireWorkspace();
  if (!canEdit(ws.role)) return { ok: false, message: "You have view-only access." };
  const parsed = ListingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: errorsOf(parsed.error) };
  const id = L.createListing(user.id, ws.id, parsed.data);
  redirect(`/app/listings/${id}?created=1`);
}

export async function updateListingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireWorkspace();
  const id = String(formData.get("id") ?? "");
  const parsed = ListingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: errorsOf(parsed.error) };
  try {
    if (!L.updateListing(user.id, id, parsed.data)) return { ok: false, message: "Listing not found." };
  } catch {
    return { ok: false, message: "You don't have permission to edit this listing." };
  }
  revalidatePath(`/app/listings/${id}`);
  revalidatePath(`/properties/${id}`);
  return { ok: true, message: "Saved." };
}

export async function setListingStatusAction(formData: FormData) {
  const { user } = await requireWorkspace();
  const id = String(formData.get("id") ?? "");
  const status = z.enum(L.LISTING_STATUSES).safeParse(formData.get("status"));
  if (status.success) {
    const listing = L.getListingForOwner(user.id, id);
    if (listing && status.data === "published" && L.countMedia(id, "photo") === 0) {
      redirect(`/app/listings/${id}?error=photo`);
    }
    L.setListingStatus(user.id, id, status.data);
  }
  revalidatePath(`/app/listings/${id}`);
  redirect(`/app/listings/${id}`);
}

export async function saveFloorPlanAction(listingId: string, plan: unknown): Promise<FormState> {
  const { user } = await requireWorkspace();
  const parsed = FloorPlan.safeParse(plan);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid floor plan." };
  const panoIds = new Set(L.listMedia(listingId).filter((m) => m.kind === "pano").map((m) => m.id));
  const rooms = parsed.data.rooms.map((r) => ({ ...r, panoId: r.panoId && panoIds.has(r.panoId) ? r.panoId : null }));
  try {
    if (!L.saveFloorPlan(user.id, listingId, JSON.stringify({ ...parsed.data, rooms }))) {
      return { ok: false, message: "Listing not found." };
    }
  } catch {
    return { ok: false, message: "You don't have permission to edit this listing." };
  }
  revalidatePath(`/properties/${listingId}`);
  return { ok: true, message: "Floor plan saved." };
}

export async function deleteMediaAction(formData: FormData) {
  const { user } = await requireWorkspace();
  const m = L.removeMedia(user.id, String(formData.get("media_id") ?? ""));
  if (m) {
    await deleteImage(m.file);
    revalidatePath(`/app/listings/${m.listing_id}`);
    redirect(`/app/listings/${m.listing_id}#media`);
  }
  redirect("/app/listings");
}

export async function deleteListingAction(formData: FormData) {
  const { user } = await requireWorkspace();
  const files = L.deleteListing(user.id, String(formData.get("id") ?? ""));
  for (const f of files ?? []) await deleteImage(f);
  redirect("/app/listings");
}

const Enquiry = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.email("Please enter a valid email").max(200),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10, "Please write a short message").max(3000),
});

export async function submitEnquiryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("website")) return { ok: true, message: "Thanks — the owner has received your message." };
  const parsed = Enquiry.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: errorsOf(parsed.error) };
  const result = L.createEnquiry(String(formData.get("listing_id") ?? ""), parsed.data);
  if (!result) return { ok: false, message: "This property is no longer available." };
  if (result.ownerEmail) {
    const d = parsed.data;
    await sendEmail({
      to: result.ownerEmail,
      replyTo: d.email,
      subject: `New enquiry: ${result.listing.title}`,
      text: `${d.name} <${d.email}>${d.phone ? ` · ${d.phone}` : ""}\n\n${d.message}`,
    });
  }
  return { ok: true, message: "Thanks — your message was sent to the owner. They will contact you directly." };
}
