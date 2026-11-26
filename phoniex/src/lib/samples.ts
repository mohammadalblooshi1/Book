import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db, newId, nowIso } from "@/lib/db";
import { deleteImage, storeBytes } from "@/lib/media";
import { buildPlan, type PanoSlot } from "@/lib/plan-generator";

// Clearly labelled SAMPLE listings so the Properties pages are not empty.
// They are owned by a system account that cannot sign in, are flagged
// is_sample = 1 (shown with a "Sample" badge), and do not accept enquiries.
// Images are original illustrations in seed/images (see scripts/generate-sample-images.py).

const SAMPLE_EMAIL = "samples@phoniex.local";
const SAMPLE_ORG = "PHONIEX Sample Properties";
const IMAGES = path.join(/* turbopackIgnore: true */ process.cwd(), "seed", "images");

type Pano = PanoSlot;
type Sample = {
  title: string; purpose: "sale" | "rent"; type: string; emirate: string; community: string; price: number;
  beds: number; baths: number; sqft: number; description: string; photos: string[]; panos: Pano[];
  plan?: "villa" | "apartment" | "penthouse" | "townhouse";
};

const PANO_FILE: Record<Pano, [string, string]> = {
  living: ["pano-living.jpg", "Living room"],
  bedroom: ["pano-bedroom.jpg", "Master bedroom"],
  terrace: ["pano-terrace.jpg", "Terrace & pool"],
};

const SAMPLES: Sample[] = [
  { title: "Family villa with private pool and garden", purpose: "sale", type: "Villa", emirate: "Dubai", community: "Arabian Ranches",
    price: 6_400_000, beds: 4, baths: 5, sqft: 4300, plan: "villa",
    description: "Corner-plot family villa with an open-plan living and dining area, upgraded kitchen, landscaped garden and private pool. Maid's room, two covered parking spaces, walking distance to community park and schools.",
    photos: ["villa-sand.jpg", "living-blue.jpg", "kitchen.jpg", "bedroom.jpg", "garden.jpg"], panos: ["living", "bedroom", "terrace"] },
  { title: "Beachside 5-bed villa with sea views", purpose: "sale", type: "Villa", emirate: "Abu Dhabi", community: "Saadiyat Island",
    price: 9_800_000, beds: 5, baths: 6, sqft: 6100, plan: "villa",
    description: "Contemporary villa a short walk from the beach. Double-height living room, chef's kitchen, home office, rooftop terrace and infinity pool. Close to the cultural district.",
    photos: ["villa-white.jpg", "living-sage.jpg", "kitchen-dark.jpg", "bedroom-warm.jpg", "garden.jpg"], panos: ["living", "terrace"] },
  { title: "Spacious 4-bed villa in a gated community", purpose: "sale", type: "Villa", emirate: "Sharjah", community: "Al Zahia",
    price: 3_150_000, beds: 4, baths: 4, sqft: 3600, plan: "villa",
    description: "Well-kept villa in a family-friendly gated community with pools, gyms and a shopping centre nearby. Large majlis, separate kitchen and a private backyard.",
    photos: ["villa-terracotta.jpg", "living-blue.jpg", "kitchen.jpg", "bedroom.jpg"], panos: ["living"] },
  { title: "Golf-side villa near the marina", purpose: "sale", type: "Villa", emirate: "Ras Al Khaimah", community: "Al Hamra Village",
    price: 4_200_000, beds: 4, baths: 5, sqft: 4000, plan: "villa",
    description: "Villa overlooking the golf course, minutes from the marina and beach. Bright living spaces, covered terrace and private pool.",
    photos: ["villa-grey.jpg", "living-sage.jpg", "bedroom-warm.jpg", "garden.jpg"], panos: ["living", "bedroom", "terrace"] },
  { title: "Modern 4-bed villa for rent on the golf estate", purpose: "rent", type: "Villa", emirate: "Dubai", community: "Jumeirah Golf Estates",
    price: 420_000, beds: 4, baths: 5, sqft: 4500, plan: "villa",
    description: "Fully upgraded villa available for yearly rent. Private pool, landscaped garden, maid's room and golf-course views. Cheques negotiable.",
    photos: ["villa-white.jpg", "living-blue.jpg", "kitchen-dark.jpg", "bedroom.jpg"], panos: ["living", "terrace"] },
  { title: "2-bed marina apartment with balcony", purpose: "sale", type: "Apartment", emirate: "Dubai", community: "Dubai Marina",
    price: 2_350_000, beds: 2, baths: 2, sqft: 1250, plan: "apartment",
    description: "High-floor apartment with marina views, a large balcony, fitted kitchen and built-in wardrobes. Building with pool, gym and 24-hour security; walk to the metro and tram.",
    photos: ["tower-marina.jpg", "living-blue.jpg", "bedroom.jpg", "kitchen.jpg"], panos: ["living"] },
  { title: "1-bed apartment on the waterfront", purpose: "rent", type: "Apartment", emirate: "Abu Dhabi", community: "Al Reem Island",
    price: 95_000, beds: 1, baths: 2, sqft: 800, plan: "apartment",
    description: "Bright one-bedroom apartment with a balcony and canal views. Shared pool and gym, covered parking, close to malls and the corniche.",
    photos: ["tower-city.jpg", "living-sage.jpg", "bedroom-warm.jpg"], panos: [] },
  { title: "Downtown 2-bed with skyline views", purpose: "sale", type: "Apartment", emirate: "Dubai", community: "Downtown Dubai",
    price: 3_900_000, beds: 2, baths: 3, sqft: 1400, plan: "apartment",
    description: "Elegant apartment with floor-to-ceiling windows and skyline views. Walking distance to the mall, boulevard restaurants and the metro.",
    photos: ["tower-night.jpg", "living-blue.jpg", "kitchen-dark.jpg", "bedroom.jpg"], panos: ["living", "bedroom"] },
  { title: "Full-floor penthouse with private terrace", purpose: "sale", type: "Penthouse", emirate: "Dubai", community: "Jumeirah Beach Residence",
    price: 14_500_000, beds: 4, baths: 5, sqft: 5200, plan: "penthouse",
    description: "Rare full-floor penthouse with wrap-around terrace, private plunge pool and sea views from every room. Two parking spaces and direct beach access.",
    photos: ["tower-marina.jpg", "living-sage.jpg", "bedroom-warm.jpg", "kitchen-dark.jpg", "garden.jpg"], panos: ["living", "bedroom", "terrace"] },
  { title: "3-bed townhouse close to the park", purpose: "sale", type: "Townhouse", emirate: "Dubai", community: "Town Square",
    price: 2_050_000, beds: 3, baths: 4, sqft: 2000, plan: "townhouse",
    description: "End-unit townhouse with a private garden, open kitchen and family room. Community with parks, pools, cycling tracks and a supermarket.",
    photos: ["townhouses.jpg", "living-blue.jpg", "kitchen.jpg", "bedroom.jpg"], panos: ["living"] },
  { title: "Modern townhouse for yearly rent", purpose: "rent", type: "Townhouse", emirate: "Abu Dhabi", community: "Yas Island",
    price: 175_000, beds: 3, baths: 4, sqft: 2300, plan: "townhouse",
    description: "Contemporary townhouse near the golf course and theme parks. Private garden, maid's room and two parking spaces.",
    photos: ["townhouses-modern.jpg", "living-sage.jpg", "bedroom-warm.jpg"], panos: [] },
  { title: "Affordable 2-bed family apartment", purpose: "rent", type: "Apartment", emirate: "Ajman", community: "Al Nuaimiya",
    price: 38_000, beds: 2, baths: 2, sqft: 1100, plan: "apartment",
    description: "Spacious apartment close to schools, shops and the corniche. Central A/C, covered parking and easy access to Sharjah and Dubai.",
    photos: ["tower-city.jpg", "living-blue.jpg", "bedroom.jpg"], panos: [] },
  { title: "Mountain-view villa near the beach", purpose: "sale", type: "Villa", emirate: "Fujairah", community: "Al Faseel",
    price: 2_600_000, beds: 3, baths: 4, sqft: 3300, plan: "villa",
    description: "Peaceful villa with mountain views, a short drive from the beach. Large garden, covered parking and a separate guest majlis.",
    photos: ["villa-terracotta.jpg", "living-sage.jpg", "bedroom-warm.jpg", "kitchen.jpg"], panos: ["living", "terrace"] },
  { title: "Residential plot ready to build", purpose: "sale", type: "Land", emirate: "Umm Al Quwain", community: "Al Salamah",
    price: 750_000, beds: 0, baths: 0, sqft: 10000,
    description: "Freehold residential plot with road access and utilities nearby. Suitable for a family villa.",
    photos: ["land.jpg"], panos: [] },
  { title: "Fitted office with canal views", purpose: "rent", type: "Office", emirate: "Dubai", community: "Business Bay",
    price: 180_000, beds: 0, baths: 2, sqft: 1500,
    description: "Fitted and partitioned office with meeting room, pantry and canal views. Close to the metro and Sheikh Zayed Road.",
    photos: ["tower-city.jpg", "office.jpg"], panos: [] },
];

function sampleUserId() {
  const conn = db();
  const existing = conn.prepare("select id from users where email = ?").get(SAMPLE_EMAIL) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = newId();
  // "disabled" is not a valid password hash, so this account can never sign in.
  conn.prepare("insert into users (id, email, password_hash, full_name) values (?, ?, 'disabled', 'Sample owner')").run(id, SAMPLE_EMAIL);
  return id;
}

export function sampleCount() {
  return (db().prepare("select count(*) as n from listings where is_sample = 1").get() as { n: number }).n;
}

export async function removeSamples() {
  const conn = db();
  const files = conn
    .prepare("select m.file from listing_media m join listings l on l.id = m.listing_id where l.is_sample = 1")
    .all() as { file: string }[];
  conn.prepare("delete from listings where is_sample = 1").run();
  conn.prepare("delete from organizations where name = ? and created_by = (select id from users where email = ?)").run(SAMPLE_ORG, SAMPLE_EMAIL);
  for (const f of files) await deleteImage(f.file);
  return files.length;
}

/** Adds the sample listings (replacing any earlier copy). Returns how many were added. */
export async function seedSamples() {
  await removeSamples();
  const conn = db();
  const userId = sampleUserId();
  const orgId = newId();
  conn.prepare("insert into organizations (id, name, industry, division, created_by) values (?, ?, 'real-estate', 'home', ?)").run(orgId, SAMPLE_ORG, userId);

  async function image(name: string) {
    // each listing gets its own copy so removing one never breaks another
    const bytes = new Uint8Array(await readFile(path.join(/* turbopackIgnore: true */ IMAGES, name)));
    const stored = await storeBytes(bytes);
    if (!stored.ok) throw new Error(`Bad sample image ${name}`);
    return stored;
  }

  const start = Date.now();
  for (const [i, s] of SAMPLES.entries()) {
    const id = newId();
    const publishedAt = new Date(start - i * 3600_000).toISOString();
    conn.prepare(
      `insert into listings (id, org_id, created_by, title, purpose, property_type, emirate, community, price_aed, bedrooms,
         bathrooms, size_sqft, description, contact_name, status, is_sample, published_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Sample owner', 'published', 1, ?, ?)`,
    ).run(id, orgId, userId, s.title, s.purpose, s.type, s.emirate, s.community, s.price, s.beds, s.baths, s.sqft,
      s.description, publishedAt, nowIso());

    const add = (kind: "photo" | "pano", file: { file: string; mime: string }, title: string, sort: number) => {
      const mediaId = newId();
      conn.prepare("insert into listing_media (id, listing_id, org_id, kind, file, mime, title, sort, is_illustration) values (?, ?, ?, ?, ?, ?, ?, ?, 1)")
        .run(mediaId, id, orgId, kind, file.file, file.mime, title, sort);
      return mediaId;
    };
    for (const [n, photo] of s.photos.entries()) add("photo", await image(photo), "", n);
    const panoIds: Partial<Record<Pano, string>> = {};
    for (const [n, p] of s.panos.entries()) panoIds[p] = add("pano", await image(PANO_FILE[p][0]), PANO_FILE[p][1], n);
    if (s.plan) {
      conn.prepare("update listings set floor_plan = ? where id = ?").run(JSON.stringify(buildPlan(s.plan, s.beds, panoIds)), id);
    }
  }
  return SAMPLES.length;
}
