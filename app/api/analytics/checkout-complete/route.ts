import { NextResponse, type NextRequest } from "next/server"
import { getAuth } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { getStripe } from "@/lib/stripe"

/**
 * Verify the Stripe success marker before the browser emits a GA4 purchase.
 * The authenticated client must own the case named by the Checkout Session;
 * no PII, case id, or Stripe session id is returned to Analytics.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuth()
  if (!auth || auth.profile.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const sessionId = request.nextUrl.searchParams.get("session_id")
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 })
  }

  const stripe = getStripe()
  const myCase = await getMyCase()
  if (!stripe || !myCase) {
    return NextResponse.json({ error: "Unavailable" }, { status: 503 })
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.metadata?.case_id !== myCase.id || session.payment_status === "unpaid") {
      return NextResponse.json({ error: "Payment not verified" }, { status: 403 })
    }

    return NextResponse.json({
      transactionId: session.id,
      value: (session.amount_total ?? 0) / 100,
      currency: (session.currency ?? "usd").toUpperCase(),
      packageKey: session.metadata?.package_key ?? null,
    })
  } catch {
    return NextResponse.json({ error: "Payment not verified" }, { status: 404 })
  }
}
