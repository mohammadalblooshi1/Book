# PHONIEX Intelligence — Phase 1

The first working release of the PHONIEX platform described in the *PHONIEX Master Prompt Pack*,
following its roadmap: **core multi-tenant platform first**, industry modules later.

**Runs entirely on its own** — no external accounts, keys or services needed. The database is a local
SQLite file, login is built in, emails are saved to an outbox, and AI agents run in a clearly
labelled demo mode until an AI key is added.

## Run it

Requires Node.js 22.13 or newer.

```bash
cd phoniex
npm install
npm run dev            # http://localhost:3000
```

1. Open http://localhost:3000/signup and create your account.
2. Create your workspace (business name + industry).
3. Make yourself platform admin:
   ```bash
   npm run make-admin -- you@example.com
   ```

4. Add the sample properties (15 villas, apartments, townhouses, a penthouse, land and an office across all
   seven emirates, with 360° tours and floor plans):
   ```bash
   npm run samples            # add / refresh
   npm run samples -- remove  # remove them all
   ```
   Platform admins can also add/remove them from the admin page. Samples are labelled "Sample" everywhere,
   use original illustrations (not real photos), and do not accept enquiries.

For a production build: `npm run build && npm start`.

## What's in this release

| Area | What works |
|---|---|
| Marketing website | Home, divisions, services, 10 industry pages, pricing, contact form, "Start a project" intake, light/dark theme, mobile layout |
| Accounts | Built-in email + password sign-up/sign-in (scrypt-hashed passwords, httpOnly session cookies, login throttling) |
| Workspaces | Each customer gets a private workspace; roles `owner / admin / member / viewer`; users can belong to several |
| Tenant isolation | Every data function checks workspace membership and role; covered by automated tests |
| AI Command Center | Live counts of agents, conversations, response time, alerts, activity log |
| AI Agent Builder | 10 agent templates (Customer Service, Sales, Maintenance, …); configure role, instructions, approved knowledge, model, effort, human-approval policy, monthly limit, draft/active/paused |
| Agent chat | Streaming test chat. **Demo mode** (no key): simulated reply that quotes matching lines from the agent's knowledge, clearly labelled. With `ANTHROPIC_API_KEY`: real Claude replies. Every run logged; monthly limits enforced |
| Projects | Customers see their solution requests and status |
| Property listings (owner self-service) | Owners list a villa/apartment/etc. for sale or rent themselves: details, photos, publish / unpublish / mark sold. Public search at `/properties` with filters; buyers send enquiries straight to the owner — no agent |
| 360° virtual tours (VR) | Upload one 360° (2:1 equirectangular) photo per room. Buyers drag to look around on any device, zoom, go full screen, and an **Enter VR** button appears on WebXR headsets (e.g. Meta Quest browser) |
| Floor-plan diagrams | Drag-and-drop editor on a 1 m grid: add rooms by type, move/resize, set sizes, total area in m² and sq ft. Rooms can link to a 360° photo — buyers click the room on the plan to open its tour |
| Platform admin | Organizations, leads, project requests, AI usage and the **email outbox** |

**Not built yet** (next roadmap phases): website/app generator, automation center, document upload
& search, ML forecasting, computer vision, digital twins/IoT, billing, member invitations, MFA,
industry-specific modules.

## Where data lives

Everything is in `data/` (ignored by git): the database `data/phoniex.db` and uploaded images in `data/uploads/`. Delete that file to start fresh.
Back it up by copying the file while the app is stopped.

## Tests

```bash
npm test               # auth + tenant-isolation tests (in-memory database)
npm run lint
npx tsc --noEmit
npm run build
```

## Notes before going public

- The prices on `/pricing` are placeholders in `src/lib/site.ts` — set your real prices.
- Hosting: the local SQLite file suits a single server (a VPS or your own machine). Serverless hosts
  without a persistent disk would need the database moved to a hosted one — `src/lib/db.ts` and
  `src/lib/repo.ts` are the only files that touch the database.
- Property advertising rules: some emirates require an advertising permit (e.g. Trakheesi in Dubai) even for owner listings. The listing form has a permit field; check the rules before publishing publicly.
- Email: replace the body of `sendEmail()` in `src/lib/email.ts` with a real provider when ready.
- Add spam protection (rate limiting, captcha) to public forms, MFA, backups and monitoring, and a
  UAE PDPL review before calling it production-ready.
