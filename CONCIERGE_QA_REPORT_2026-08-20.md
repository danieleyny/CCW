# Concierge + Admin QA — test report

**Date:** 20 Aug 2026 · **Build:** `main` @ `8a541b7` (all 10 concierge phases committed, clean tree)
**Environment:** local dev — Supabase local stack, Stripe sandbox, Resend off
**Method:** full applicant journey (signup → intake → fork → agreements → vault → control tower → review & file) and the admin/staff side (concierge hub, work queue, agent roster, create-client-by-email, case cockpit, QA gate, document review), plus targeted code review of the concierge phases and adversarial probes of the compliance guardrails.

**Test accounts created (local DB — delete when you're done):**

| Who | Email | Path |
|---|---|---|
| Marco Vitale | `marco.vitale@carrypath.test` / `Passw0rd!` | Self-signup → full intake → chose Full Concierge at the fork |
| Priya Raman | `priya.raman@carrypath.test` / `Passw0rd!` | Admin pre-staged as concierge → claimed on signup |

I inserted a `paid` / `full_concierge` payment row for each (there was no other way past the paywall — see **H3**). Sasha Staff was toggled to concierge agent.

---

## Headline

The concierge experience is genuinely good where it counts: the agreements gate, the reusable-signature pattern, the control tower's honesty, the on-behalf audit trail, and the CP-5 gate all do exactly what the spec says. **Every compliance guardrail I attacked held.**

What's broken is the plumbing around the edges — and three of those breaks mean a real paying concierge customer either can't get in, can't get out, or gets stranded halfway. Those are worth fixing before this goes in front of anyone.

---

## High severity

### H1 — The passport promise is broken; two blocking requirements get permanently stranded

**The vault tells the applicant, in green:** *"One U.S. passport covers your photo ID, date of birth, and citizenship — upload it once and we'll attach it to each of those, no need to send it again."*

It doesn't. I uploaded a passport (doc type "U.S. passport"), staff approved it, and:

- `IDN-01` Government-issued photo ID → **satisfied** ✓
- `IDN-02` Proof of date of birth → **still unsatisfied**
- `IDN-03` Proof of citizenship or lawful status → **still unsatisfied**

Worse, `buildVaultItems` deliberately collapses IDN-02/IDN-03 out of the vault's ask list whenever IDN-01 exists (`idFamilyCollapsed`). So the applicant is **never asked** for those two documents, is **told** the passport covered them, and both remain blocking requirements. They're invisible on the concierge side and they will block the CP-5 gate forever.

Net effect: a concierge case that follows the happy path can never reach "Ready for your review & filing." Nobody would notice until a case stalls and someone opens the admin requirements tab.

**Repro:** concierge dashboard → vault → "A photo of your ID" → type "U.S. passport" → upload → admin approves → check Requirements tab.

**Fix direction:** either wire the smart-document fan-out so an approved passport satisfies IDN-02/03, or stop collapsing them out of the vault. Do not ship the promise copy without the mechanism behind it.

---

### H2 — Abandon checkout and the concierge buyer lands in self-guided limbo with no way out

`choosePath` writes `case.service_mode = 'concierge'` **before** payment, then hands off to Stripe. If the applicant closes the checkout tab (or the card fails), here's where they are:

- `/portal` → the **self-guided home**, no mention of concierge, next step is "do your own checklist chores"
- `/portal/concierge` → redirects to `/portal/choose-path` (no paid row)
- `/portal` also **suppresses the fork nudge**, because `needsPathChoice = intakeDone && !serviceMode` and `service_mode` is now set

So the one screen that would rescue them — choose-path, which correctly shows *"You picked this — finish payment to begin"* — is unreachable from anywhere in the UI. The only recovery is typing the URL.

The Phase 7 reminder that would nudge them is scoped to **paid** concierge cases, so no email rescues them either. Verified live with Marco.

**Fix direction:** either don't write `service_mode` until payment lands, or make `/portal` render a "finish your concierge payment" state whenever `service_mode` is set and unpaid.

---

### H3 — The concierge dashboard can only be unlocked by self-serve Stripe checkout — every other payment route is a dead end

`/portal/concierge` gates on a payment row with `status = 'paid'` **and** `package_key = 'full_concierge'`.

- `requestPayment` (the admin console's "request payment" / hosted-invoice path) inserts a payment row with **no `package_key`**.
- The Stripe webhook's `invoice.paid` handler sets `status = 'paid'` but never sets `package_key` either.
- There's no admin control anywhere to record an offline/manual payment.

So: a client you sold on a call and invoiced, a client who paid you by Zelle, or any client created through the **Phase 5 "create a concierge client by email"** flow can pay in full and still bounce off `/portal/choose-path` forever, being asked to pay $1,000 again.

This one matters commercially — it breaks exactly the sales motion you described on the partner call (you take the client, you set them up, they log in and it's ready).

**Fix direction:** stamp `package_key` on staff-issued payments (and on invoice reconciliation), plus an admin "mark as paid / record offline payment" action. Optionally: treat an admin-set `service_mode = 'concierge'` as sufficient to unlock, with billing tracked separately.

---

## Medium severity

### M1 — The concierge dashboard keeps handing the applicant back to the self-guided checklist

The control tower's "**The one thing we need from you**" CTA links to `/portal/checklist`. So does the vault's "Add or update their details." And the top nav on the concierge dashboard is still the full self-guided nav — Checklist, Documents, People, Forms, Payments, License, Appeal — with **no "Concierge" item at all**.

`/portal/checklist` greets a $1,000 concierge customer with: *"This is the journey view: what's left and what to do next"* and a 14-item to-do list. That is the exact experience they paid to not have, and it's one click from the "we drive it, you watch" dashboard.

Related: the "one thing" it asked Marco for was **"Your written explanations for the application's history questions"** and later **"Read and sign your affirmation of understanding."** Those are drafting steps the concierge team is supposed to prepare — surfacing them as applicant chores inverts the pitch.

### M2 — Admin-created clients never get an invite, and can't log in if you tick the account box

In `createClientWithCase`, ticking "Create a portal account" provisions the auth user with `password: crypto.randomUUID()` — and the invite is a TODO: `// (An invite/password-reset email would be sent here once email is enabled.)`. Nothing is sent even with Resend configured.

- Box ticked → account exists, nobody knows the password, no reset email → **client is locked out**.
- Box unticked → works (I verified the email-keyed claim, below), but only if the client independently finds your signup page.

### M3 — The work queue buries exactly the cases the Phase 5 flow creates

`deriveSignal` gives "Awaiting payment" **priority 90, tone `waiting`** — bottom of the queue, greyed out. That is where every admin-created concierge case lands the moment it's created. The hub built to run the done-for-you operation renders its own intake pipeline as passive background noise. Both my test cases sat there.

Suggest a distinct signal for "staff-created, awaiting invite/payment" near the top, since the next action is *yours*, not theirs.

### M4 — Three different definitions of "agreements are signed"

- `lib/concierge/onboarding.ts` (the gate) checks **kind @ current version** — correct, and a version bump reopens the gate by design.
- `lib/concierge/queue.ts` counts **raw `case_agreements` rows ≥ 5**.
- `lib/reminders/engine.ts` does the same row count.

The moment you bump any agreement version (which the config is explicitly designed for), the work queue and the reminder engine will call a case "signed" while the applicant's dashboard is locked — and the "sign your agreements" nudge will never fire for the person who needs it.

### M5 — Instructors can't be concierge agents

`/admin/concierge` builds the roster from `profiles where role in ('staff','admin')`. The concierge-agent flag can never be applied to an instructor — i.e. to the lead trainer / operational partner, who the concept doc explicitly names as a concierge agent.

### M6 — "You picked this" when the admin picked it

Choose-path shows *"You picked this — finish payment to begin"* to an applicant whose path was set by staff. Priya saw it on her first-ever visit.

---

## Low / polish

- **Double-click on "Create account"** produced a Postgres `23505` unique-violation and a full "Something went wrong" error screen on `/portal/intake`. Self-heals on refresh and leaves no duplicate rows, but it's the applicant's very first impression. Debounce the submit.
- **Agreements gate:** only agreement #1 is expanded by default, and you can sign all five without opening 2–5 — while the recorded consent says *"I have read the engagement agreements above."* For an ESIGN/UETA record I'd require expansion (or a per-agreement tick) before the pad unlocks.
- **Blank signature canvas** + "Use this signature" does nothing, with no message.
- **Vault feedback is thin:** an uploaded document shows a raw `PENDING` chip in an otherwise retail-voiced surface, and the "0 of 5 in" counter doesn't move until staff approve. The applicant sends a document and gets no acknowledgement that anything happened.
- **No one is assigned:** Marco's paid concierge case had Consultant "Unassigned" while his dashboard invited him to "Message your concierge."
- **Calendly embed** passes the raw case UUID to a third party as `utm_content` in the URL.
- **Calendly webhook** takes `case_id` straight from the payload with no shape/existence check; a malformed id throws an unhandled DB error → 500 → Calendly retries indefinitely.
- **Disclosure duplication:** the DSC-01 modal re-asks arrest / order-of-protection / DIR / commitment questions that intake already covered. Worth checking whether that's intentional.

---

## Verified working — the things I tried hardest to break

These were adversarial probes, and all of them held:

1. **Signature exclusions are real, not just copy.** REF-01/REF-02 are roster-mode so `isSignable` is false; COH-01's generator **throws** when the household isn't empty (*"Household affidavits are completed by each adult through their own private link"*). With a cohabitant on file the UI offers "List your household," never a Sign button. The applicant's signature cannot land on a third-party notarized document.
2. **The CP-5 gate holds and explains itself.** Attempting to move a case straight to *Application Assembled & QA'd* with 14 requirements open was refused server-side, with a toast listing the exact blockers: the 14 requirement codes, no training on file, 0/4 notarized references, and no named QA sign-off. `setCaseStage` gates every stage at or past `application_assembled`, so later stages aren't a back door.
3. **On-behalf attribution works.** Staff actions on a concierge case log with an `on behalf` chip in the case activity feed.
4. **Claim-by-email works, case-insensitively.** Admin created `Priya.Raman@carrypath.test`; signup as `priya.raman@carrypath.test` attached to that exact client + case (stage, requirements and all) with no duplicate or orphan.
5. **The control tower doesn't lie.** Milestones tracked real case state throughout; nothing advanced cosmetically; the "one thing we need from you" updated correctly as each document was signed.
6. **The signature pattern is right.** Captured once at the gate, then offered per document with its own affirmation and *"We record the date, your signature, and a fingerprint of the exact document you signed."* The draft is readable before signing via a private-storage signed URL that expires in 5 minutes.
7. **The agreements gate genuinely gates** — nothing else on the dashboard renders until all five are signed.
8. **Privacy firewall at the route level:** a client hitting `/admin/cases/<id>` is bounced to `/portal`.
9. **Vault → admin loop closes:** uploads land in the same documents/requirements pipeline with Approve / Needs fix, and approval flows straight back to the applicant's view.
10. **No prohibited language** anywhere in the product surfaces — no "we file," no "expedite," no guarantee or approval-rate claims. The only hit was the warning comment in `config/agreements.ts` telling future authors not to add any.

---

## Not covered

- **The "Ready for your review & filing" end state.** Reaching it needs all 14 requirements satisfied plus a named QA sign-off; I read the code path and the copy but didn't drive a case there. Worth one manual run before launch, especially the packet download and the NYPD hand-off steps.
- **Calendly embed** — `CALENDLY_CONCIERGE_URL` is unset locally, so I only exercised the request-a-call fallback (which worked: it recorded the intent and opened a staff task).
- **Email** — Resend is off, so every notification was a no-op log. The "Stage updated · client notified" toast fires regardless of whether anything was actually sent.
- **RLS negative tests** at the database level (the `verify-*` harnesses cover these; they need a fresh reset+seed to run).
