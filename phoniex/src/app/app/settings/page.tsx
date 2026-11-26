import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/session";
import { industries, plans } from "@/lib/site";

export const metadata: Metadata = { title: "Workspace" };

export default async function SettingsPage() {
  const ws = await requireWorkspace();
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("memberships")
    .select("user_id, role, created_at")
    .eq("org_id", ws.id)
    .order("created_at");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Workspace</h1>
      <section className="card grid gap-4 sm:grid-cols-3">
        <div><p className="text-xs text-muted">Name</p><p className="font-medium">{ws.name}</p></div>
        <div><p className="text-xs text-muted">Industry</p><p className="font-medium">{industries.find((i) => i.slug === ws.industry)?.name ?? "Other"}</p></div>
        <div><p className="text-xs text-muted">Plan</p><p className="font-medium">{plans.find((p) => p.key === ws.plan)?.name ?? ws.plan}</p></div>
      </section>
      <section className="card">
        <h2 className="font-semibold">Members</h2>
        <ul className="mt-3 divide-y divide-border text-sm">
          {(members ?? []).map((m) => (
            <li key={m.user_id} className="flex justify-between py-2">
              <span className="font-mono text-xs">{m.user_id}</span>
              <span className="badge">{m.role}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">Member invitations arrive in the next release.</p>
      </section>
    </div>
  );
}
