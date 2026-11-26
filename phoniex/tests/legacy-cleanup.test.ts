import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

test("sample listings from older versions are removed on startup; client listings are kept", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "phoniex-legacy-"));
  process.env.DATABASE_PATH = path.join(dir, "old.db");
  process.env.UPLOADS_DIR = path.join(dir, "uploads");
  mkdirSync(process.env.UPLOADS_DIR);
  const { db, resetDb } = await import("@/lib/db");
  const { createUser } = await import("@/lib/auth-core");
  const repo = await import("@/lib/repo");
  const L = await import("@/lib/listings");

  // Simulate a database created by the older version that had sample listings.
  const u = await createUser("client@example.com", "correct-horse-battery", "Client");
  assert.ok(u.ok);
  const org = repo.createOrganization(u.userId, "Client Co", "homes-villas", "home");
  const input = { title: "Client villa listing", purpose: "sale" as const, property_type: "Villa", emirate: "Dubai", community: "",
    price_aed: 1_000_000, bedrooms: 3, bathrooms: 3, size_sqft: 2000, description: "", permit_number: "", contact_name: "", contact_phone: "" };
  const keep = L.createListing(u.userId, org, input);
  const sample = L.createListing(u.userId, org, { ...input, title: "Old sample listing" });
  const file = "11111111-1111-1111-1111-111111111111.jpg";
  writeFileSync(path.join(process.env.UPLOADS_DIR, file), "x");
  L.addMedia(u.userId, sample, { kind: "photo", file, mime: "image/jpeg", title: "" });
  db().exec("alter table listings add column is_sample integer not null default 0");
  db().prepare("update listings set is_sample = 1 where id = ?").run(sample);

  resetDb(); // restart
  assert.ok(L.getListingForOwner(u.userId, keep), "client listing kept");
  assert.equal(L.getListingForOwner(u.userId, sample), null, "sample listing removed");
  assert.equal(existsSync(path.join(process.env.UPLOADS_DIR, file)), false, "sample image file removed");
});
