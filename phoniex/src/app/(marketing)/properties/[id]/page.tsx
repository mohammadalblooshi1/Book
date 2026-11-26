import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/session";
import { getListingForOwner, getPublicListing, listMedia, type Listing } from "@/lib/listings";
import { AccessDenied } from "@/lib/repo";
import { parsePlan } from "@/lib/floor-plan";
import { aed } from "@/lib/format";
import { EnquiryForm } from "@/components/enquiry-form";
import { PropertyTour } from "@/components/property-tour";

export const dynamic = "force-dynamic";

/** Public listing, or a private preview for members of the owning workspace. */
async function load(id: string): Promise<{ listing: Listing; preview: boolean } | null> {
  const pub = getPublicListing(id);
  if (pub) return { listing: pub, preview: false };
  const user = await getUser();
  if (!user) return null;
  try {
    const own = getListingForOwner(user.id, id);
    return own ? { listing: own, preview: true } : null;
  } catch (e) {
    if (e instanceof AccessDenied) return null;
    throw e;
  }
}

export async function generateMetadata(props: PageProps<"/properties/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const l = getPublicListing(id);
  return l ? { title: l.title, description: `${l.property_type} in ${l.community ? `${l.community}, ` : ""}${l.emirate} — ${aed(l.price_aed)}` } : { title: "Property" };
}

export default async function PropertyPage(props: PageProps<"/properties/[id]">) {
  const { id } = await props.params;
  const data = await load(id);
  if (!data) notFound();
  const { listing: l, preview } = data;
  const media = listMedia(id);
  const photos = media.filter((m) => m.kind === "photo");
  const panos = media.filter((m) => m.kind === "pano").map((m) => ({ id: m.id, title: m.title }));
  const plan = parsePlan(l.floor_plan);
  const closed = l.status === "sold";

  const facts = [
    ["Type", l.property_type],
    ["Bedrooms", String(l.bedrooms)],
    ["Bathrooms", String(l.bathrooms)],
    ["Size", l.size_sqft ? `${l.size_sqft.toLocaleString()} sq ft` : "—"],
    ["Location", `${l.community ? `${l.community}, ` : ""}${l.emirate}`],
    ...(l.permit_number ? [["Permit no.", l.permit_number]] : []),
  ];

  return (
    <div className="container-page py-10">
      {preview ? (
        <p role="status" className="mb-6 rounded-lg border border-warn p-3 text-sm text-warn">
          Preview — this listing is <strong>{l.status}</strong> and only visible to your workspace.{" "}
          <Link href={`/app/listings/${l.id}`} className="underline">Back to editor</Link>
        </p>
      ) : null}
      {l.is_sample ? (
        <p role="note" className="mb-6 rounded-lg border border-warn p-3 text-sm text-warn">
          <strong>Sample listing.</strong> This is an illustrative property created to demonstrate the platform — it is not a real
          offer, and the images are illustrations. Enquiries are disabled.
        </p>
      ) : null}
      <Link href="/properties" className="text-sm text-muted hover:text-fg">← All properties</Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl">{l.title}</h1>
          <p className="text-muted">{l.community ? `${l.community}, ` : ""}{l.emirate}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{aed(l.price_aed)}</p>
          <p className="text-sm text-muted">{l.purpose === "rent" ? "per year" : "asking price"}</p>
        </div>
      </div>

      {photos.length ? (
        <div className="mt-6 grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
          {photos.slice(0, 5).map((p, i) => (
            <a key={p.id} href={`/media/${p.id}`} target="_blank" className={`overflow-hidden rounded-xl bg-surface-2 ${i === 0 ? "aspect-[4/3] sm:col-span-2 sm:row-span-2" : "hidden aspect-[4/3] sm:block"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/media/${p.id}`} alt={`${l.title} photo ${i + 1}`} className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      ) : null}
      {photos.length > 5 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-accent">Show all {photos.length} photos</summary>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {photos.slice(5).map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={`/media/${p.id}`} alt={`${l.title} photo ${i + 6}`} className="aspect-[4/3] w-full rounded-lg object-cover" loading="lazy" />
            ))}
          </div>
        </details>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {facts.map(([k, v]) => (
              <div key={k} className="rounded-lg border border-border bg-surface p-3">
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {l.description ? (
            <section>
              <h2 className="mb-2 text-xl font-semibold">About this property</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{l.description}</p>
            </section>
          ) : null}
          <PropertyTour panoramas={panos} plan={plan} />
        </div>

        <aside className="space-y-4">
          <div className="card lg:sticky lg:top-24">
            <h2 className="font-semibold">Contact the owner</h2>
            <p className="mb-4 text-sm text-muted">
              {l.contact_name ? `${l.contact_name} · ` : ""}Listed directly by the owner — no agent.
            </p>
            {l.contact_phone && !closed ? (
              <p className="mb-4 text-sm">Phone / WhatsApp: <a href={`tel:${l.contact_phone.replace(/[^+\d]/g, "")}`} className="font-medium text-accent underline">{l.contact_phone}</a></p>
            ) : null}
            {l.is_sample ? (
              <p className="text-sm text-muted">Enquiries are disabled for sample listings.</p>
            ) : closed ? (
              <p className="text-sm text-muted">This property has been {l.purpose === "rent" ? "rented" : "sold"}.</p>
            ) : preview ? (
              <p className="text-sm text-muted">The enquiry form appears here once the listing is published.</p>
            ) : (
              <EnquiryForm listingId={l.id} title={l.title} />
            )}
          </div>
          <p className="text-xs text-muted">
            Details, photos and plans are provided by the owner and have not been verified by PHONIEX. Always view the property and check
            title documents before paying any money.
          </p>
        </aside>
      </div>
    </div>
  );
}
