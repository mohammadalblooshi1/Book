"use client";

import { ActionForm } from "@/components/action-form";
import { useActionState } from "react";
import { submitContact, type FormState } from "@/lib/actions/public";
import { FieldError, FormMessage, Honeypot } from "@/components/form-bits";
import { industries } from "@/lib/site";

export function ContactForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(submitContact, null);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <ActionForm action={action} className="space-y-4" noValidate>
      <Honeypot />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" className="input" required autoComplete="name" />
          <FieldError state={state} name="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
          <FieldError state={state} name="email" />
        </div>
        <div>
          <label className="label" htmlFor="company">Company (optional)</label>
          <input id="company" name="company" className="input" autoComplete="organization" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone (optional)</label>
          <input id="phone" name="phone" className="input" autoComplete="tel" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="industry">Industry</label>
        <select id="industry" name="industry" className="input" defaultValue="">
          <option value="">Choose…</option>
          {industries.map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="message">Message</label>
        <textarea id="message" name="message" rows={5} className="input" required />
        <FieldError state={state} name="message" />
      </div>
      <FormMessage state={state} />
      <button className="btn-primary" disabled={pending}>{pending ? "Sending…" : "Send message"}</button>
    </ActionForm>
  );
}
