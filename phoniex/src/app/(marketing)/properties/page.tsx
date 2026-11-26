import type { Metadata } from "next";
import Link from "next/link";
import { EMIRATES, PROPERTY_TYPES, searchPublicListings } from "@/lib/listings";
import { aed } from "@/lib/format";

export const metadata: Metadata = {
  title: "Properties",
  description: "Villas, apartments and homes across the UAE, listed directly by their owners.",
};
export const dynamic = "force-dynamic";

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
};
const str = (v: unknown) => (typeof v === "string" && v.length <= 100 ? v : undefined);

export default async function PropertiesPage(props: PageProps<"/properties">) {
  const sp = await props.searchParams;
  const filters = {
    purpose: str(sp.purpose), emirate: str(sp.emirate), type: str(sp.type), q: str(sp.q),
    minPrice: num(sp.min), maxPrice: num(sp.max), beds: num(sp.beds),
  };
  const results = searchPublicListings(filters);

  return (
    <div className="container-page py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Properties</h1>
          <p className="mt-2 text-muted">Listed directly by owners — with photos, 360° tours and floor plans.</p>
        </div>
        <Link href="/app/listings/new" className="btn-primary">List your property</Link>
      </div>

      <form className="card mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-7" role="search">
        <input name="q" defaultValue={filters.q} className="input lg:col-span-2" placeholder="Search title or community" aria-label="Search" />
        <select name="purpose" defaultValue={filters.purpose ?? ""} className="input" aria-label="Buy or rent">
          <option value="">Buy or rent</option>
          <option value="sale">Buy</option>
          <option value="rent">Rent</option>
        </select>
        <select name="emirate" defaultValue={filters.emirate ?? ""} className="input" aria-label="Emirate">
          <option value="">All emirates</option>
          {EMIRATES.map((e) => <option key={e}>{e}</option>)}
        </select>
        <select name="type" defaultValue={filters.type ?? ""} className="input" aria-label="Property type">
          <option value="">All types</option>
          {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select name="beds" defaultValue={filters.beds ?? ""} className="input" aria-label="Bedrooms">
          <option value="">Any beds</option>
          {[1, 2, 3, 4, 5].map((b) => <option key={b} value={b}>{b}+ beds</option>)}
        </select>
        <div className="flex gap-2">
          <input name="max" type="number" min={0} defaultValue={filters.maxPrice} className="input" placeholder="Max AED" aria-label="Maximum price in AED" />
          <button className="btn-primary">Search</button>
        </div>
      </form>

      <p className="mt-6 text-sm text-muted">{results.length} propert{results.length === 1 ? "y" : "ies"}</p>
      {results.length === 0 ? (
        <div className="card mt-4 text-center text-muted">No properties match your search yet.</div>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((l) => (
            <Link key={l.id} href={`/properties/${l.id}`} className="group overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-accent">
              <div className="relative aspect-[4/3] bg-surface-2">
                {l.cover_id ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/media/${l.cover_id}`} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : null}
                <div className="absolute left-2 top-2 flex gap-1">
                  <span className="rounded bg-black/65 px-2 py-0.5 text-xs font-medium text-white">For {l.purpose === "rent" ? "rent" : "sale"}</span>
                  {l.pano_count > 0 ? <span className="rounded bg-accent px-2 py-0.5 text-xs font-semibold text-accent-fg">360° tour</span> : null}
                  {l.is_sample ? <span className="rounded bg-white/90 px-2 py-0.5 text-xs font-semibold text-navy">Sample</span> : null}
                  {l.status === "sold" ? <span className="rounded bg-danger px-2 py-0.5 text-xs font-semibold text-white">{l.purpose === "rent" ? "Rented" : "Sold"}</span> : null}
                </div>
              </div>
              <div className="p-4">
                <p className="text-lg font-bold">{aed(l.price_aed)}{l.purpose === "rent" ? <span className="text-sm font-normal text-muted"> / year</span> : null}</p>
                <h2 className="mt-1 truncate font-semibold group-hover:text-accent">{l.title}</h2>
                <p className="truncate text-sm text-muted">{l.community ? `${l.community}, ` : ""}{l.emirate}</p>
                <p className="mt-2 text-xs text-muted">
                  {l.property_type} · {l.bedrooms} bed · {l.bathrooms} bath{l.size_sqft ? ` · ${l.size_sqft.toLocaleString()} sq ft` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
