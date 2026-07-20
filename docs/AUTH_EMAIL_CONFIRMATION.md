# Email confirmation is OFF (signup goes straight to the app)

## What changed

New accounts no longer require a Supabase confirmation email. After entering a
name + email + password, the user gets a live session immediately and lands in
`/dashboard`. `app/auth/actions.ts` `signUp` branches on `data.session`: with
confirmation off, a session exists and we redirect to `/dashboard`; if
confirmation is ever re-enabled, there's no session yet, so we redirect to
`/auth/login` (and the `/auth/callback` route + `emailRedirectTo` still work for
the confirm-link flow).

## The project-config change (must be done in the Supabase dashboard)

This is **not** something the code can toggle — it's an Auth project setting:

1. Supabase dashboard → project `nabohrqydjzborehqslc` → **Authentication** →
   **Sign In / Providers** → **Email**.
2. Turn **Confirm email** OFF.
3. Save.

(Equivalent Management API: `PATCH /v1/projects/{ref}/config/auth` with
`{"mailer_autoconfirm": true}` using a `SUPABASE_ACCESS_TOKEN`.)

## Trade-off (accepted "for now" per owner)

- A mistyped email can no longer be recovered via an email link.
- Slightly wider abuse surface (unverified addresses can create accounts).

Both are acceptable for the current stage and trivially reversible: flip
**Confirm email** back ON. The code already handles that case (redirect to
`/auth/login`), so no code change is needed to re-enable.
