"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { Bot, BookOpen, LoaderCircle, Send, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

type Source = { label: string; url: string }
type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: Source[]
  legalBoundary?: boolean
}

const STARTERS = [
  "What should I gather before I start my NYC application?",
  "I own a licensed firearm in another state. What should I review?",
  "What is the difference between uploaded, pending, and accepted?",
  "How do references and cohabitant forms work in the workspace?",
]

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: "I’m your paid Firearm License NYC assistant. Ask a general licensing or workspace question in your own words. I’ll answer the question you asked, explain the practical next step, and show the official sources to review. Do not enter names, addresses, dates of birth, case numbers, passwords, medical details, or documents here.",
}

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function FirearmAiAssistant({ enabled }: { enabled: boolean }) {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [draft, setDraft] = useState("")
  const [pending, setPending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, pending])

  async function ask(value?: string) {
    const question = (value ?? draft).trim()
    if (!enabled || pending || question.length < 3) return
    const userMessage: Message = { id: id(), role: "user", content: question }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setDraft("")
    setPending(true)
    try {
      const response = await fetch("/api/portal/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages
            .filter((message) => message.id !== "welcome")
            .slice(-11)
            .map(({ role, content }) => ({ role, content })),
        }),
      })
      const payload = await response.json() as { answer?: string; error?: string; sources?: Source[]; legalBoundary?: boolean }
      if (!response.ok || !payload.answer) throw new Error(payload.error || "The assistant could not answer right now.")
      setMessages((current) => [...current, {
        id: id(),
        role: "assistant",
        content: payload.answer!,
        sources: payload.sources,
        legalBoundary: payload.legalBoundary,
      }])
    } catch (error) {
      setMessages((current) => [...current, {
        id: id(),
        role: "assistant",
        content: error instanceof Error ? error.message : "The assistant could not answer right now.",
      }])
    } finally {
      setPending(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void ask()
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-surface-1 shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between border-b border-hairline bg-[radial-gradient(circle_at_90%_-50%,color-mix(in_oklab,var(--brass)_28%,transparent),transparent_52%)] px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl border border-brass/25 bg-brass/10 text-brass-bright"><Bot className="size-5" /></span>
          <div><p className="font-display text-lg font-semibold">Claude licensing assistant</p><p className="text-xs text-text-low">General information · official sources · not legal advice</p></div>
        </div>
        <span className="engraved-sm hidden rounded-full border border-ok/25 bg-ok/10 px-3 py-1 text-ok sm:inline-flex">Paid access</span>
      </div>

      {!enabled ? (
        <div className="m-4 rounded-xl border border-warn/25 bg-warn/10 p-4 text-sm text-warn sm:m-5">
          The paid access gate is active. The final Claude API credential still needs to be connected before questions can be sent.
        </div>
      ) : null}

      <div ref={listRef} className="h-[min(58svh,560px)] space-y-4 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite">
        {messages.map((message) => (
          <article key={message.id} className={message.role === "user" ? "ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-brass px-4 py-3 text-brand-foreground" : "max-w-[94%] rounded-2xl rounded-bl-md border border-hairline bg-surface-2 px-4 py-3"}>
            {message.role === "assistant" ? <div className="engraved-sm mb-2 flex items-center gap-1.5 text-brass-bright"><Sparkles className="size-3.5" /> Firearm License NYC</div> : null}
            <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
            {message.legalBoundary ? <div className="mt-3 flex gap-2 rounded-lg border border-warn/20 bg-warn/8 p-3 text-xs leading-5 text-warn"><ShieldCheck className="mt-0.5 size-4 shrink-0" /> Personal legal judgment belongs with a New York-licensed attorney.</div> : null}
            {message.sources?.length ? (
              <details className="mt-3 border-t border-hairline pt-3">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-text-mid"><BookOpen className="size-4" /> Official sources to review</summary>
                <div className="mt-2 grid gap-2">{message.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="text-xs text-signal underline underline-offset-4">{source.label}</a>)}</div>
              </details>
            ) : null}
          </article>
        ))}
        {messages.length === 1 ? <div className="grid gap-2 sm:grid-cols-2">{STARTERS.map((starter) => <button key={starter} type="button" disabled={!enabled} onClick={() => void ask(starter)} className="rounded-xl border border-hairline bg-surface-2 p-3 text-left text-xs leading-5 text-text-mid transition-colors hover:border-brass/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40">{starter}</button>)}</div> : null}
        {pending ? <div className="flex w-fit items-center gap-2 rounded-xl border border-hairline bg-surface-2 px-4 py-3 text-xs text-text-mid"><LoaderCircle className="size-4 animate-spin text-brass" /> Preparing a grounded answer…</div> : null}
      </div>

      <form onSubmit={submit} className="border-t border-hairline bg-surface-2/60 p-3 sm:p-4">
        <div className="flex items-end gap-2 rounded-xl border border-hairline bg-surface-1 p-2 focus-within:border-brass/45">
          <textarea value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 1200))} disabled={!enabled || pending} rows={2} maxLength={1200} placeholder="Ask a general licensing or workspace question…" className="min-h-14 flex-1 resize-none bg-transparent px-2 py-1 text-sm leading-5 outline-none placeholder:text-text-low disabled:cursor-not-allowed" />
          <Button type="submit" size="icon" disabled={!enabled || pending || draft.trim().length < 3} aria-label="Send question" className="size-11 shrink-0"><Send className="size-4" /></Button>
        </div>
        <div className="mt-2 flex justify-between px-1 text-[10px] text-text-low"><span>Questions are not written to your case activity log.</span><span>{draft.length}/1200</span></div>
      </form>
    </div>
  )
}
