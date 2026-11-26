# PHONIEX Intelligence — Phase 1

The first working release of the PHONIEX platform described in the *PHONIEX Master Prompt Pack*.
It follows the pack's own roadmap: the **core multi-tenant platform first**, then industry modules
added in stages.

## What's in this release

| Area | What works |
|---|---|
| Marketing website | Home, divisions, services, 10 industry pages, pricing, contact form, "Start a project" intake (customer journey), light/dark theme, mobile layout |
| Accounts | Email + password sign-up/sign-in (Supabase Auth), email confirmation callback |
| Multi-tenant workspaces | Each customer gets a private workspace; roles `owner / admin / member / viewer`; one user can belong to several workspaces |
| Tenant isolation | Postgres Row Level Security on every table, with tests (`supabase/tests/rls_isolation.sql`) |
| AI Command Center | Live counts of agents, conversations, latency, alerts, activity log |
| AI Agent Builder | 10 agent templates from Prompt 2 (Customer Service, Sales, Maintenance, …); configure role, instructions, approved knowledge, model, effort, human-approval policy, monthly limit, draft/active/paused |
| Agent chat | Streaming test chat powered by Claude, run server-side; every run logged with tokens, latency and status; monthly limits enforced |
| Projects | Customers see their solution requests and status |
| Platform admin | Super-admin view of organizations, leads, project requests and AI usage |
| Audit log | Workspace creation and agent changes are recorded |

**Not built yet** (next phases in the pack's roadmap): website/app generator, automation center,
RAG over uploaded documents, ML forecasting, computer vision, digital twins/IoT, billing (Stripe),
member invitations, MFA, the industry-specific modules (salon bookings, hotel PMS, etc.).

## Tech stack

Next.js 16 (App Router, TypeScript, Tailwind CSS 4) · Supabase (Postgres, Auth, RLS) ·
Anthropic Claude API · Resend (email) · deployable on Vercel.

## Run it locally

```bash
cd phoniex
cp .env.example .env.local      # fill in the values (see below)
npm install
npm run dev                     # http://localhost:3000
```

## Going live — step by step

### 1. Supabase (database + login)
1. Create a project at supabase.com. **Region:** pick the closest to your customers
   (e.g. Mumbai `ap-south-1` or Frankfurt `eu-central-1` for the UAE).
2. SQL Editor → paste and run `supabase/migrations/20261126000000_init.sql`
   (or `supabase link` + `supabase db push` with the Supabase CLI).
3. Project Settings → API: copy the URL, `anon` key and `service_role` key into your env vars.
4. Authentication → URL Configuration: set **Site URL** to `https://yourdomain.com` and add
   `https://yourdomain.com/auth/callback` to Redirect URLs.
5. Make yourself platform admin (SQL Editor, after you sign up):
   `update profiles set is_platform_admin = true where id = (select id from auth.users where email = 'you@yourdomain.com');`

### 2. Anthropic (AI)
Create an API key at console.anthropic.com and set `ANTHROPIC_API_KEY`. Agents default to
Claude Opus 5.5; each agent can be switched to Sonnet 5.5 or Haiku 5.5 (cheaper) in the Agent Builder.

### 3. Vercel (hosting)
1. Import the GitHub repo at vercel.com/new.
2. **Root Directory:** `phoniex` (the app lives in this subfolder).
3. Add every variable from `.env.example` under Settings → Environment Variables.
4. Deploy.

### 4. Namecheap (domain)
1. Vercel → Project → Settings → Domains → add `yourdomain.com` and `www.yourdomain.com`.
2. In Namecheap → Domain List → Manage → Advanced DNS, add the records Vercel shows
   (typically an `A` record `@ → 76.76.21.21` and a `CNAME` `www → cname.vercel-dns.com`).
   Alternatively set Namecheap's nameservers to Vercel's.
3. Update `NEXT_PUBLIC_SITE_URL` and the Supabase Site URL to the real domain.

### 5. Resend (email)
1. resend.com → Domains → add `yourdomain.com`.
2. Add the DKIM/SPF (TXT, MX) records Resend shows into Namecheap Advanced DNS; wait for "Verified".
3. Set `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `PHONIEX <hello@yourdomain.com>`) and `SALES_INBOX_EMAIL`.
4. Recommended: Supabase → Authentication → SMTP Settings → use Resend's SMTP so sign-up
   confirmation emails also come from your domain (Supabase's built-in mailer is rate-limited).

## Tests

```bash
npm run lint && npx tsc --noEmit && npm run build
# Tenant-isolation tests against a throwaway local Postgres:
PGHOST=/path/to/socket PGUSER=postgres scripts/test-rls.sh
```

## Security notes

- Secret keys (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`) are only read in
  server code (`server-only` modules); nothing secret is shipped to the browser.
- Users cannot grant themselves platform-admin or change their plan (column-level grants).
- Public forms use validation and a honeypot. Before launch, add rate limiting (e.g. Vercel
  Firewall or Upstash) and Cloudflare Turnstile/hCaptcha.
- Pricing shown on `/pricing` is placeholder text in `src/lib/site.ts` — set your real prices.
- Per the pack: do not call this production-ready until security review, MFA, backups,
  monitoring and UAE PDPL compliance are verified.
