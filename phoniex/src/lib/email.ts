import "server-only";
import { db, newId } from "@/lib/db";

type Mail = { to: string; subject: string; text: string; replyTo?: string };

/**
 * No email provider is connected yet: messages are saved to the local "outbox"
 * table (visible on the platform-admin page) and logged to the server console.
 * Swap this function for a real provider when you are ready to send email.
 */
export async function sendEmail({ to, subject, text, replyTo }: Mail) {
  db()
    .prepare("insert into outbox (id, to_addr, reply_to, subject, body) values (?, ?, ?, ?, ?)")
    .run(newId(), to, replyTo ?? null, subject, text);
  console.info(`[email:outbox] to=${to} subject=${JSON.stringify(subject)}`);
  return { ok: true as const };
}
