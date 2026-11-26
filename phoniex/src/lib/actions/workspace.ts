"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ORG_COOKIE, requireUser, requireWorkspace, canEdit } from "@/lib/session";
import { industries, templateByKey, agentModels } from "@/lib/site";
import type { FormState } from "@/lib/actions/public";

const industrySlugs = [...industries.map((i) => i.slug), "other"] as const;

const NewOrg = z.object({
  name: z.string().trim().min(2, "Enter your business name").max(120),
  industry: z.enum(industrySlugs, "Choose an industry"),
});

export async function createWorkspace(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = NewOrg.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const division = industries.find((i) => i.slug === parsed.data.industry)?.division ?? "business";

  const supabase = await createClient();
  const { data: orgId, error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
    p_industry: parsed.data.industry,
    p_division: division,
  });
  if (error || !orgId) return { ok: false, message: "Could not create the workspace. Please try again." };

  (await cookies()).set(ORG_COOKIE, orgId as string, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  redirect("/app");
}

export async function switchWorkspace(formData: FormData) {
  const id = String(formData.get("org_id") ?? "");
  (await cookies()).set(ORG_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  redirect("/app");
}

const modelIds = agentModels.map((m) => m.id) as [string, ...string[]];

const AgentInput = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  role_description: z.string().trim().max(500),
  instructions: z.string().trim().max(6000),
  knowledge: z.string().trim().max(30000, "Knowledge is limited to 30,000 characters for now"),
  model: z.enum(modelIds),
  effort: z.enum(["low", "medium", "high"]),
  approval_policy: z.enum(["none", "sensitive", "all"]),
  status: z.enum(["draft", "active", "paused"]),
  monthly_message_limit: z.coerce.number().int().min(0).max(100000),
});

export async function createAgentFromTemplate(formData: FormData) {
  const ws = await requireWorkspace();
  if (!canEdit(ws.role)) redirect("/app/agents?error=permission");
  const template = templateByKey(String(formData.get("template") ?? ""));
  if (!template) redirect("/app/agents/new");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .insert({
      org_id: ws.id,
      name: template.name,
      template: template.key,
      role_description: template.role,
      instructions: template.instructions,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select("id")
    .single();
  if (error || !data) redirect("/app/agents?error=create");

  await supabase.from("audit_logs").insert({
    org_id: ws.id,
    actor_id: (await supabase.auth.getUser()).data.user?.id,
    action: "agent.created",
    details: { agent_id: data.id, template: template.key },
  });
  redirect(`/app/agents/${data.id}`);
}

export async function updateAgent(_prev: FormState, formData: FormData): Promise<FormState> {
  const ws = await requireWorkspace();
  if (!canEdit(ws.role)) return { ok: false, message: "You have view-only access." };
  const id = String(formData.get("id") ?? "");
  const parsed = AgentInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agents")
    .update(parsed.data)
    .eq("id", id)
    .eq("org_id", ws.id)
    .select("id");
  if (error || !data?.length) return { ok: false, message: "Could not save the agent." };

  const user = (await supabase.auth.getUser()).data.user;
  await supabase.from("audit_logs").insert({
    org_id: ws.id,
    actor_id: user?.id,
    action: "agent.updated",
    details: { agent_id: id, status: parsed.data.status, model: parsed.data.model },
  });
  revalidatePath(`/app/agents/${id}`);
  return { ok: true, message: "Saved." };
}

export async function deleteAgent(formData: FormData) {
  const ws = await requireWorkspace();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("agents").delete().eq("id", id).eq("org_id", ws.id); // RLS: owners/admins only
  redirect("/app/agents");
}
