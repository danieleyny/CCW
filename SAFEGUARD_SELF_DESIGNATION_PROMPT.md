# SAFEGUARD PERSON — "this cannot be you": explain it, then enforce it

**Origin:** an applicant in a test run designated *themselves* as the safeguard person. Nothing
stopped them and nothing explained why it was wrong. NYPD would reject it, and the applicant would
find out months later.

**NYPD's own words, verbatim from step 7 of the licensing portal:**
> "Identify an individual (**not yourself**) to safeguard and turn in your firearm(s) in case you
> become incapacitated or in the event of your death. … Your 'safeguard' individual must be at least
> 21 years old. … Must be aware of where you store your firearm(s) and assist the License Division in
> securing the firearm(s) in the event of your incapacity or death."

Two things are missing from our product: the **reason**, and the **guard rail**.

---

## Part 1 — Explain why, everywhere the safeguard person is collected

Right now the UI says who to name but never why it can't be them. People don't skip this
maliciously; they read "person who will safeguard it" and think "I will."

Add this explanation — same substance on every surface, phrased for the reader:

> **This has to be someone other than you.** If you die or become unable to manage your firearm —
> injury, illness, any emergency — this is the person the NYPD License Division will contact to take
> custody of it and surrender it. Naming yourself would leave nobody able to act, so the License
> Division does not accept it.
>
> They must be **at least 21**, a **New York State resident**, and they must know where you store
> your firearm.

### Surfaces that need it
1. **`components/portal/intake/intake-wizard.tsx`** (~line 958, the "Household & safeguard" step) —
   the label already says "must be a resident of NYS"; add the not-yourself rule and the reason.
2. **`lib/facts/registry.ts`** — the `safeguard` fact group. `safeguard.firstName` already carries the
   21+ rule in its label. Add a group-level note rather than stuffing more into field labels.
   If the details editor has no concept of a group note, add one: `FactGroup` → optional `note`
   string, surfaced by `lib/facts/details-view.ts` and rendered in
   `components/portal/facts/fact-groups.tsx` above the group's rows.
3. **`components/portal/safeguard-invite.tsx`** — the SFG-01 invite card. One line, so the applicant
   understands who they're inviting before they send it.
4. **`components/public/safeguard-flow.tsx`** — the safeguard person's OWN page at `/g/<token>`.
   They were named out of the blue; tell them plainly what they're agreeing to and why it matters.

This must appear on **both** the individual applicant flow and the **sponsored** flow (Chery's
portal is the same `/portal/details` surface — verify it renders there too, not just in intake).

---

## Part 2 — Flag it when the details match the applicant

### New pure module: `lib/safeguard/self-designation.ts`
Pure and dependency-free so it can be unit-tested and reused on client and server.

```ts
export type SelfDesignationField = "name" | "email" | "phone"
export function detectSelfDesignation(input: {
  applicant: { firstName?: string; lastName?: string; email?: string; phone?: string }
  safeguard: { firstName?: string; lastName?: string; email?: string; phone?: string }
}): SelfDesignationField[]
```

**Comparison rules — be forgiving about format, strict about identity:**
- **Name** — compare `first + last` only. Trim, collapse whitespace, case-insensitive, strip
  punctuation and accents. Ignore middle initials and suffixes (Jr/Sr/III). Match only when BOTH
  first and last match; a shared surname alone is not a match (a brother is a valid safeguard).
- **Email** — trim, lowercase, exact compare. Do not normalise plus-addressing or dots away; those
  are different mailboxes and treating them as equal would produce false positives.
- **Phone** — compare digits only, last 10 digits, ignoring `+1`, spaces, dashes, parens.

**Do NOT compare address.** A spouse, sibling or parent living at the same address is a perfectly
valid safeguard person — the intake wizard's existing `UseHomeAddress` helper exists for exactly
that. Flagging the address would train people to ignore the warning.

### Error copy — per field, specific, never generic
- **name** — "You can't name yourself as the safeguard person. This has to be someone else who can take custody of your firearm if you can't."
- **email** — "That's your own email address. The License Division needs to reach this person independently of you, so it has to be their own."
- **phone** — "That's your own phone number. If something happens to you, this is the number the License Division calls — it has to be theirs, not yours."

### Where to enforce

| Layer | File | Behaviour |
|---|---|---|
| **Intake wizard** | `components/portal/intake/intake-wizard.tsx` | Red field + inline message as they type. Block advancing past the step while any field conflicts. |
| **Details editor** | `components/portal/facts/fact-groups.tsx` (holds all live values) + `fact-row.tsx` (already has a `Status` and an error ring — reuse it, don't invent a second error style) | Red ring + inline message on the offending row, live. |
| **Server — fact write** | `app/portal/facts/actions.ts` → `setCaseFact` | Reject a conflicting `safeguard.*` write with the matching message. The client is a convenience; this is the authority. |
| **Server — invite** | `app/portal/requirements/actions.ts` → `sendSafeguardInvite` | Refuse to send when the safeguard email is the applicant's. Last line of defence: we must never email a "please safeguard this person's firearm" invite to the applicant themselves. |
| **Readiness** | wherever safeguard completeness is computed (`lib/concierge/data-asks.ts` counts the `safeguard` group) | A conflicting safeguard block is NOT complete. It must not count toward "captured". |

**Use the fact layer as the source of the applicant's own identity** — `applicant.legalFirstName`,
`applicant.legalLastName`, `applicant.email`, `applicant.phone.cell` — so the check works identically
on a sponsored case, where the client record is provisioned rather than self-entered.

---

## Tests — `tests/safeguard-self-designation.test.ts`

- exact name match, different case and spacing → flags `name`
- "Marcus J. Powell" vs "marcus powell" → flags `name` (middle initial ignored)
- same last name, different first ("Marcus Powell" / "Jordan Powell") → **no flag**
- identical email, different case → flags `email`
- `a+one@x.com` vs `a+two@x.com` → **no flag**
- `(212) 555-0148` vs `+1 212-555-0148` → flags `phone`
- same address, everything else different → **no flag**
- all three matching → returns all three fields
- a sponsored case (applicant identity resolved from facts, not intake) → flags identically

Plus a server test that `setCaseFact` rejects a conflicting `safeguard.email`, and one that
`sendSafeguardInvite` refuses when the email is the applicant's.

---

## Judgment call for the owner — flag, don't decide silently

Blocking on **phone** is the one rule that could produce a false positive: an older couple sharing a
landline is plausible. I recommend blocking it anyway, because the whole purpose of this person is
to be reachable when the applicant is not — a shared number defeats that. But if you'd rather it
warn instead of block, change only the phone rule and leave name and email as hard blocks.

Leave an `// OPEN:` comment at the phone rule noting the decision, so it isn't silently reversed.

---

## Do not

- Do not compare the address — see above.
- Do not add a new error-styling pattern; `fact-row.tsx` already has an error ring and inline
  message. Reuse it.
- Do not make this warning-only on the client with no server guard. The applicant is signing a sworn
  application; a client-side-only check is decoration.
- Do not block on a shared **surname**. Siblings and spouses are the most common valid choice.

## Verification

- `pnpm test` green, including the new suite.
- Walk the seeded sponsored case: enter the applicant's own name, then email, then phone as the
  safeguard person — each flags red with its own message, the group does not count as captured, and
  the invite refuses to send.
- Confirm the explanation renders on all four surfaces, including `/g/<token>` where the safeguard
  person reads it about themselves.
