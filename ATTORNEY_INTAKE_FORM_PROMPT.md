# Attorney intake form — replace direct contact with a screened request

## What changes

Right now `/ethanbrecher` and `/partners` hand the visitor the attorney's phone
number and email directly. That goes away. Every route to him becomes one
intake form we own, so he arrives at the call already briefed.

```
REMOVE — every direct line to the attorney
· components/marketing/partner-profile.tsx:194   tel: link
· components/marketing/partner-profile.tsx:196   mailto: link
· config/partners.ts partnerSchedule()           the tel: fallback and the
                                                 "Call his office to schedule" label
· The same CTA wherever PartnerCard renders it.

Keep `phone` and `email` in the Partner type — staff need them — but they must
not be rendered anywhere public. Add a test that greps the built marketing
output for the attorney's phone number and email and fails if either appears.
```

Every CTA that used to dial or mail now reads **"Request a consultation"** and
goes to the form.

---

## Where the form lives

`/ethanbrecher/consultation` — inside the partner tree, so it inherits the
same coming-soon gate. It must be reachable in preview mode tonight.

Sits behind the same visibility rules as the partner: hidden partners 404 the
form too.

---

## Transport — reuse what exists

```
lib/formspree.ts already does exactly this job. notifyFormspree(source, fields)
needs no API key, never throws, and never blocks the submission.

· Add to SOURCE_LABELS:  "attorney_consultation": "Attorney consultation request"
  so the notification subject reads clearly.
· Follow the captureLead pattern in app/(marketing)/actions.ts: a "company"
  honeypot, per-IP rateLimit, a zod schema parsed at the boundary.
· DO NOT create a client or case row. A legal enquiry is not a sales lead and
  must not enter the case pipeline. Formspree notification only.
```

---

## The form

Three groups on one page. Do not build a multi-step wizard — this is short.

```
1 · WHO YOU ARE
   Full name            required
   Email                required
   Phone                required
   Best times to reach you   optional, free text ("weekday mornings")

2 · WHAT IT'S ABOUT
   What is your question about?   required, select:
     · A past arrest, summons or conviction
     · An application that was denied
     · A licence that was suspended or revoked
     · An order of protection or a domestic incident
     · Citizenship or immigration status
     · A mental-health or medical disclosure question
     · Where and how I can carry or transport a firearm
     · Employment or professional-licence consequences
     · Renewing or amending an existing licence
     · Something else

   Where are you in the process?   required, select:
     · Haven't applied yet
     · Preparing my application
     · Filed and waiting
     · Interview scheduled or completed
     · Denied
     · Already licensed

   Is there a date you're working toward?   optional date
     Helper: "A hearing, a deadline, an interview — anything time-sensitive."

   What would you like to discuss?   required textarea, min 40 characters
     Helper: "Enough for him to prepare — what happened, when, and what you
     need to know. Don't include documents or anything you'd consider
     confidential; you can bring those to the call."

3 · BEFORE YOU SEND
   Are you currently represented by another attorney on this matter?
     required, Yes / No
     This is a conflicts check. It is not optional — an attorney needs it
     before taking a call.

   Acknowledgement checkbox, required:
     "I understand that sending this form does not make Mr Brecher my
      attorney, and that this message is not confidential or privileged."
```

**Submit button:** "Send my request"

**Under the button, exactly as the client asked:**

> Mr Brecher reviews each request personally and will reach out at his earliest
> availability to arrange a call. Consultations are billed at his rate of $300
> per hour.

---

## The disclosure block — get this right

Directly above the acknowledgement, in muted but legible type — not fine print:

```
· This form is received by Gun License NYC and forwarded to Mr Brecher. It is
  NOT an attorney–client communication and it is NOT privileged.
· Submitting it does not create an attorney–client relationship. That begins
  only if he agrees to represent you and you sign his engagement letter.
· Please don't attach documents or send anything you would consider
  confidential until he has confirmed he can act for you.
· Gun License NYC is not a law firm and receives no share of his fees.
```

```
WHY THIS IS NOT OPTIONAL
A form that collects case facts and routes them to an attorney creates three
real problems if it is silent: the sender may believe they have retained him;
unsolicited confidences can create a conflicts problem for HIM later; and
because the submission passes through us, it is not privileged — which a person
describing a sealed arrest would reasonably assume it was.

Flag to the client: the exact wording of this block should be run past the
attorney before the page goes public. He may have his own required language.
```

---

## Design

Match the partner profile — same tokens, same type scale, same register. Warm
and composed, not a support ticket.

```
· Page header: eyebrow "Independent legal counsel", a serif/display headline
  ("Request a consultation"), and one short paragraph.
· A compact attorney card beside or above the form — portrait, name, firm, the
  credential badges — so the person can see who they're writing to.
· Three labelled fieldsets with real <legend>s, hairline rules between groups.
· Generous field sizing; 16px minimum on inputs so iOS does not zoom on focus.
· Inline validation messages under each field, never a single error summary.
· The submit button spans full width on mobile.
· Success state REPLACES the form in place — do not redirect. Show a confirmation
  that repeats what happens next and roughly when.
· Errors keep everything the person typed. Losing a 200-word description to a
  validation error is the worst thing this form can do.
```

---

## VERIFY

```
1. Neither the attorney's phone number nor his email appears anywhere in the
   rendered marketing HTML. Grep the build output, not the source.
2. Every "contact him" path on /partners and /ethanbrecher leads to the form.
3. A real submission arrives in the Formspree inbox with a subject that says
   "Attorney consultation request", carrying every field including the
   conflicts answer and the acknowledgement.
4. No client, case, task or appointment row is created.
5. Submitting with the honeypot filled returns a fake success and sends nothing.
6. Six rapid submissions from one IP are rate-limited.
7. A validation error preserves every field the person typed.
8. Works while the partner is coming_soon, behind the preview code.
9. 390px: nothing overflows, iOS does not zoom on input focus, the select is
   usable with a thumb.
10. Keyboard only: every field reachable, focus visible, the form submittable.
```

## DO NOT

- Do not render the attorney's phone or email anywhere public.
- Do not create a lead, client or case record from this form.
- Do not accept file uploads. The disclosure tells people not to send documents;
  the form must not contradict it.
- Do not add a "we'll get back to you within X hours" promise. He sets his own
  availability.
- Do not let a validation error clear the description field.
