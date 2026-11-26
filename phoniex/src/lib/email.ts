import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";

type Mail = { to: string | string[]; subject: string; text: string; replyTo?: string };

/**
 * Sends a transactional email through Resend. If RESEND_API_KEY is not set the
 * message is logged instead, so forms keep working in local development.
 */
export async function sendEmail({ to, subject, text, replyTo }: Mail) {
  const key = env.resendApiKey();
  if (!key) {
    console.info("[email:dev] RESEND_API_KEY not set; would send:", { to, subject });
    return { ok: true as const, skipped: true };
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({ from: env.emailFrom(), to, subject, text, replyTo });
  if (error) {
    console.error("[email] send failed", error);
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const, skipped: false };
}
