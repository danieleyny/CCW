# Intro call — button + modal, not a permanent embed

> The Calendly scheduler currently loads inline on the concierge dashboard on every visit. Replace it with a compact card and a button that opens the scheduler in a modal, loading nothing until the button is clicked.
>
> **Do not add Calendly's widget.js.** See the CSP finding below — it would be blocked, and the approach here does not need it.

---

## WHY IT GLITCHES TODAY

`components/portal/concierge/calendly-embed.tsx` renders in three visible stages on **every** page load:

```
1. src is null until useEffect runs client-side
   → a 1000px EMPTY placeholder is painted first
2. the iframe loads Calendly over the network
   → the white panel appears in the gap
3. Calendly posts `calendly.page_height`
   → the height snaps from 1000px to the real value
```

Gap, flash, jump. And it happens on the home screen of a dashboard the applicant will open dozens of times, for an action he takes **once**.

The sizing machinery in that file — the `embed_domain` / `embed_type` handshake, the `postMessage` listener, the generous fallback height — exists solely because a ~1000px scheduler is being forced into a dashboard card. Move it into a modal and the entire problem class disappears.

---

## THE CSP FINDING — this decides the approach

`next.config.ts:20` and `:29`:

```
script-src  'self' 'unsafe-inline' https://www.googletagmanager.com     ← no calendly
style-src   'self' 'unsafe-inline'                                       ← no calendly
frame-src   'self' … https://calendly.com https://*.calendly.com         ← calendly OK
```

Calendly's popup widget needs `https://assets.calendly.com` in **both** `script-src` and `style-src`. It is in neither, so the native popup would be silently blocked. That is almost certainly why the current code hand-rolls an iframe with a manual `postMessage` handshake instead of using widget.js.

**So: build our own modal with the same iframe inside it.** No CSP change, no third-party script on our origin, full control of the styling — and `frame-src` already permits the iframe.

---

## PHASE 1 — The card

Rewrite `components/portal/concierge/book-call.tsx` so the unbooked state is compact.

```
NOT BOOKED — a normal dashboard card, roughly the height of one vault row:
  · title: "Book your intro call"
  · one line: "{15} minutes with your concierge — we'll walk through your case
    and answer anything. Nothing to prepare."
  · primary button: "Choose a time"
  · nothing else. No iframe, no script, no placeholder, no reserved height.

BOOKED — unchanged. The existing confirmed strip already reads well: the date and
  time, the Join link, and a Reschedule link. Keep it, and make sure the
  scheduler is NOT mounted in this state.

CALENDLY NOT CONFIGURED (CALENDLY_CONCIERGE_URL unset) — keep the existing
  RequestCallButton fallback exactly as it is. It must stay the graceful path.

DURATION: the card currently says "Fifteen minutes" while the Calendly event was
  last seen set to 30. Read the real duration off the Calendly event and make the
  copy match. Better still, drive the number from one constant so the card, the
  modal title and the confirmation cannot disagree.
```

## PHASE 2 — The modal

```
1. Use the existing components/ui/dialog.tsx primitive — the same one
   questionnaire-dialog.tsx uses. Do not introduce a new modal implementation.

2. MOUNT ON OPEN, UNMOUNT ON CLOSE. The iframe must not exist in the DOM until
   the button is clicked, and must be destroyed when the dialog closes. This is
   the whole point: zero cost on page load, and a fresh scheduler each time
   rather than a stale one.

3. SIZING — this is where the old problem dies. Inside a modal, give the iframe a
   viewport-relative height and let Calendly scroll internally:
     dialog:  w-full max-w-[440px]  h-[min(760px,85vh)]
     iframe:  h-full w-full border-0
   Internal scrolling is normal, expected modal behaviour — unlike in a page
   card, where it read as clipping. DELETE the postMessage height handshake
   entirely; it is no longer needed.

4. KEEP the existing URL params — they are not decoration:
     utm_content={introToken}   ← the webhook matches the booking to the case
                                   THROUGH THIS. If it is dropped, bookings
                                   silently stop being attached to the case.
     hide_event_type_details=1  ← removes the duplicate Calendly header
     hide_gdpr_banner=1
   Keep the embedUrl() helper as the single place these are built.

5. LOADING STATE inside the dialog: a small centred spinner behind the iframe
   until its onLoad fires. The dialog opens instantly with a title and a spinner,
   which reads as deliberate — unlike a blank 1000px gap on a page.

6. CLOSE ON SUCCESS. Listen for Calendly's `calendly.event_scheduled`
   postMessage (origin-checked against calendly.com, as the current code already
   does for page_height). On receipt: close the dialog, show a success toast, and
   router.refresh() so the confirmed strip appears. The webhook is still the
   source of truth for the booking — this is only for the UI to react promptly.
   If the message never arrives, closing the dialog manually must still leave a
   correct page after refresh.

7. FALLBACK: a small "Open in a new tab" link inside the dialog footer, using the
   same URL. If the iframe is blocked by an extension or fails to load, that path
   always works.

8. ACCESSIBILITY: the dialog needs a real title, focus moves into it on open and
   returns to the trigger on close, Escape closes it. The existing Dialog
   primitive handles most of this — verify rather than assume.
```

## PHASE 3 — Delete and relocate

```
1. DELETE components/portal/concierge/calendly-embed.tsx. Its whole reason for
   existing was fitting the scheduler into a page card. If any of it survives,
   the refactor was not done.

2. DASHBOARD PLACEMENT — with the card now compact, revisit the order set
   earlier:
     NOT BOOKED  → the card stays near the top; it is the next action.
     BOOKED      → it should NOT hold a full section. Fold the confirmed strip
                   into the control tower as a milestone line
                   ("Intro call — Thu 4:00 PM · Join") and drop the standalone
                   section entirely.
   A one-time step should stop occupying prime space once it is done.

3. Check the sponsor surface: if a scheduler is or will be shown to the sponsor,
   it uses the same component and the same rules.
```

---

## VERIFY

```
1. PAGE LOAD IS CLEAN: open the concierge dashboard with the network panel open.
   No request to calendly.com until the button is clicked. No layout shift, no
   1000px gap, no height jump. Reload five times and watch — this is the actual
   bug being fixed.
2. The iframe is absent from the DOM until the dialog opens, and gone again after
   it closes.
3. BOOKING STILL ATTACHES: complete a test booking and confirm the webhook
   matched it to the case — i.e. utm_content survived. This is the one thing that
   can break silently.
4. On success the dialog closes, the toast fires, and the confirmed strip appears
   without a manual reload.
5. Booked state mounts no scheduler at all.
6. CALENDLY_CONCIERGE_URL unset → the RequestCallButton fallback, unchanged.
7. The stated duration matches the real Calendly event everywhere it appears.
8. 390px: the dialog is usable on a phone — Calendly's own mobile layout inside a
   near-full-screen sheet. Check that the close control is reachable and not
   overlapped by the iframe.
9. Keyboard: Escape closes, focus returns to the trigger button.
10. calendly-embed.tsx no longer exists; no dead postMessage height code remains.
11. pnpm build && pnpm test green.
```

## DO NOT

- Do not add `assets.calendly.com` to the CSP — this approach does not need it.
- Do not keep the `calendly.page_height` handshake; the modal has a fixed height.
- Do not drop `utm_content` — bookings would stop matching their case, silently.
- Do not mount the iframe on page load "so it's ready" — that is the bug.
- Do not leave a full booking section on the dashboard once the call is booked.
- Do not replace the RequestCallButton fallback.
