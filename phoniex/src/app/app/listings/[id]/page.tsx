import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canEdit, requireWorkspace } from "@/lib/session";
import { EMIRATES, PROPERTY_TYPES, MAX_PANOS, MAX_PHOTOS, getListingForOwner, listEnquiries, listMedia } from "@/lib/listings";
import { AccessDenied, roleOf } from "@/lib/repo";
import { parsePlan } from "@/lib/floor-plan";
import { deleteListingAction, deleteMediaAction, dismissAgentNotesAction, setListingStatusAction } from "@/lib/actions/listings";
import { ListingForm } from "@/components/listing-form";
import { MediaUploader } from "@/components/media-uploader";
import { FloorPlanEditor } from "@/components/floor-plan-editor";

export const metadata: Metadata = { title: "Edit listing" };

function StatusButton({ id, status, label, primary }: { id: string; status: string; label: string; primary?: boolean }) {
  return (
    <form action={setListingStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={primary ? "btn-primary" : "btn-secondary"}>{label}</button>
    </form>
  );
}

export default async function ListingEditorPage(props: PageProps<"/app/listings/[id]">) {
  const { id } = await props.params;
  const { error, created, drafted } = await props.searchParams;
  const { user } = await requireWorkspace();
  let listing;
  try {
    listing = getListingForOwner(user.id, id);
  } catch (e) {
    if (e instanceof AccessDenied) notFound();
    throw e;
  }
  if (!listing) notFound();

  const role = roleOf(user.id, listing.org_id);
  const editable = role !== null && canEdit(role);
  const media = listMedia(id);
  const photos = media.filter((m) => m.kind === "photo");
  const panos = media.filter((m) => m.kind === "pano");
  const panoIdSet = new Set(panos.map((p) => p.id));
  const rawPlan = parsePlan(listing.floor_plan);
  const plan = { ...rawPlan, rooms: rawPlan.rooms.map((r) => (r.panoId && !panoIdSet.has(r.panoId) ? { ...r, panoId: null } : r)) };
  let agentNotes: string[] = [];
  try {
    agentNotes = listing.agent_notes ? (JSON.parse(listing.agent_notes) as string[]) : [];
  } catch {}
  const enquiries = listEnquiries(user.id, id);

  const checklist = [
    { done: true, label: "Details" },
    { done: listing.price_aed > 0, label: "Price set (required to publish)" },
    { done: photos.length > 0, label: "At least one photo (required to publish)" },
    { done: panos.length > 0, label: "360° virtual tour (optional)" },
    { done: plan.rooms.length > 0, label: "Floor plan diagram (optional)" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/app/listings" className="text-sm text-muted hover:text-fg">← Listings</Link>
          <h1 className="truncate text-2xl font-bold">{listing.title}</h1>
          <p className="text-sm text-muted">
            Status: <span className="font-medium text-fg">{listing.status}</span>
            {listing.status === "published" ? " · visible to everyone" : listing.status === "draft" ? " · only your workspace can see it" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/properties/${id}`} className="btn-secondary" target="_blank">
            {listing.status === "published" || listing.status === "sold" ? "View public page" : "Preview"}
          </Link>
          {editable && listing.status !== "published" ? <StatusButton id={id} status="published" label="Publish" primary /> : null}
          {editable && listing.status === "published" ? <StatusButton id={id} status="sold" label={listing.purpose === "rent" ? "Mark as rented" : "Mark as sold"} /> : null}
          {editable && listing.status === "published" ? <StatusButton id={id} status="draft" label="Unpublish" /> : null}
        </div>
      </div>

      {created ? <p role="status" className="rounded-lg border border-ok p-3 text-sm text-ok">Listing created as a draft. Add photos, then publish.</p> : null}
      {error === "photo" ? <p role="alert" className="rounded-lg border border-danger p-3 text-sm text-danger">Add at least one photo before publishing.</p> : null}
      {error === "price" ? <p role="alert" className="rounded-lg border border-danger p-3 text-sm text-danger">Set the price in Details before publishing.</p> : null}
      {agentNotes.length ? (
        <section className="rounded-xl border border-accent bg-accent-soft p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="font-semibold">{drafted ? "Your listing agent prepared this draft" : "Notes from the listing agent"}</h2>
            {editable ? (
              <form action={dismissAgentNotesAction}>
                <input type="hidden" name="id" value={id} />
                <button className="btn-ghost px-2 py-1 text-xs">Dismiss</button>
              </form>
            ) : null}
          </div>
          <p className="mt-1 text-sm">Review everything below before publishing — the agent can make mistakes.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {agentNotes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </section>
      ) : null}

      <section className="card">
        <h2 className="mb-3 font-semibold">Checklist</h2>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {checklist.map((c) => (
            <li key={c.label} className="flex items-center gap-2">
              <span aria-hidden className={c.done ? "text-ok" : "text-muted"}>{c.done ? "✓" : "○"}</span>
              <span className={c.done ? "" : "text-muted"}>{c.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="media" className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Photos</h2>
          <span className="text-xs text-muted">{photos.length} / {MAX_PHOTOS} · the first photo is the cover</span>
        </div>
        {photos.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((p) => (
              <div key={p.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/media/${p.id}`} alt="" className="h-full w-full object-cover" />
                {editable ? (
                  <form action={deleteMediaAction} className="absolute right-1 top-1">
                    <input type="hidden" name="media_id" value={p.id} />
                    <button className="rounded bg-black/60 px-2 py-0.5 text-xs text-white hover:bg-black/80" aria-label="Remove photo">Remove</button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted">No photos yet.</p>}
        {editable && photos.length < MAX_PHOTOS ? <MediaUploader listingId={id} kind="photo" /> : null}
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">360° virtual tour (VR)</h2>
          <span className="text-xs text-muted">{panos.length} / {MAX_PANOS}</span>
        </div>
        <p className="text-sm text-muted">
          Upload one 360° photo per room — taken with a 360° camera or your phone&apos;s 360°/photo-sphere mode
          (a 2:1 “equirectangular” image). Buyers can look around on any device and use VR headsets.
        </p>
        {panos.length ? (
          <ul className="divide-y divide-border text-sm">
            {panos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                <span className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/media/${p.id}`} alt="" className="h-10 w-20 rounded object-cover" />
                  {p.title}
                </span>
                {editable ? (
                  <form action={deleteMediaAction}>
                    <input type="hidden" name="media_id" value={p.id} />
                    <button className="btn-ghost px-2 py-1 text-xs text-danger">Remove</button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        {editable && panos.length < MAX_PANOS ? <MediaUploader listingId={id} kind="pano" /> : null}
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Floor plan diagram</h2>
        <p className="text-sm text-muted">Draw your rooms on the grid. Link a room to a 360° photo so buyers can click it on the plan.</p>
        <FloorPlanEditor listingId={id} initial={plan} panoramas={panos.map((p) => ({ id: p.id, title: p.title }))} readOnly={!editable} />
      </section>

      <section className="card">
        <h2 className="mb-4 font-semibold">Details</h2>
        <ListingForm
          readOnly={!editable}
          emirates={EMIRATES}
          types={PROPERTY_TYPES}
          values={{ ...listing, price_aed: listing.price_aed, size_sqft: listing.size_sqft }}
        />
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Enquiries from buyers ({enquiries.length})</h2>
        {enquiries.length === 0 ? <p className="text-sm text-muted">No enquiries yet. They appear here once your listing is published.</p> : (
          <ul className="space-y-3">
            {enquiries.map((e) => (
              <li key={e.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{e.name} · <a className="text-accent underline" href={`mailto:${e.email}`}>{e.email}</a>{e.phone ? ` · ${e.phone}` : ""}</p>
                <p className="text-xs text-muted">{new Date(e.created_at).toLocaleString("en-GB")}</p>
                <p className="mt-2 whitespace-pre-wrap">{e.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editable ? (
        <form action={deleteListingAction} className="flex justify-end">
          <input type="hidden" name="id" value={id} />
          <button className="btn-ghost text-danger">Delete listing permanently</button>
        </form>
      ) : null}
    </div>
  );
}
