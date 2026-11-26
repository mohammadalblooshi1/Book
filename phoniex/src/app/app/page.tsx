import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { daysAgoIso } from "@/lib/time";
import { requireWorkspace } from "@/lib/session";

export const metadata: Metadata = { title: "Command Center" };

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export default async function CommandCenter() {
  const ws = await requireWorkspace();
  const supabase = await createClient();
  const since = daysAgoIso(30);

  const [agents, runs, projects, activity] = await Promise.all([
    supabase.from("agents").select("id, name, status").eq("org_id", ws.id),
    supabase.from("agent_runs").select("status, input_tokens, output_tokens, latency_ms").eq("org_id", ws.id).gte("created_at", since),
    supabase.from("project_requests").select("id, status").eq("org_id", ws.id),
    supabase.from("audit_logs").select("id, action, details, created_at").eq("org_id", ws.id).order("created_at", { ascending: false }).limit(10),
  ]);

  const agentRows = agents.data ?? [];
  const runRows = runs.data ?? [];
  const okRuns = runRows.filter((r) => r.status === "ok");
  const issues = runRows.filter((r) => r.status !== "ok");
  const avgLatency = okRuns.length ? Math.round(okRuns.reduce((s, r) => s + r.latency_ms, 0) / okRuns.length / 100) / 10 : 0;
  const tokens = runRows.reduce((s, r) => s + r.input_tokens + r.output_tokens, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">AI Command Center</h1>
        <p className="text-sm text-muted">Live figures for {ws.name} over the last 30 days.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active agents" value={agentRows.filter((a) => a.status === "active").length} hint={`${agentRows.length} total`} />
        <Stat label="Agent conversations" value={okRuns.length} hint={`${tokens.toLocaleString()} tokens`} />
        <Stat label="Avg. response time" value={okRuns.length ? `${avgLatency}s` : "—"} />
        <Stat label="Alerts" value={issues.length} hint="Errors, refusals and limit hits" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Agents</h2>
            <Link href="/app/agents/new" className="btn-secondary px-3 py-1.5">New agent</Link>
          </div>
          {agentRows.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No agents yet. Start from a template such as a Customer Service or Maintenance agent.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {agentRows.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/app/agents/${a.id}`} className="hover:text-accent">{a.name}</Link>
                  <span className="badge">{a.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="font-semibold">Activity log</h2>
          {(activity.data ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-muted">No activity yet.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {(activity.data ?? []).map((a) => (
                <li key={a.id} className="flex justify-between gap-4">
                  <span className="font-mono text-xs">{a.action}</span>
                  <time className="shrink-0 text-xs text-muted">{new Date(a.created_at).toLocaleString("en-GB")}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Projects</h2>
          <Link href="/start" className="btn-secondary px-3 py-1.5">Request a solution</Link>
        </div>
        <p className="mt-2 text-sm text-muted">
          {(projects.data ?? []).length} project request(s) for this workspace. <Link href="/app/projects" className="text-accent underline">View all</Link>
        </p>
      </section>
    </div>
  );
}
