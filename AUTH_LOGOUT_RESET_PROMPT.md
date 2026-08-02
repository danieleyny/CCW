# Gun License NYC — auth fixes: real logout, switch account, forgot password
### Claude Code prompt

Three auth problems:
1. **Logout doesn't truly end the session.** `signOut()` (app/auth/actions.ts) calls `supabase.auth.signOut()` then `redirect("/auth/login")`, but the auth cookies aren't reliably cleared before the redirect. So the proxy (proxy.ts) still sees a signed-in user and — per its rule "signed-in users on /auth/login → /dashboard" — bounces them straight back in. Result: click logout, click login, and you're auto-logged into the same account. Keep the auto-login convenience for genuinely signed-in users; just make logout actually log out.
2. **No way to switch to / sign up for a different account while signed in** (the proxy blocks /auth/login and /auth/sign-up for any active session).
3. **No forgot-password flow.**

`pnpm build` + `pnpm test` pass. Security: neutral messaging on reset (don't reveal whether an email exists); reset links single-use + short-lived (Supabase default). Note the earlier change that disabled signup email confirmation does NOT affect password-reset emails — those are separate and must work.

---

## Phase 1 — Make logout truly end the session (the core glitch)
```
Fix app/auth/actions.ts signOut() so the session is fully cleared BEFORE the redirect, so the proxy sees no user:
1. await supabase.auth.signOut() — and make sure the SSR cookie handler actually deletes ALL Supabase auth cookies,
   including the chunked ones (sb-<ref>-auth-token, .0, .1, refresh token). If createClient's cookie adapter doesn't
   remove them on signOut, explicitly delete every cookie whose name starts with "sb-" via next/headers cookies() in
   the server action.
2. revalidatePath("/", "layout") (clear any cached user) THEN redirect("/auth/login?loggedout=1").
3. Confirm the redirect response carries the Set-Cookie deletions (the classic bug is the redirect throwing before the
   cookie-clear headers flush — clear cookies, then redirect).
Do this once in signOut so every logout button (components/admin/topbar.tsx, app/portal/layout.tsx, and the instructor
layout) benefits. After this, visiting /auth/login post-logout must show the login FORM, not bounce to /dashboard.
Add a quick note/comment in proxy.ts that its "signed-in → /dashboard" bounce is correct and intentional (that's the
auto-login convenience) — the bug was logout not clearing the session, not the proxy.
```

## Phase 2 — Allow switching / adding a different account
```
Even with a valid session, a user should be able to deliberately use a different account:
1. On the login + sign-up pages, when the visitor IS already signed in (or arriving via a "switch account" link), show a
   clear "You're signed in as <email> — Continue" AND a "Use a different account" option that calls signOut() and lands
   them on the fresh login/sign-up form.
2. Implement "Use a different account" as a small server action (sign out → redirect to /auth/login or /auth/sign-up)
   rather than relying on the proxy bounce. Add a "Switch account" / "Sign in as someone else" link in the nav account
   menu (admin topbar, portal, instructor) next to Sign out.
3. Keep the proxy bounce for normal navigation (a signed-in user hitting /auth/login by accident still goes to their
   dashboard) — the switch path explicitly signs out first, so it reaches the form cleanly.
```

## Phase 3 — Forgot-password + reset flow
```
1. LINK: add "Forgot your password?" on app/auth/login/page.tsx → /auth/forgot-password.
2. /auth/forgot-password (new page + action): email field → supabase.auth.resetPasswordForEmail(email, { redirectTo:
   `${siteUrl}/auth/reset-password` }). ALWAYS show the same neutral success message ("If an account exists for that
   email, we've sent a reset link") regardless of whether the email exists — don't leak account existence.
3. /auth/reset-password (new page + action): the recovery link lands here with a Supabase recovery session; show a
   "set a new password" form (password + confirm, with the same strength rules as signup) → supabase.auth.updateUser({
   password }). On success, sign them in / redirect to /dashboard with a confirmation. Handle an expired/invalid link
   gracefully with a "request a new link" path.
4. CONFIG NOTE (surface to the owner, don't hardcode around it): the reset email is sent by Supabase Auth — ensure
   `${siteUrl}/auth/reset-password` is in the Supabase Auth "Redirect URLs" allowlist, and that Auth email sending is
   configured (Supabase SMTP or the Resend integration). If you want the branded look, set the Supabase "Reset password"
   email template. Add /auth/reset-password + /auth/forgot-password to proxy allowances (they must be reachable while
   signed OUT and while carrying a recovery token).
5. Match the existing auth page design (app/auth/layout.tsx + the login/sign-up card styling).
```

## Phase 4 — Verify
```
- LOGOUT: sign in → click Sign out → land on /auth/login showing the FORM (not bounced to /dashboard); no sb-* auth
  cookies remain; clicking Sign in does NOT auto-log you in — you must enter credentials. Test in admin, portal, and
  instructor.
- SWITCH: while signed in, "Use a different account" reaches a clean login/sign-up form; signing into account B works;
  account A's session is gone.
- FORGOT PASSWORD: request reset for a real account → email arrives → link opens /auth/reset-password → set new password
  → can sign in with it; old password no longer works; expired/invalid link shows a graceful retry. A non-existent email
  shows the same neutral success message (no leak).
- The proxy still auto-routes a genuinely signed-in user from /auth/login to their dashboard (auto-login convenience
  intact).
- pnpm build && pnpm test pass; auth pages work at 390px.
Deliver: a short clip/screens of logout→login (no auto-login) and the full forgot-password round trip.
```

---

### Notes for you (not for Claude Code)
- **Root cause in one line:** logout wasn't clearing the session cookies, so the proxy treated you as still-signed-in and sent you back to your dashboard. Phase 1 is the real fix; Phases 2–3 add the switch-account and forgot-password flows you asked for.
- **One config step is yours, not code:** for password reset emails to send and the reset link to work, `/auth/reset-password` must be in your Supabase Auth Redirect-URLs allowlist and Auth email sending must be on (Supabase SMTP or the Resend integration). The prompt flags it; just confirm it in the Supabase dashboard after the build.
- Keeping the auto-login convenience is intentional — the only change to that behavior is that a real logout now genuinely logs you out.
