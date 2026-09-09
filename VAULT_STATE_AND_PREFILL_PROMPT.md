# The unsigned draft counted as done, the signature that vanishes, and the prefill that only printed a message

Four items. Two are correctness bugs in the vault's state machine and the dialog's
lifecycle — and one of them means an unsigned document currently reports as being
with us.

---

# PART A — BUG: an unsigned draft is bucketed as "With us"

`lib/concierge/vault.ts` —

```ts
/** 0 = outstanding, 1 = received (uploaded, unreviewed), 2 = approved. */
export function vaultStateRank(item: VaultItem): number {
  if (item.status === "satisfied") return 2
  if (item.current) return 1
  return 0
}
```

**`item.current` means only "a document row exists".** The moment we generate a
draft, one exists — so the item jumps to *With us* while the applicant still has to
sign it, or still has to get it notarised and upload it. Nothing checks `signed_at`,
and nothing checks whether the document on file is our draft or their completed copy.

That is why several items move to *With us* without being finished.

## The rank must reflect what actually completes the requirement

```
2 · APPROVED    status === "satisfied"

1 · WITH US     a document exists AND it is the COMPLETING artefact:
                  obtain  → any uploaded document
                  generate + signable  → signed_at is set
                  generate + wetInk    → an UPLOADED (generated = false) copy exists;
                                         our unsigned draft never counts
                  roster  → the required third-party copies are in

0 · NEED YOU    everything else — INCLUDING an unsigned generated draft, and a
                wet-ink draft whose completed copy has not been uploaded.
```

```
· vaultStateRank needs the fields to decide with: pass through signed_at, generated,
  and the requirement's mode/wetInk. Today VaultItem carries `current: CurrentDoc`
  and `status` and nothing else, so the function cannot be right — widen the type.
· The counts on the filter chips derive from the same function, so they correct
  themselves.
· Same rule anywhere else a document's presence is treated as completion. Search for
  other `if (…current)` completion tests and fix them the same way.
· Add a test per mode: a generated unsigned draft ranks 0; the same document with
  signed_at ranks 1; a wet-ink draft ranks 0 until an uploaded copy exists.
```

---

# PART B — BUG: the signature step appears, then the dialog closes itself

`components/portal/questionnaire-dialog.tsx` does the right thing —
`if (gen.needsSignature) setStep("sign")`. Then the dialog disappears.

**Cause:** the generate server action calls `revalidatePath` on the page the dialog is
rendered from. The revalidation re-renders the server tree, the parent list remounts,
and the dialog's `open` state — which lives in that parent — resets to false. The sign
step is visible for exactly as long as it takes the revalidation to land.

This is the same failure we hit on the details screen, where a revalidate on save
stole focus mid-typing.

```
FIX
· Do NOT revalidate the page a modal flow is running on, while it is running.
· Generate returns its result; the dialog transitions to "sign" and stays open.
· Refresh AFTER the flow finishes — on dialog close, call router.refresh() once.
· If the list must update sooner, update it from client state rather than by
  re-rendering the server tree underneath an open dialog.
· Audit every other server action invoked from inside a dialog for the same pattern.
  A revalidate under an open modal will always do this.
```

**Note how the two bugs compound:** the dialog vanishes before you can sign, *and*
Part A then files the unsigned draft under "With us" — so it looks handled. Fix both
or the second will hide the first.

---

# PART C — The employment prefill printed the message but not the row

The callout says *"This job covers the full five years. Nothing else needed here."*
and the row beneath it is **completely empty** — From, Business name, Business
address and Occupation all blank. So it reads as a contradiction, and the empty
inputs invite the applicant to fill in what we claim is already handled.

## C1 — Actually populate the row

```
When seeding from the employer facts, write the VALUES, not just the notice:
    From             = employer.startDate
    To               = blank, with "Present" checked
    Business name    = employer.name
    Business address = the employer address, assembled
    Occupation       = applicant.jobTitle

The row is fully editable. Mark it as prefilled so a later employer edit offers a
re-sync rather than silently overwriting an edit (already specced — keep it).
```

## C2 — Make the callout carry its weight, and say the right thing

The current box is a thin muted rectangle that reads like placeholder text. With the
row populated, the message is also wrong — there IS something to do: check it.

```
· Render it as a proper callout: left rule, an icon, a bolder first line, the
  section's own card treatment. Not a grey outline.
· Tone: this is confirmation, not a warning — use the ok/signal tone, not brass.
  Brass means "your turn".
· Copy, when the job covers the full five years:
      "We filled this in from your employer details.
       This job covers the full five years, so nothing more is needed here — just
       check it's right."
· Copy, when it covers only part:
      "We filled this in from your employer details.
       This covers back to 3/1/2022. Add anything before that."
  The date is the real start date, not a generic phrase.
```

---

# PART D — Separate the out-of-county licence question

"Do you hold a pistol licence from another New York county?" sits directly under
"Add employment", inside the employment card, and reads as an employment question.
It has nothing to do with employment.

```
· Move it into its OWN card with its own heading — "Other pistol licences" or
  similar — below the employment block, with normal section spacing between them.
· Keep the Yes/No reveal behaviour (fields appear only on Yes).
· While in there: it is Special Carry-relevant. If the case's track makes it
  irrelevant, don't render it at all rather than asking everyone.
```

---

# PART E — The vault should open on "Need you"

```
· Default filter = "Need you", not "All".
· As items complete they leave the view, so the list shortens as the applicant
  works — which is the whole point of the filter.
· "All", "With us" and "Done" stay available; the applicant can switch.
· If "Need you" is empty (everything is in), fall back to "All" so the applicant
  never lands on a blank panel — and say so: "Nothing needs you right now."
· Remember the applicant's choice within the session, but reset to "Need you" on a
  fresh visit.
```

---

# VERIFY

```
1. Generating a signable document leaves the item in "Need you" until it is signed;
   signing moves it to "With us".
2. Generating a wet-ink document leaves it in "Need you"; uploading the notarised or
   witnessed copy moves it to "With us". Our own draft never moves it.
3. The filter-chip counts match the buckets after each of those transitions.
4. Completing a questionnaire and clicking generate lands on the signature step and
   STAYS there — no flash, no self-close.
5. Closing the dialog refreshes the list once, and the item shows its new state.
6. A case with an employer and a start date shows the employment row PREFILLED —
   dates, business name, address and occupation all populated and editable.
7. The callout is visually prominent, in the confirmation tone, and its copy matches
   whether the job covers the full five years or part of it, naming the real date.
8. The out-of-county licence question sits in its own card, clearly outside the
   employment section.
9. A returning applicant lands on "Need you"; when nothing is outstanding they land
   on "All" with a clear message rather than an empty list.
```

# DO NOT

- Do not treat the existence of a document as completion of a requirement.
- Do not let our own generated draft satisfy anything.
- Do not revalidate the page underneath an open dialog.
- Do not print "nothing else needed here" above empty inputs.
- Do not use brass for a confirmation message — brass is "your turn".
