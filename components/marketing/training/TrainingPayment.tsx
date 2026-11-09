"use client"

import { useMemo, useState } from "react"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { formatTrainingPrice } from "@/lib/training/format"

const publishableKey = process.env.NEXT_PUBLIC_TRAINING_STRIPE_PUBLISHABLE_KEY
const stripePromise = publishableKey ? loadStripe(publishableKey) : null

function PaymentForm({ onPaid, priceCents }: { onPaid: () => void; priceCents: number }) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function pay() {
    if (!stripe || !elements) return
    setPending(true); setError(null)
    const { error: submitError } = await elements.submit()
    if (submitError) { setError(submitError.message ?? "Please check your payment details."); setPending(false); return }
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: window.location.href },
    })
    if (confirmError) setError(confirmError.message ?? "We could not complete the payment.")
    else if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") onPaid()
    setPending(false)
  }

  return <>
    <PaymentElement options={{ layout: "tabs" }} />
    {error && <p className="trainingPaymentError" role="alert">{error}</p>}
    <button type="button" className="trainingPay" disabled={!stripe || pending} onClick={pay}>{pending ? "Processing…" : `Pay ${formatTrainingPrice(priceCents)} & reserve →`}</button>
  </>
}

export function TrainingPayment({ clientSecret, onPaid, priceCents }: { clientSecret: string; onPaid: () => void; priceCents: number }) {
  const options = useMemo(() => ({
    clientSecret,
    appearance: {
      theme: "stripe" as const,
      variables: { colorPrimary: "#0B1420", colorText: "#0B1420", colorDanger: "#C0392B", fontFamily: "var(--sans), Inter, sans-serif", borderRadius: "11px", spacingUnit: "4px" },
      rules: { ".Input": { backgroundColor: "#FFFFFF", border: "1px solid rgba(11,20,32,.15)" }, ".Input:focus": { boxShadow: "0 0 0 3px rgba(91,108,255,.16)" } },
    },
  }), [clientSecret])
  if (!stripePromise) return <p className="trainingPaymentError">Secure test checkout is not configured on this preview yet.</p>
  return <Elements stripe={stripePromise} options={options}><PaymentForm onPaid={onPaid} priceCents={priceCents} /></Elements>
}
