"use server";

import { z } from "zod";
import { createLead, createProjectRequest } from "@/lib/repo";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { industries, services } from "@/lib/site";
import { cookies } from "next/headers";
import { ORG_COOKIE, getUser } from "@/lib/session";

export type FormState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

const Lead = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.email("Please enter a valid email").max(200),
  company: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  industry: z.string().trim().max(60).optional(),
  message: z.string().trim().min(10, "Please tell us a little more").max(4000),
});

export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("website")) return { ok: true, message: "Thanks — we'll be in touch." }; // honeypot
  const parsed = Lead.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error) };

  try {
    createLead(parsed.data);
  } catch (e) {
    console.error("[contact] could not save lead", e);
    return { ok: false, message: "Sorry, we couldn't send your message. Please try again later." };
  }

  {
    const d = parsed.data;
    await sendEmail({
      to: env.salesInbox(),
      replyTo: d.email,
      subject: `New PHONIEX enquiry from ${d.name}`,
      text: `Name: ${d.name}\nEmail: ${d.email}\nCompany: ${d.company ?? "-"}\nPhone: ${d.phone ?? "-"}\nIndustry: ${d.industry ?? "-"}\n\n${d.message}`,
    });
  }
  return { ok: true, message: "Thanks — your message has been received. We usually reply within one business day." };
}

const industryValues = [...industries.map((i) => i.slug), "other"] as const;
const serviceValues = services.map((s) => s.key) as string[];

const ProjectRequest = z.object({
  contact_name: z.string().trim().min(2, "Please enter your name").max(120),
  contact_email: z.email("Please enter a valid email").max(200),
  company: z.string().trim().min(2, "Please enter your business name").max(160),
  industry: z.enum(industryValues, "Please choose an industry"),
  services: z.array(z.string().refine((s) => serviceValues.includes(s))).max(10),
  goals: z.string().trim().min(20, "Please describe your business and goals (at least 20 characters)").max(6000),
  budget: z.string().trim().max(60).optional(),
  timeline: z.string().trim().max(60).optional(),
});

export async function submitProjectRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("website")) return { ok: true, message: "Thanks — we'll be in touch." };
  const raw = { ...Object.fromEntries(formData), services: formData.getAll("services") };
  const parsed = ProjectRequest.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: fieldErrors(parsed.error) };

  const user = await getUser();
  const orgId = (await cookies()).get(ORG_COOKIE)?.value ?? null;

  try {
    createProjectRequest(parsed.data, user?.id ?? null, orgId);
  } catch (e) {
    console.error("[project request] could not save", e);
    return { ok: false, message: "Sorry, we couldn't submit your request. Please try again later." };
  }

  {
    const d = parsed.data;
    await sendEmail({
      to: env.salesInbox(),
      replyTo: d.contact_email,
      subject: `New project request: ${d.company} (${d.industry})`,
      text: `From: ${d.contact_name} <${d.contact_email}>\nCompany: ${d.company}\nIndustry: ${d.industry}\nServices: ${d.services.join(", ") || "-"}\nBudget: ${d.budget ?? "-"}\nTimeline: ${d.timeline ?? "-"}\n\n${d.goals}`,
    });
  }
  return {
    ok: true,
    message: "Thank you — your request is in. Our solution team will review it and send you a recommended scope and estimate.",
  };
}
