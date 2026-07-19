# Remote Online Notarization (RON) — ⚖ pending counsel

Status: **OFF.** The offline path (download → notarize in person → upload) is the
only notarization route today, and it stays the default and the fallback even
after RON is enabled.

## The question for counsel (not for code)

New York permits electronic and remote notarization under Executive Law §135-c
and its regulations. The open question is narrow and specific:

> Does a chosen RON provider's flow satisfy New York's requirements **for the
> documents an NYPD handgun application needs notarized** — the Affidavit of
> Co-Habitant and the character-reference letters?

We do not answer that in code. Until a New York attorney confirms a specific
provider for these specific document types, RON stays disabled.

## The guardrail

We never mark a document notarized unless a valid NY notarization actually
occurred and we hold the provider's sealed evidence (`RonEvidence` in
`lib/notarization/ron.ts`). The seam can only ever **attach real evidence**; it
cannot assert notarization on its own. `startRonNotarization` fails closed.

## How it's wired (so nothing legal ships on a guess)

`ronStatus()` returns `live` only when **all three** are true:

1. `RON_ENABLED=true`
2. a provider is configured (`RON_PROVIDER` + `RON_PROVIDER_API_KEY`)
3. `RON_PROVIDER_NY_CONFIRMED=true` — the operator has recorded that counsel
   confirmed **this provider for these documents**

The third flag is deliberately separate: setting an API key alone can never turn
on real notarization. With the flag off (today) status is `disabled`; with a
provider configured but not confirmed it's `pending_legal` — still offline-only.

## To turn it on later

1. Get counsel's written confirmation for a specific provider + these documents.
2. Add the provider's adapter implementing the `RonProvider` interface and
   return it from `getRonProvider()`.
3. Implement the result webhook that attaches `RonEvidence` and marks the
   requirement satisfied **only** on a real sealed result.
4. Set the three env vars. The applicant then sees an "notarize online" option
   next to the existing download-and-notarize path.

Until then: the offline path is complete and always available.
