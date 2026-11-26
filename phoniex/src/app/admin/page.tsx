import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { daysAgoIso } from "@/lib/time";
import { isPlatformAdmin, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Platform admin" };

export default async function AdminPage() {
  await requireUser();
  if (!(await isPlatformAdmin())) notFound();
  const supabase = await createClient();

  const [orgs, leads, requests, runs] = await Promise.all([
    supabase.from("organizations").select("id, name, industry, plan, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("leads").select("id, name, email, company, message, created_at").order("created_at", { ascending: false }).limit(25),
    supabase.from("project_requests").select("id, company, contact_email, industry, status, created_at").order("created_at", { ascending: false }).limit(25),
    supabase.from("agent_runs").select("input_tokens, output_tokens, status").gte("created_at", daysAgoIso(30)),
  ]);
  const runRows = runs.data ?? [];
  const tokens = runRows.reduce((s, r) => s + r.input_tokens + r.output_tokens, 0);

  return (
    <main className="container-page space-y-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Platform admin</h1>
        <Link href="/app" className="btn-secondary">Back to workspace</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card"><p className="text-sm text-muted">Organizations</p><p className="text-3xl font-bold">{orgs.data?.length ?? 0}</p></div>
        <div className="card"><p className="text-sm text-muted">Agent runs (30d)</p><p className="text-3xl font-bold">{runRows.length}</p></div>
        <div className="card"><p className="text-sm text-muted">Tokens (30d)</p><p className="text-3xl font-bold">{tokens.toLocaleString()}</p></div>
      </div>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">Project requests</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted"><tr><th>Company</th><th>Contact</th><th>Industry</th><th>Status</th><th>Date</th></tr></thead>
          <tbody className="divide-y divide-border">
            {(requests.data ?? []).map((r) => (
              <tr key={r.id}><td className="py-1.5">{r.company}</td><td>{r.contact_email}</td><td>{r.industry}</td><td><span className="badge">{r.status}</span></td><td>{new Date(r.created_at).toLocaleDateString("en-GB")}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">Contact leads</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted"><tr><th>Name</th><th>Email</th><th>Company</th><th>Message</th><th>Date</th></tr></thead>
          <tbody className="divide-y divide-border">
            {(leads.data ?? []).map((l) => (
              <tr key={l.id}><td className="py-1.5">{l.name}</td><td>{l.email}</td><td>{l.company ?? "—"}</td><td className="max-w-xs truncate">{l.message}</td><td>{new Date(l.created_at).toLocaleDateString("en-GB")}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">Organizations</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted"><tr><th>Name</th><th>Industry</th><th>Plan</th><th>Created</th></tr></thead>
          <tbody className="divide-y divide-border">
            {(orgs.data ?? []).map((o) => (
              <tr key={o.id}><td className="py-1.5">{o.name}</td><td>{o.industry}</td><td>{o.plan}</td><td>{new Date(o.created_at).toLocaleDateString("en-GB")}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
