"use client"

import { useCallback, useEffect, useRef, useState, type FocusEvent, type RefObject } from "react"
import styles from "./PricingSection.module.css"
import ViewToggle from "./ViewToggle"
import { createPricingScene, type SceneHandle, type SceneLayout, type SceneMode } from "./pricingScene"
import { startStageTrack } from "./stageTrack"
import { useInView } from "./useInView"
import { usePrefersReducedMotion } from "../shared/usePrefersReducedMotion"
import { ALL_IN, AT_COST_FEES, CHECKS, FEES, METER_MAX, OUR_FEE, STOPS, type Tone } from "./pricingData"

const AUTOPLAY_MS = 2600
const HOLD_AFTER_PICK_MS = 5000
const toneClass = (tone: Tone) => tone === "ours" ? styles.toneOurs : tone === "warn" ? styles.toneWarn : styles.toneDim
const stopGeometry = STOPS.map((stop) => ({ lanes: stop.lanes, ours: !!stop.ours, varies: !!stop.varies, runMin: stop.runMin, runMax: stop.runMax }))

function Arrow() { return <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true"><path d="M1 6h15M11 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function Check() { return <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg> }

function useInert(ref: RefObject<HTMLElement | null>, hidden: boolean) {
  useEffect(() => { const element = ref.current as (HTMLElement & { inert?: boolean }) | null; if (!element) return; element.inert = hidden; element.setAttribute("aria-hidden", hidden ? "true" : "false") }, [ref, hidden])
}

export default function PricingSection() {
  const reduced = usePrefersReducedMotion()
  const [sectionRef, inView] = useInView<HTMLElement>(0.25)
  const [mode, setMode] = useState<SceneMode>("breakdown")
  const [hover, setHover] = useState<number | null>(null)
  const [active, setActive] = useState(0)
  const [interacted, setInteracted] = useState(false)
  const pointerInside = useRef(false), pauseTimer = useRef<number | null>(null), scenes = useRef<SceneHandle[]>([])
  const [autoplayPaused, setAutoplayPaused] = useState(false)
  const isTimeline = mode === "timeline"
  const panelRef = useRef<HTMLDivElement>(null), desktopCanvasRef = useRef<HTMLCanvasElement>(null), rowRefs = useRef<(HTMLLIElement | null)[]>([]), cardRef = useRef<HTMLElement>(null), desktopNodeRefs = useRef<(HTMLSpanElement | null)[]>([]), desktopSlotRefs = useRef<(HTMLDivElement | null)[]>([]), desktopMeterRef = useRef<HTMLDivElement>(null), desktopBreakdownRef = useRef<HTMLDivElement>(null), desktopTimelineRef = useRef<HTMLDivElement>(null)
  const mobileStackRef = useRef<HTMLDivElement>(null), mobileCanvasRef = useRef<HTMLCanvasElement>(null), guardRef = useRef<HTMLDivElement>(null), mobileNodeRefs = useRef<(HTMLSpanElement | null)[]>([]), mobileMeterRef = useRef<HTMLDivElement>(null), stageRef = useRef<HTMLCanvasElement>(null), mobileBreakdownRef = useRef<HTMLDivElement>(null), mobileTimelineRef = useRef<HTMLDivElement>(null)
  useInert(desktopBreakdownRef, isTimeline); useInert(mobileBreakdownRef, isTimeline); useInert(desktopTimelineRef, !isTimeline); useInert(mobileTimelineRef, !isTimeline)

  const getDesktopLayout = useCallback((): SceneLayout | null => {
    const panel = panelRef.current, card = cardRef.current, meter = desktopMeterRef.current
    if (!panel || !card || !meter || rowRefs.current.length !== FEES.length || desktopNodeRefs.current.length !== STOPS.length || desktopSlotRefs.current.length !== STOPS.length || rowRefs.current.some((row) => !row) || desktopNodeRefs.current.some((node) => !node) || desktopSlotRefs.current.some((slot) => !slot)) return null
    const panelRect = panel.getBoundingClientRect(); if (!panelRect.width || !panelRect.height) return null
    const relative = (rect: DOMRect) => ({ left: rect.left - panelRect.left, right: rect.right - panelRect.left, top: rect.top - panelRect.top, centerX: rect.left + rect.width / 2 - panelRect.left, centerY: rect.top + rect.height / 2 - panelRect.top })
    const ports = FEES.map((fee, index) => { const rect = relative(rowRefs.current[index]!.getBoundingClientRect()); return { x: rect.right + 30, y: rect.centerY, lanes: fee.lanes, ours: !!fee.ours, hollowLast: !!fee.varies } })
    const cardRect = relative(card.getBoundingClientRect()), meterRect = relative(meter.getBoundingClientRect())
    return { breakdown: { kind: "flow", ports, end: { x: cardRect.left - 2, y: cardRect.centerY } }, timeline: { axis: "x", nodes: STOPS.map((_, index) => { const rect = relative(desktopNodeRefs.current[index]!.getBoundingClientRect()); return { x: rect.centerX, y: rect.centerY } }), riverEnd: panelRect.width - 44, stems: STOPS.map((_, index) => relative(desktopSlotRefs.current[index]!.getBoundingClientRect()).top), leadIn: meterRect.left, meter: { x0: meterRect.left, x1: meterRect.right, y: meterRect.centerY } } }
  }, [])

  const getMobileLayout = useCallback((): SceneLayout | null => {
    const stack = mobileStackRef.current, guard = guardRef.current, meter = mobileMeterRef.current
    if (!stack || !guard || !meter || mobileNodeRefs.current.length !== STOPS.length || mobileNodeRefs.current.some((node) => !node)) return null
    const stackRect = stack.getBoundingClientRect(), guardRect = guard.getBoundingClientRect(), meterRect = meter.getBoundingClientRect(); if (!stackRect.width || !stackRect.height) return null
    const nodes = STOPS.map((_, index) => { const rect = mobileNodeRefs.current[index]!.getBoundingClientRect(); return { x: rect.left + rect.width / 2 - stackRect.left, y: rect.top + rect.height / 2 - stackRect.top } })
    return { breakdown: { kind: "guard", rect: { x: guardRect.left - stackRect.left, y: guardRect.top - stackRect.top, w: guardRect.width, h: guardRect.height }, radius: 18 }, timeline: { axis: "y", nodes, riverEnd: nodes[nodes.length - 1].y + 30, meter: { x0: meterRect.left - stackRect.left + 2, x1: meterRect.right - stackRect.left - 2, y: meterRect.top + meterRect.height / 2 - stackRect.top } } }
  }, [])

  useEffect(() => {
    const created: SceneHandle[] = [], base = { stops: stopGeometry, initialMode: mode, meterMax: METER_MAX, oursValue: OUR_FEE, reducedMotion: reduced }
    if (desktopCanvasRef.current) created.push(createPricingScene(desktopCanvasRef.current, getDesktopLayout, { ...base, variant: "desktop" }))
    if (mobileCanvasRef.current) created.push(createPricingScene(mobileCanvasRef.current, getMobileLayout, { ...base, variant: "mobile" }))
    const stage = stageRef.current ? startStageTrack(stageRef.current, { reducedMotion: reduced }) : null
    scenes.current = created
    document.fonts?.ready.then(() => scenes.current.forEach((scene) => scene.relayout()))
    return () => { created.forEach((scene) => scene.destroy()); stage?.destroy(); scenes.current = [] }
  // The refs are stable; measuring must happen only after the client component mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, getDesktopLayout, getMobileLayout])
  useEffect(() => { scenes.current.forEach((scene) => scene.setMode(mode)) }, [mode])
  useEffect(() => { scenes.current.forEach((scene) => scene.setHover(hover)) }, [hover])
  useEffect(() => { scenes.current.forEach((scene) => scene.setActive(active)) }, [active])
  useEffect(() => { if (!isTimeline || reduced || !inView || autoplayPaused) return; const id = window.setInterval(() => { if (!pointerInside.current) setActive((value) => (value + 1) % STOPS.length) }, AUTOPLAY_MS); return () => window.clearInterval(id) }, [isTimeline, reduced, inView, autoplayPaused])
  useEffect(() => () => { if (pauseTimer.current !== null) window.clearTimeout(pauseTimer.current) }, [])
  const switchTo = (next: SceneMode) => { if (next === mode) return; if (pauseTimer.current !== null) window.clearTimeout(pauseTimer.current); setAutoplayPaused(false); setInteracted(true); setHover(null); setActive(0); setMode(next) }
  const pickStop = (index: number) => { if (pauseTimer.current !== null) window.clearTimeout(pauseTimer.current); setInteracted(true); setAutoplayPaused(true); pauseTimer.current = window.setTimeout(() => { setAutoplayPaused(false); pauseTimer.current = null }, HOLD_AFTER_PICK_MS); setActive(index) }
  const timelineHandlers = { onMouseEnter: () => { pointerInside.current = true }, onMouseLeave: () => { pointerInside.current = false }, onFocus: () => { pointerInside.current = true }, onBlur: (event: FocusEvent<HTMLElement>) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) pointerInside.current = false } }
  const running = STOPS[active]

  return <section ref={sectionRef} className={styles.section} data-reduced={reduced} aria-labelledby="pricing-title">
    <header className={styles.header}><div><p className={styles.eyebrow}>Transparent from day one</p><h2 id="pricing-title" className={styles.title}>One fee that<br className={styles.brDesktop} /> protects the rest.</h2></div><p className={styles.lede}>Government fees are non-refundable, and one missing document can cost you months. Our single service fee keeps your filing complete. Everything else is paid at cost.</p></header>
    <div ref={panelRef} className={`${styles.panel} ${styles.desktopOnly}`}><canvas ref={desktopCanvasRef} className={styles.panelCanvas} aria-hidden="true" /><div className={styles.panelTop}><p key={mode} className={styles.kicker}>{isTimeline ? "When it’s due" : "The complete picture"}</p><ViewToggle mode={mode} onChange={switchTo} /></div><div className={styles.views}>
      <div ref={desktopBreakdownRef} className={`${styles.view} ${styles.breakdownBody}`} data-shown={!isTimeline}><ul className={styles.feeList}>{FEES.map((fee, index) => <li key={fee.title} ref={(element) => { rowRefs.current[index] = element }} className={`${styles.fee} ${fee.ours ? styles.feeOurs : ""} ${hover !== null && hover !== index ? styles.feeDim : ""}`} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)}><div className={styles.feeText}><span className={styles.feeName}>{fee.title}</span><span className={`${styles.tag} ${toneClass(fee.tone)}`}>{fee.tag}</span></div><span className={`${styles.feeValue} ${styles.num}`}>{fee.value}</span></li>)}</ul><div aria-hidden="true" /><aside ref={cardRef} className={styles.totalCard}><p className={styles.cardLabel}>Estimated all-in range</p><p className={`${styles.cardTotal} ${styles.num}`}>{ALL_IN}</p><ul className={styles.cardKey}><li><span className={`${styles.keyDot} ${styles.keyDotOurs}`} /><span><strong className={styles.num}>$1,000</strong> covers document prep, a completeness review, and our refile promise.</span></li><li><span className={styles.keyDot} /><span>Everything else at cost. Government fees are non-refundable.</span></li></ul><a href="/pricing" className={styles.cta}>See what the service includes <Arrow /></a></aside></div>
      <div ref={desktopTimelineRef} className={`${styles.view} ${styles.tlView}`} data-shown={isTimeline} {...timelineHandlers}><div className={styles.tlHead} style={{ ["--i" as string]: 0 }}><p className={styles.tlTitle}>When each cost comes due</p><p className={styles.tlNote}>Estimated · timing varies by case</p></div><ol className={styles.tlStops}>{STOPS.map((stop, index) => <li key={stop.num} className={styles.tlStop}><div className={styles.tlLabel} style={{ ["--i" as string]: index }} data-reached={index <= active}><span className={styles.tlPhase}>{stop.num} · {stop.phase}</span><span className={styles.tlWhen}>{stop.when}</span></div><span ref={(element) => { desktopNodeRefs.current[index] = element }} className={styles.tlNode} aria-hidden="true" /><div ref={(element) => { desktopSlotRefs.current[index] = element }} className={styles.tlSlot}><button type="button" className={styles.tlCard} style={{ ["--i" as string]: index }} data-on={index === active} aria-pressed={index === active} onMouseEnter={() => pickStop(index)} onFocus={() => pickStop(index)} onClick={() => pickStop(index)}><span className={styles.tlCardTitle}>{stop.title}</span><span className={`${styles.tlCardValue} ${stop.ours ? styles.tlValueOurs : ""} ${stop.isDecision ? styles.tlValueMuted : ""} ${styles.num}`}>{stop.value}</span><span className={`${styles.tag} ${toneClass(stop.tone)}`}>{stop.tag}</span><span className={styles.tlCardNote}>{stop.note}</span></button></div></li>)}</ol><div className={styles.tlMeter}><div className={styles.tlMeterRow} style={{ ["--i" as string]: 7 }}><p className={styles.tlMeterLabel}>Running total · {running.phase.toLowerCase()}</p><p className={styles.tlMeterValue} aria-live={interacted ? "polite" : "off"}><span className={`${styles.tlMeterAmount} ${styles.num}`}>{running.run}</span><span className={styles.tlMeterOf}>of {ALL_IN} est.</span></p></div><div ref={desktopMeterRef} className={styles.tlMeterTrack} aria-hidden="true" /></div></div>
    </div></div>
    <div className={`${styles.mPanel} ${styles.mobileOnly}`}><ViewToggle mode={mode} onChange={switchTo} full /><div ref={mobileStackRef} className={styles.mViews}><canvas ref={mobileCanvasRef} className={styles.panelCanvas} aria-hidden="true" />
      <div ref={mobileBreakdownRef} className={styles.view} data-shown={!isTimeline}><div ref={guardRef} className={styles.guardCard}><div className={styles.guardHead}><p className={styles.guardLabel}>Paid by every applicant</p><p className={`${styles.guardSum} ${styles.num}`}>~$955–1,180</p></div><ul className={styles.mList}>{AT_COST_FEES.map((fee) => <li key={fee.title} className={styles.mRow}><span className={styles.mRowText}><span className={styles.mName}>{fee.mobileTitle ?? fee.title}</span><span className={`${styles.tag} ${styles.tagSm} ${toneClass(fee.tone)}`}>{fee.mobileTag ?? fee.tag}</span></span><span className={`${styles.mValue} ${styles.num}`}>{fee.value}</span></li>)}</ul></div><p className={styles.protectedBy}><span aria-hidden="true" />Protected by<span aria-hidden="true" /></p><div className={styles.feeCard}><div className={styles.feeCardHead}><div><p className={styles.feeCardKicker}>Full concierge</p><p className={`${styles.feeCardPrice} ${styles.num}`}>$1,000</p></div><p className={styles.feeCardNote}>Our only<br />service fee</p></div><canvas ref={stageRef} className={styles.stageCanvas} role="img" aria-label="Thirteen case stages across five phases: Qualify, Train, Assemble, Review, Submit." /><ul className={styles.checks}>{CHECKS.map((check) => <li key={check}><Check />{check}</li>)}</ul></div></div>
      <div ref={mobileTimelineRef} className={`${styles.view} ${styles.mTlView}`} data-shown={isTimeline} {...timelineHandlers}><div className={styles.mTlHead} style={{ ["--i" as string]: 0 }}><p className={styles.mTlTitle}>When each cost comes due</p><p className={styles.mTlNote}>Estimated</p></div><ol className={styles.mTlList}>{STOPS.map((stop, index) => <li key={stop.num}><button type="button" className={styles.mTlRow} data-on={index === active} aria-pressed={index === active} onClick={() => pickStop(index)}><span ref={(element) => { mobileNodeRefs.current[index] = element }} className={styles.mTlNode} aria-hidden="true" /><span className={styles.mTlInner} style={{ ["--i" as string]: index }}><span className={styles.mTlPhase} data-reached={index <= active}>{stop.num} · {stop.phase} · {stop.when}</span><span className={styles.mTlLine}><span className={styles.mTlTitleText}>{stop.title}</span><span className={`${styles.mTlValue} ${stop.ours ? styles.mTlValueOurs : ""} ${stop.isDecision ? styles.tlValueMuted : ""} ${styles.num}`}>{stop.value}</span></span><span className={`${styles.tag} ${styles.tagSm} ${toneClass(stop.tone)}`}>{stop.tag}</span></span></button></li>)}</ol><div className={styles.mTlMeter}><div className={styles.mTlMeterRow} style={{ ["--i" as string]: 7 }}><p className={styles.mTlMeterLabel}>Running total</p><p className={`${styles.mTlMeterValue} ${styles.num}`} aria-live={interacted ? "polite" : "off"}>{running.run}</p></div><div ref={mobileMeterRef} className={styles.mTlMeterTrack} aria-hidden="true" /></div></div>
    </div><div className={styles.mTotal}><p className={styles.mTotalLabel}>Estimated all-in</p><p className={`${styles.mTotalValue} ${styles.num}`}>{ALL_IN}</p></div><a href="/pricing" className={`${styles.cta} ${styles.mCta}`}>See what the service includes <Arrow /></a></div>
  </section>
}
