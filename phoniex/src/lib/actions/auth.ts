"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import type { FormState } from "@/lib/actions/public";

function safeNext(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
}

const Credentials = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = Credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Enter your email and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, message: "Email or password is incorrect, or the email is not confirmed yet." };
  redirect(safeNext(formData.get("next")));
}

const SignUp = Credentials.extend({ full_name: z.string().trim().min(2, "Enter your name").max(120) });

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = SignUp.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (errors[String(i.path[0])] ??= i.message));
    return { ok: false, message: "Please fix the highlighted fields.", errors };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${env.siteUrl()}/auth/callback?next=/onboarding`,
    },
  });
  if (error) return { ok: false, message: error.message };
  if (data.session) redirect("/onboarding"); // email confirmation disabled
  return { ok: true, message: "Check your inbox to confirm your email, then sign in." };
}
