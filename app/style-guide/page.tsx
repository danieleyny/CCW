import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HudStat } from "@/components/ui/hud-stat"
import { ReticleProgress } from "@/components/ui/reticle-progress"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { StatusBadge } from "@/components/shared/status-badge"
import { TechGrid } from "@/components/shared/tech-grid"

export const metadata = { title: "Style Guide", robots: { index: false } }

const SURFACES = ["bg-background", "bg-surface-1", "bg-surface-2", "bg-surface-3"]
const ACCENTS = [
  ["bg-brass", "brass"],
  ["bg-brass-bright", "brass-bright"],
  ["bg-brass-deep", "brass-deep"],
  ["bg-signal", "signal"],
  ["bg-ok", "ok"],
  ["bg-warn", "warn"],
  ["bg-danger", "danger"],
]

export default function StyleGuide() {
  return (
    <div className="dark relative mx-auto min-h-svh max-w-4xl bg-background px-5 py-12 text-foreground">
      <TechGrid glow="both" />
      <div className="relative space-y-12">
        <header>
          <SectionEyebrow>Design System</SectionEyebrow>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Gun License NYC — Style Guide</h1>
          <p className="mt-2 text-text-mid">Obsidian · brass · signal-cyan · precision HUD.</p>
        </header>

        <Section title="Color">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SURFACES.map((c) => (
              <div key={c} className={`${c} flex h-20 items-end rounded-md border border-hairline p-2`}>
                <span className="font-mono text-[10px] text-text-mid">{c}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ACCENTS.map(([c, name]) => (
              <div key={name} className="flex items-center gap-2">
                <span className={`${c} size-6 rounded-md`} />
                <span className="font-mono text-[10px] text-text-mid">{name}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Typography">
          <p className="font-display text-3xl font-semibold">Space Grotesk display</p>
          <p className="text-base text-text-mid">Geist Sans body — clean, modern, legible.</p>
          <p className="engraved">JetBrains Mono // STAGE 06 — DOCUMENT COLLECTION</p>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
        </Section>

        <Section title="Inputs & Badges">
          <Input placeholder="Obsidian input with signal focus…" className="max-w-sm" />
          <div className="flex flex-wrap gap-2">
            {["active", "pending", "approved", "rejected", "blocked", "paid"].map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
            <Badge>Brass</Badge>
            <Badge variant="secondary">Secondary</Badge>
          </div>
        </Section>

        <Section title="Reticle Progress">
          <Card>
            <CardContent className="p-6">
              <ReticleProgress currentStage="document_collection" />
            </CardContent>
          </Card>
        </Section>

        <Section title="HUD Stats">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <HudStat value={1200} suffix="+" label="Clients guided" />
            <HudStat value={6} label="Month avg timeline" />
            <HudStat value={98} suffix="%" label="On-time filing" />
          </div>
        </Section>

        <Section title="Cards">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <div className="font-medium">Standard panel</div>
                <p className="mt-1 text-sm text-text-mid">Glass + hairline border.</p>
              </CardContent>
            </Card>
            <Card className="brass-edge">
              <CardContent className="p-6">
                <div className="font-medium text-brass-bright">Prestige panel</div>
                <p className="mt-1 text-sm text-text-mid">Brass edge + glow for key cards.</p>
              </CardContent>
            </Card>
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <SectionEyebrow>{title}</SectionEyebrow>
      {children}
    </section>
  )
}
