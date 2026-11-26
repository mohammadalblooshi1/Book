import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const ORG_COOKIE = "phx_org";

export type OrgRole = "owner" | "admin" | "member" | "viewer";
export type Workspace = {
  id: string;
  name: string;
  industry: string;
  division: string;
  plan: string;
  role: OrgRole;
};

/** The verified signed-in user, or null. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** All workspaces the user belongs to (RLS limits this to their memberships). */
export const getWorkspaces = cache(async (): Promise<Workspace[]> => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("role, organizations(id, name, industry, division, plan)")
    .eq("user_id", user.id)
    .order("created_at");
  if (error || !data) return [];
  return data.flatMap((row) => {
    const org = row.organizations as unknown as Omit<Workspace, "role"> | null;
    return org ? [{ ...org, role: row.role as OrgRole }] : [];
  });
});

/** The active workspace (from cookie, else the first one). Redirects to onboarding if none. */
export async function requireWorkspace(): Promise<Workspace> {
  await requireUser();
  const workspaces = await getWorkspaces();
  if (workspaces.length === 0) redirect("/onboarding");
  const selected = (await cookies()).get(ORG_COOKIE)?.value;
  return workspaces.find((w) => w.id === selected) ?? workspaces[0];
}

export function canEdit(role: OrgRole) {
  return role === "owner" || role === "admin" || role === "member";
}

export const isPlatformAdmin = cache(async () => {
  const user = await getUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("is_platform_admin").eq("id", user.id).single();
  return Boolean(data?.is_platform_admin);
});
