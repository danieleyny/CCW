# Gun License NYC — activate & finish the Stripe integration
### Claude Code prompt

**Important framing:** Stripe is **not** missing from this codebase — it's ~80% built and deliberately gated off behind `STRIPE_ENABLED`. Do **not** rebuild it. Your job is: (1) follow Stripe's official setup steps to generate a best-practices plan, (2) **review the existing integration against that plan**, (3) fill the real gaps — chiefly **Stripe Invoicing** — (4) turn it on in **LIVE mode** for a controlled live test and prove it end-to-end, and (5) make the payment surfaces **visually polished and on-brand**.

Read `AGENTS.md` first and honor its guardrails: Next.js 16 (`proxy.ts`, async `params`); **we never collect the NYPD application fee or the DCJS fingerprint fee** — only our own service fees; RLS on any new table in the same migration; server actions do `requireRole` → zod → mutate → `logActivity` → `revalidatePath`; design system uses `config/brand.ts` tokens + `app/globals.css` (obsidian/brass, `font-display`, `card-raised`, `brass-edge`) — the register is "my lawyer's office."

**Live mode — read this first:**
- This is a **live test**: real cards, real charges, real Stripe fees (~2.9% + 30¢, and the fee is **not** returned on a refund). Test with your own card and **small amounts**, and **refund immediately** in the Dashboard. Functionally it's identical to test mode — only the money is real.
- Put the **live** keys in `.env.local` (local) and Vercel env (deploy): `STRIPE_ENABLED="true"`, `STRIPE_SECRET_KEY` = the `sk_live…`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = the `pk_live…`, `STRIPE_WEBHOOK_SECRET` = the **live** signing secret (see Phase 3). The env var names already exist (see `.env.example`).
- **Do not hardcode the secret key into any committed file.** `.env.local` is gitignored; a key written into a repo file lives in git history forever (a real, lasting leak). The publishable `pk_live` is public by design and safe to reference.
- **Account:** the live keys belong to the **GunLicenseNYC** business in the **laundrydaynyc** Stripe account — a *different* account from the earlier test sandbox (different account ID in the key prefix). Configure branding, the webhook endpoint, and the Stripe MCP connection on **that live account**, not the old sandbox.

---

## Phase 0 — Stripe's official setup (do this verbatim first)

1. Install the Stripe plugin: `claude plugin install stripe@claude-plugins-official`. If tools don't appear, `/reload-plugins` or restart the session.
2. Add `https://mcp.stripe.com` as an MCP server and authenticate (https://docs.stripe.com/mcp.md) — connect to the **live GunLicenseNYC** account (laundrydaynyc), not the old test sandbox. Confirm `stripe_implementation_planner` is available (reload/restart if not). Also confirm in the Dashboard that this account is **activated to accept live charges** (business details + bank account submitted); if it still shows "activate payments," live charges will fail until that's completed.
3. Run **`stripe_implementation_planner`** with this business context to generate a tailored plan:
   - Business: gunlicensenyc.com — a concierge service helping NYC residents obtain a concealed-carry license.
   - Products needed: **Payments** and **Invoicing**.
   - Note that a Next.js 16 + Supabase integration already exists (hosted Checkout, webhook, Connect payouts) and you are reviewing/extending it, not starting fresh.
   - If `stripe_implementation_planner` is still unavailable after steps 1–2, fall back to `npx skills add https://docs.stripe.com`.
4. Keep the generated plan as the yardstick for the review below.

---

## Phase 1 — Review what already exists against the plan

Read and assess these, and produce a short gap list mapped to the planner's recommendations:

- `lib/stripe/index.ts` — client factory, gated by `STRIPE_ENABLED` + `STRIPE_SECRET_KEY`. **Pin an explicit `apiVersion`** in the `new Stripe(...)` call (best practice; avoids silent API drift).
- `app/api/stripe/webhook/route.ts` — verifies signature with `STRIPE_WEBHOOK_SECRET`; handles `checkout.session.completed` (reconciles `payments` by `payment_id` metadata, advances stage; also Connect booking deposits by `booking_id`), `account.updated` (Connect payouts), `payment_intent.succeeded/failed`. Solid base — you'll ADD invoice events here.
- `app/portal/enroll/actions.ts` — self-serve `startCheckout` (full/deposit): inserts a pending `payments` row, creates a Checkout Session with `metadata.payment_id`, redirects. Stripe-off path falls back to `requestInvoice` (records intent + opens a staff task). Good.
- `app/portal/payments/actions.ts` — `payPending` for an existing balance. **Bug to fix:** it writes the Checkout **session id** into the `stripe_payment_intent` column; use the `stripe_session_id` column instead (as `enroll/actions.ts` does), and reserve `stripe_payment_intent` for the real PI id set by the webhook.
- `lib/packages.ts` + `service_packages` table — DB-driven catalog (pricing is an admin data edit). Fine.
- `lib/stripe/connect.ts`, instructor payouts — Connect already scaffolded; leave as-is unless the plan flags something.
- UI: `app/portal/enroll/page.tsx`, `app/portal/payments/page.tsx`, `components/portal/enroll-buttons.tsx`, `components/portal/pay-button.tsx`, `components/admin/request-payment-form.tsx`, `app/admin/payments/page.tsx`.

---

## Phase 2 — Build Stripe **Invoicing** (the real gap)

Today the admin "Request payment" flow (`RequestPaymentForm` → `requestPayment` in `app/admin/actions.ts`) only records a pending `payments` row + a staff task; the "invoice" is manual. The user explicitly wants **Stripe Invoicing**, so make staff-requested payments issue a **real Stripe hosted invoice** that emails the client a branded pay link.

Build it:

- When Stripe is enabled, `requestPayment` should:
  1. Find-or-create a **Stripe Customer** for the client (by email; store `stripe_customer_id` on the `clients` row so it's reused — add the column via migration if absent).
  2. Create an **invoice item** for the amount/description, then create an **invoice** with `collection_method: "send_invoice"` and a sensible `days_until_due` (e.g. 7), `metadata: { payment_id, case_id }`.
  3. **Finalize** and **send** it (Stripe emails the hosted invoice), and store `stripe_invoice_id` + `hosted_invoice_url` on the `payments` row (add columns via migration if absent — `payments` already has `invoice_url`, `stripe_session_id`, `stripe_payment_intent`).
  4. Keep the current staff-task/record behavior as the Stripe-off fallback so nothing dead-ends.
- Extend the **webhook** to handle: `invoice.finalized` (store `hosted_invoice_url`), `invoice.paid` (mark the `payments` row paid by `stripe_invoice_id` or `metadata.payment_id`, then `maybeAdvanceStage`), `invoice.payment_failed` (mark failed). Reconcile idempotently, matching the existing handlers' style.
- Surface the hosted invoice link to the client in `app/portal/payments/page.tsx` (a "View / pay invoice" action on pending rows that have a `hosted_invoice_url`), alongside the existing `PayButton` (Checkout) path.
- Create/attach a **Stripe Customer** on the Checkout paths too (`customer` / `customer_email`) so receipts and saved details work, and enable Stripe email receipts.

Migration (only for columns that don't already exist): `clients.stripe_customer_id`, `payments.stripe_invoice_id`, `payments.hosted_invoice_url` — with RLS consistent with the existing `payments`/`clients` policies (staff-write; client reads own). Follow the 14-digit migration convention; run `pnpm db:reset && pnpm seed && pnpm db:types` after.

---

## Phase 3 — Turn it on (LIVE mode) & make it look good

**Enable in live mode:** set in `.env.local` (and Vercel env) → `STRIPE_ENABLED="true"`, `STRIPE_SECRET_KEY` = the `sk_live…`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = the `pk_live…`. For webhooks, either register a **live** endpoint (Dashboard → Developers → Webhooks, in live mode) at `https://gunlicensenyc.com/api/stripe/webhook` and copy its `whsec_…` **live** signing secret into `STRIPE_WEBHOOK_SECRET`, or for local live-testing run `stripe listen --live --forward-to localhost:3000/api/stripe/webhook` and use the secret it prints. Never commit these values.

**Brand the Stripe-hosted surfaces** (this is most of the "visual" win, since Checkout, the hosted invoice, and receipts are Stripe-hosted): on the **live GunLicenseNYC account**, via the Stripe MCP or Dashboard → Settings → Branding, set the business name "Gun License NYC", logo/icon, brand color to the brass `#C9A24B` on the obsidian `#0B0C0F`, and the support email/phone from `config/brand.ts`. Confirm Checkout + the hosted invoice + emailed receipts render on-brand.

**Polish the in-app payment surfaces** to the "lawyer's office" standard, using existing brand tokens/components (`Card`, `card-raised`, `brass-edge`, `font-display`, `engraved`, `StatusBadge`, `money()`), light on formatting, elegant and calm:
- `app/portal/payments/page.tsx`: keep the Paid-to-date / Balance-due tiles; add clear states for each row (paid / pending / failed), a primary "Pay now" (Checkout) and secondary "View invoice" (hosted invoice) when present, a real receipt link when paid, a graceful empty state, and a subtle trust line ("Payments secured by Stripe · we never collect NYPD or DCJS fees"). Handle the `?status=success|canceled` returns with a tasteful confirmation/again banner.
- `app/portal/enroll/page.tsx` + `enroll-buttons.tsx`: elevate the package cards (featured `brass-edge`, clear price, deposit-vs-full choice, loading state on the button, disabled/again states), and a clean post-purchase confirmation.
- `components/admin/request-payment-form.tsx`: reflect the new Invoicing flow (a confirmation showing the invoice was created + a copyable `hosted_invoice_url`), and tidy the form visually to match the admin design.
- Keep everything responsive and accessible (focus states, `aria-invalid`, reduced-motion respected).

---

## Phase 4 — Verify end-to-end (test mode)

- Run `stripe listen --live --forward-to localhost:3000/api/stripe/webhook` (or use the deployed live endpoint). Do a full self-serve purchase with **your own real card and a small amount** (use the cheapest package, or temporarily add a $1 package for the test): Checkout completes → webhook marks the `payments` row `paid` → case stage advances → receipt visible. **Refund it immediately** in the Dashboard.
- Admin **Invoicing**: request a payment → a real live invoice is created, finalized, and emailed; `hosted_invoice_url` shows in the portal; pay it with your card → `invoice.paid` fires → row marked paid → stage advances → refund it. (Note: `stripe trigger` emits **test-mode** events only, so for live, exercise the handlers with a real small transaction rather than triggers.)
- Confirm the `payPending` column fix (session id no longer lands in `stripe_payment_intent`).
- Confirm **fails-closed** still holds with `STRIPE_ENABLED` unset (the invoice-request fallback + "opening soon" copy), and that `scripts/verify-p8.ts` semantics are intact.
- `pnpm build && pnpm lint && pnpm test` pass.
- Take screenshots of the enroll page, the payments page (paid + due), Checkout, and the hosted invoice for review.

**Since this is already live:** once the local live test passes, deploy with the live keys in Vercel env and the live webhook endpoint registered at `https://gunlicensenyc.com/api/stripe/webhook`, then do one real low-value transaction on the deployed site to confirm the production webhook fires. Keep amounts small and refund until testing is done. (You mentioned you'll swap keys again later — when you do, roll the live secret in the Dashboard and update `.env.local` + Vercel; no code changes needed.)

Then summarize: what the planner recommended vs what already existed, the files changed, the new Invoicing flow, and the test-mode results (with screenshots).
