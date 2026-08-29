# "Your details" — type straight into the empty fields

## Why

`/portal/details` asks for 40 facts. A new applicant sees **36 empty rows**, and each
one costs a click on a pencil before a single character can be typed. That's 36
clicks of pure friction on the screen that feeds the whole application — and it is
the screen we now tell people to go to from every readiness message.

An empty field should just be a field.

## The rule

```
EMPTY + editable   → a live input. Click it and type. No pencil, no reveal step.
FILLED             → the value, read-only, with the pencil. (Today's behaviour.)
DERIVED            → read-only with the lock. Unchanged.
SSN                → live input when unset; "On file (hidden)" + pencil when set.
                     NEVER renders a stored value in either state.
```

Files: `components/portal/facts/fact-row.tsx` (the row),
`components/portal/facts/fact-groups.tsx` (the list), `app/portal/details/page.tsx`
(the meter), `app/portal/facts/actions.ts` (the save).

---

## 1 — Row states

```
EMPTY, EDITABLE
  Label as a real <label htmlFor>, not a div — clicking the label focuses the input.
  Input rendered inline at the row's value position, full row width up to ~20rem.
  Placeholder shows the expected shape, not the label again:
      Date of birth      → MM/DD/YYYY
      Place of birth     → City, State, Country
      Height             → inches, e.g. 70
      Alias/maiden name  → leave blank if none
  Keep the "not on a form yet" / "used on N forms" caption exactly where it is.

FILLED
  Value in text-text-mid, pencil button on the right. Clicking the pencil turns the
  row back into the same input, pre-filled and selected.
```

## 2 — Saving, and the three things that will bite

**Save on blur when the value changed.** Enter saves and moves focus to the next
editable field. Escape reverts and blurs. No check button — a button next to 36
inputs is the pencil problem again.

```
(a) NO TOAST PER FIELD. 36 toasts is a punishment. Replace with an inline state on
    the row itself: a small spinner while saving, then a ✓ that fades after ~1.5s.
    Keep a toast ONLY for failures.

(b) setCaseFact CALLS revalidatePath("/portal/details") ON EVERY SAVE.
    That is fine for one pencil edit; with live inputs it re-renders the server
    component mid-typing and will steal focus while someone tabs down the list.
    Drop the revalidate from this path (or defer it), and update the screen from
    client state instead. Verify by tabbing through five fields in a row without
    losing focus.

(c) A FAILED SAVE MUST NOT EAT THE TYPING. Keep the value in the box, mark the row
    with an inline error, let them retry by blurring again. Never silently revert.
```

**Do not collapse a row to read-only the instant it saves.** Collapse on blur, after
the save resolves. Collapsing under the cursor is disorienting and breaks tabbing.

## 3 — Tab order and keyboard

```
Fields are focusable in visual order, top to bottom, straight through the group
cards. Someone should be able to click "First name" and tab all the way to the
bottom of the page filling everything, without ever touching the mouse.
Filled rows are skipped by tab (their pencil is a button and stays reachable, but it
should not sit between two empty inputs in the tab order — put it after).
```

## 4 — The meter has to move

`page.tsx` computes `captured` server-side. With inline saves and no revalidate it
will read "4 of 40" until a manual refresh, while the applicant has just filled
twenty. Lift the count into the client component and update it as rows save.

## 5 — Use the field type the registry already declares

`FactDef.type` is `"text" | "date" | "phone" | "zip" | "select"` and `FactRow`
currently ignores it — everything renders `type="text"`. Wire it up while you're in
there; on a phone this is the difference between a numeric pad and a full keyboard.

```
date   → <input type="date">, stored ISO. (usDate() already handles form rendering.)
phone  → type="tel" inputMode="tel"
zip    → inputMode="numeric" maxLength={5}
text   → as now
```

**Optional but worth it:** several "text" facts have small fixed answer sets and are
being typed free-hand today — citizenship, sex, hair colour, eye colour. Add an
`options?: string[]` to `FactDef` and render a select when present. Four taps instead
of four typed words, and it removes the spelling variance that reaches a sworn form.
Only do this where the set is genuinely closed; leave anything open-ended as text.

---

## VERIFY

```
1. A brand-new applicant lands on /portal/details and can type into "First name"
   without clicking anything but the field.
2. Tab from the first empty field to the last, filling as you go — focus never jumps,
   nothing collapses under the cursor, every value persists.
3. Fill one field, refresh: it renders as a read-only value with a pencil.
4. Click that pencil: the input returns pre-filled and selected.
5. Twenty fields filled → the meter reads 24 of 40 without a refresh.
6. Simulate a save failure: the typed value stays in the box, an inline error shows,
   blurring again retries.
7. The SSN row never renders a stored value — set it, refresh, confirm it reads
   "On file (hidden)".
8. Derived rows keep the lock and have no input.
9. 390px: inputs don't overflow, labels don't wrap awkwardly, the caption still reads.
10. No toast fires on a successful save; one fires on failure.
```

## DO NOT

- Do not make derived or SSN-when-set rows editable in place.
- Do not save on every keystroke — blur and Enter only.
- Do not keep `revalidatePath` on this save path; it fights the cursor.
- Do not collapse a row while it still has focus.
