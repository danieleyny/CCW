import "server-only"

/** Twilio SMS is live only when all three env vars are set; otherwise no-op + log. */
export const SMS_ENABLED = Boolean(
  process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
)

export async function sendSms({ to, body }: { to: string; body: string }) {
  if (!SMS_ENABLED) {
    console.log(`[sms:noop] to=${to} "${body.slice(0, 60)}" (set TWILIO_* to enable)`)
    return { skipped: true as const }
  }
  const sid = process.env.TWILIO_ACCOUNT_SID!
  const token = process.env.TWILIO_AUTH_TOKEN!
  const from = process.env.TWILIO_FROM_NUMBER!
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  })
  if (!res.ok) {
    console.error("[sms] failed:", await res.text())
    return { skipped: false as const, ok: false }
  }
  return { skipped: false as const, ok: true }
}
