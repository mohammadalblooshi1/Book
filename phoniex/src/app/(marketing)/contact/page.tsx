import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="container-page grid gap-10 py-16 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <h1 className="text-3xl font-bold sm:text-4xl">Contact us</h1>
        <p className="mt-3 text-muted">
          Questions about PHONIEX Enterprise, Business or Home? Send us a message and the right team will reply.
        </p>
        <p className="mt-6 text-sm text-muted">
          Have a specific project in mind? Use <a href="/start" className="text-accent underline">Start a project</a> to
          get a scoped proposal.
        </p>
      </div>
      <div className="card lg:col-span-3">
        <ContactForm />
      </div>
    </div>
  );
}
