"use client"

import { useEffect, useRef, type CSSProperties } from "react"
import {
  PAPER,
  FLOOR,
  SHEET_TONES,
  sheetLines,
  CONFETTI_BACK,
  CONFETTI_FRONT,
  SEAL_TICKS,
  ROWS,
  type Sheet as SheetT,
  type ConfettiPiece,
} from "./geometry"

/**
 * HERO FILM V6 — a 25-second looping illustrated film, inline SVG + CSS only.
 *
 * Ported from mockups/hero-film-v6.html. JS's ONLY job is to flip data-beat /
 * data-idle / data-playing on the root element on a setTimeout schedule; CSS
 * (globals.css, the .hero-film block) owns 100% of the motion. The full first
 * frame is server-rendered (no dangerouslySetInnerHTML, no markup injection) —
 * geometry.ts runs at module scope and we map its arrays to real JSX here.
 *
 * §8 owner rulings applied: the license card keeps its wording (attorney-cleared);
 * the next-step card reads "YOUR MOVE" (we don't book the live-fire session); the
 * fingerprints row reads "· submitted" (the NYPD schedules the prints). Nothing
 * implies the NYPD approves — there is no "APPROVED" stamp; the chip says
 * "WE'RE ON IT".
 *
 * Reduced motion holds the resolved still frame (license + completed dashboard).
 * An IntersectionObserver stops the loop off-screen and restarts it on return.
 */

/* ── the timeline: beat → time (ms). Beat 1 is EXACTLY 5400ms so the idle loops
   (1.35 / 1.8 / 2.7 / 5.4s) all land on 0% when it ends — the snap rule. ── */
const MARKS: { b: number | "still" | "loop"; t: number }[] = [
  { b: 0, t: 0 },
  { b: 1, t: 200 },
  { b: "still", t: 5600 }, // idle off at phase zero
  { b: 2, t: 5660 },
  { b: 3, t: 6560 },
  { b: 4, t: 9160 },
  { b: 5, t: 10360 },
  { b: 6, t: 12960 },
  { b: 7, t: 18360 },
  { b: 8, t: 21560 },
  { b: "loop", t: 25400 },
]
// c1 holds through the stop; c2 lands on the drop and rides the sweep; c4 holds
// while the rail finishes, so the sentence closes on the license.
const CAPS: Record<number, string> = { 1: "c1", 2: "c1", 3: "c2", 4: "c2", 5: "c3", 6: "c4", 7: "c5", 8: "c6" }

/* ── The inline driver (Step 2). Self-contained vanilla JS rendered right after
   the <figure> so it runs at HTML parse time — before any bundle is requested,
   so the film starts on its own within a few hundred ms of first paint instead
   of waiting for React to hydrate the clicked subtree. Mirrors the useEffect
   exactly: same MARKS/CAPS, the "still" early-idle-clear snap rule, the same
   reduced-motion hold (beat 8 / c6), 25400ms loop. Adds the visibility pauses:
   an IntersectionObserver (0.15) + document.visibilitychange. Sets
   data-film-driver="inline" so the effect defers. CSP allows 'unsafe-inline'
   for script-src, so this is CSP-safe and adds no directive. */
const FILM_DRIVER = `(function(){
var r=document.getElementById('hero-film');
if(!r||r.__hfDriver)return;
r.__hfDriver=1;
var M=[[0,0],[1,200],['still',5600],[2,5660],[3,6560],[4,9160],[5,10360],[6,12960],[7,18360],[8,21560],['loop',25400]];
var C={1:'c1',2:'c1',3:'c2',4:'c2',5:'c3',6:'c4',7:'c5',8:'c6'};
function caps(b){r.querySelectorAll('.capline').forEach(function(e){e.removeAttribute('data-on')});var id=C[b];if(id){var t=r.querySelector('[data-cap="'+id+'"]');if(t)t.setAttribute('data-on','true')}}
if(matchMedia('(prefers-reduced-motion: reduce)').matches){r.setAttribute('data-beat','8');caps(8);return}
var T=[];function clr(){T.forEach(clearTimeout);T=[]}
function run(){clr();r.setAttribute('data-beat','0');caps(0);r.setAttribute('data-idle','1');r.removeAttribute('data-playing');void r.offsetWidth;r.setAttribute('data-playing','true');
M.forEach(function(m){T.push(setTimeout(function(){if(m[0]==='loop'){run();return}if(m[0]==='still'){r.removeAttribute('data-idle');return}r.setAttribute('data-beat',String(m[0]));caps(m[0])},m[1]))})}
function stop(){clr();r.removeAttribute('data-playing')}
var playing=false,inView=true,tabVis=!document.hidden;
function sync(){if(inView&&tabVis){if(!playing){playing=true;run()}}else{if(playing){playing=false;stop()}}}
sync();
try{var io=new IntersectionObserver(function(es){inView=es[0].isIntersecting;sync()},{threshold:0.15});io.observe(r)}catch(e){}
document.addEventListener('visibilitychange',function(){tabVis=!document.hidden;sync()});
})();`

/* one paper sheet: placement rotation on the OUTER <g>, fly-in on the inner .pg */
function Sheet({ p, idx }: { p: SheetT; idx: number }) {
  const tone = SHEET_TONES[idx % 3]
  const cx = p.x + p.w / 2
  const cy = p.y + 12
  return (
    <g transform={`rotate(${p.r} ${cx} ${cy})`}>
      <g className="pg" style={{ "--i": idx % 12, "--fx": `${((idx % 5) - 2) * 70}px` } as CSSProperties}>
        <rect x={p.x} y={p.y} width={p.w} height={24} rx={2} fill={tone} />
        <rect x={p.x} y={p.y} width={p.w} height={24} rx={2} fill="none" stroke="#C3B7A0" strokeWidth={0.9} />
        {sheetLines(p, idx).map((ln, l) => (
          <rect key={l} x={ln.x} y={ln.y} width={ln.w} height={2.4} rx={1.2} fill="#BEB39D" />
        ))}
      </g>
    </g>
  )
}

/* the figure rig — one geometry, drawn twice (ink = paper world, slate = dark).
   Forearm first, upper arm over it, so the upper arm hides the elbow seam. */
function Rig({ scope, ink, cut }: { scope: "m" | "o"; ink: string; cut: string }) {
  return (
    <g className={`rig ${scope}`}>
      <g className="j j-lo">
        <path d="M102 318 C 102 290, 112 268, 144 266 C 178 264, 188 290, 190 318 Z" fill={ink} />
        <g className="j j-up">
          <path d="M114 292 C 112 254, 124 232, 147 230 C 172 228, 182 252, 182 294 Z" fill={ink} />
          <g className="j j-ua">
            <g className="j j-fa">
              <path d="M176 296 L236 296" stroke={cut} strokeWidth={20} fill="none" strokeLinecap="round" />
              <path d="M176 296 L236 296" stroke={ink} strokeWidth={15} fill="none" strokeLinecap="round" />
              <circle cx={238} cy={296} r={8.6} fill={ink} stroke={cut} strokeWidth={2.4} />
            </g>
            <path d="M166 250 L177 292" stroke={cut} strokeWidth={21} fill="none" strokeLinecap="round" />
            <path d="M166 250 L177 292" stroke={ink} strokeWidth={16.5} fill="none" strokeLinecap="round" />
          </g>
          <g className="j j-hd">
            <rect x={138} y={210} width={18} height={40} rx={8} fill={ink} stroke={cut} strokeWidth={3.2} />
            <circle cx={146} cy={193} r={24} fill={ink} stroke={cut} strokeWidth={3.2} />
          </g>
        </g>
      </g>
    </g>
  )
}

const GREEN_CHECK = (
  <path d="M-4 0 l3 3.4 6-7.4" stroke="var(--ok)" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
)

/* one confetti piece — three nested groups (drift / rise-fall / tumble) */
function Confetti({ p }: { p: ConfettiPiece }) {
  const shape =
    p.kind === 0 ? (
      <rect x={-5} y={-7.4} width={10} height={14.8} rx={1.8} fill={p.tone} />
    ) : p.kind === 1 ? (
      <rect x={-2.8} y={-9.6} width={5.6} height={19.2} rx={2.4} fill={p.tone} />
    ) : (
      <rect x={-5.4} y={-5.4} width={10.8} height={10.8} rx={1.8} fill={p.tone} />
    )
  return (
    <g transform={`translate(${p.x},${p.y})`}>
      <g className="cf-x" style={{ "--dx": `${p.dx}px`, "--t": `${p.t}s`, "--d": `${p.d}s` } as CSSProperties}>
        <g className="cf-y" style={{ "--up": `${p.up}px`, "--dy": `${p.dy}px`, "--t": `${p.t}s`, "--d": `${p.d}s` } as CSSProperties}>
          <g className="cf-r" style={{ "--rot": `${p.rot}deg`, "--t": `${p.t}s`, "--d": `${p.d}s` } as CSSProperties}>
            {shape}
          </g>
        </g>
      </g>
    </g>
  )
}

export function HeroFilm() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    // The inline driver (rendered after the <figure>) starts the film at HTML
    // parse time, before this bundle loads. It flags itself on a JS PROPERTY
    // (not a DOM attribute — an attribute would trip React's hydration diff);
    // when present, this effect defers and no-ops so the timeline is never
    // double-driven. It stays as a fallback for the case where the inline script
    // was blocked.
    if ((root as unknown as { __hfDriver?: number }).__hfDriver) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const setCaps = (b: number) => {
      root.querySelectorAll<HTMLElement>(".capline").forEach((el) => el.removeAttribute("data-on"))
      const id = CAPS[b]
      if (id) root.querySelector<HTMLElement>(`[data-cap="${id}"]`)?.setAttribute("data-on", "true")
    }

    if (reduce) {
      // hold the resolved still frame; the media block carries the visuals
      root.setAttribute("data-beat", "8")
      setCaps(8)
      return
    }

    let timers: ReturnType<typeof setTimeout>[] = []
    const clearAll = () => {
      timers.forEach(clearTimeout)
      timers = []
    }

    const run = () => {
      clearAll()
      root.setAttribute("data-beat", "0")
      setCaps(0)
      root.setAttribute("data-idle", "1")
      // restart the ticker cleanly on each loop
      root.removeAttribute("data-playing")
      void root.offsetWidth
      root.setAttribute("data-playing", "true")
      MARKS.forEach((m) => {
        timers.push(
          setTimeout(() => {
            if (m.b === "loop") {
              run()
              return
            }
            // clearing the idle a frame early is the snap rule: at 5400ms every
            // loop is at 0°, so nothing moves; 60ms later the pose change transitions.
            if (m.b === "still") {
              root.removeAttribute("data-idle")
              return
            }
            root.setAttribute("data-beat", String(m.b))
            setCaps(m.b)
          }, m.t)
        )
      })
    }
    const stop = () => {
      clearAll()
      root.removeAttribute("data-playing")
    }

    // off-screen = stopped; restart on return (matters on the stacked mobile hero)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) run()
        else stop()
      },
      { threshold: 0.15 }
    )
    io.observe(root)

    return () => {
      io.disconnect()
      clearAll()
    }
  }, [])

  return (
    <>
    <figure
      ref={rootRef}
      className="filmfig"
      id="hero-film"
      data-beat="0"
      data-idle="1"
      data-playing="true"
      // The inline driver mutates data-beat/idle/playing on this element and
      // data-on on the caplines below, starting BEFORE hydration. This is the
      // sanctioned way to tell React those out-of-band mutations are intentional
      // so it neither warns nor tears down the subtree the driver holds a ref to.
      suppressHydrationWarning
      style={{ "--dur": "25.4s" } as CSSProperties}
    >
      <div className="filmstage">
      <svg
        viewBox="-60 26 700 378"
        role="img"
        aria-label="An applicant buried in paperwork puts their head down; a sweep of light reorganises the desk into the Gun License NYC dashboard, which tracks every document and names the next step; the license issues."
      >
        <defs>
          <linearGradient id="hf-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F3EDE1" />
            <stop offset="100%" stopColor="#E2D8C5" />
          </linearGradient>
          <linearGradient id="hf-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D8CDB7" />
            <stop offset="100%" stopColor="#C9BCA2" />
          </linearGradient>
          <linearGradient id="hf-coldbg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#111419" />
            <stop offset="100%" stopColor="#06070A" />
          </linearGradient>
          <linearGradient id="hf-sweepg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--brass)" stopOpacity="0" />
            <stop offset="70%" stopColor="var(--brass-bright)" stopOpacity=".5" />
            <stop offset="100%" stopColor="#FFF6E2" stopOpacity="1" />
          </linearGradient>
          <radialGradient id="hf-glare">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".85" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hf-lamp">
            <stop offset="0%" stopColor="var(--brass)" stopOpacity=".32" />
            <stop offset="100%" stopColor="var(--brass)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hf-halo">
            <stop offset="0%" stopColor="var(--brass)" stopOpacity=".72" />
            <stop offset="62%" stopColor="var(--brass)" stopOpacity=".14" />
            <stop offset="100%" stopColor="var(--brass)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hf-deskshadow">
            <stop offset="0%" stopColor="#8A7B60" stopOpacity=".55" />
            <stop offset="100%" stopColor="#8A7B60" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hf-screenglow">
            <stop offset="0%" stopColor="var(--signal)" stopOpacity=".10" />
            <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
          </radialGradient>
          {/* two vignettes — the room falls off toward the corners like a real
              over-lit desk. Lighting, not edge-hiding: tops out at .44. */}
          <radialGradient id="hf-vignA" cx="56%" cy="47%" r="74%">
            <stop offset="0%" stopColor="#100C06" stopOpacity="0" />
            <stop offset="46%" stopColor="#100C06" stopOpacity="0" />
            <stop offset="70%" stopColor="#100C06" stopOpacity=".08" />
            <stop offset="88%" stopColor="#100C06" stopOpacity=".26" />
            <stop offset="100%" stopColor="#100C06" stopOpacity=".44" />
          </radialGradient>
          <radialGradient id="hf-vignB" cx="56%" cy="47%" r="74%">
            <stop offset="0%" stopColor="#05060A" stopOpacity="0" />
            <stop offset="48%" stopColor="#05060A" stopOpacity="0" />
            <stop offset="72%" stopColor="#05060A" stopOpacity=".08" />
            <stop offset="90%" stopColor="#05060A" stopOpacity=".26" />
            <stop offset="100%" stopColor="#05060A" stopOpacity=".44" />
          </radialGradient>
        </defs>

        <g className="cam">
          {/* ══════════ WORLD A · THE PAPER ROOM ══════════ */}
          <g className="world-mess">
            <rect x={-150} width={940} height={480} fill="url(#hf-wall)" />
            <ellipse cx={300} cy={118} rx={380} ry={205} fill="url(#hf-glare)" opacity=".5" />
            <rect x={-150} y={326} width={940} height={154} fill="url(#hf-floor)" />
            <rect x={-150} y={322} width={940} height={5} fill="#B9AA8D" opacity=".5" />

            {/* the three problems hanging over the desk */}
            <g>
              <g transform="translate(252,84)">
                <g className="prob" style={{ "--i": 0 } as CSSProperties}>
                  <g className="bobber" style={{ "--i": 0 } as CSSProperties}>
                    <rect width={54} height={48} rx={6} fill="#FFFDF8" stroke="#C3B7A0" />
                    <rect width={54} height={13} rx={6} fill="#DED4BF" />
                    <rect y={7} width={54} height={6} fill="#DED4BF" />
                    <rect x={14} y={3} width={5} height={8} rx={2.5} fill="#B0A186" />
                    <rect x={35} y={3} width={5} height={8} rx={2.5} fill="#B0A186" />
                    <rect x={9} y={21} width={9} height={7} rx={1.5} fill="#D2C7B0" />
                    <rect x={22} y={21} width={9} height={7} rx={1.5} fill="#D2C7B0" />
                    <circle className="red" cx={38} cy={34} r={9} fill="var(--danger)" />
                  </g>
                </g>
              </g>
              <g transform="translate(392,66)">
                <g className="prob" style={{ "--i": 1 } as CSSProperties}>
                  <g className="bobber" style={{ "--i": 1 } as CSSProperties}>
                    <rect width={48} height={58} rx={4} fill="#FFFDF8" stroke="#C3B7A0" />
                    <rect x={9} y={10} width={30} height={3} rx={1.5} fill="#C9BEA8" />
                    <rect x={9} y={18} width={24} height={3} rx={1.5} fill="#C9BEA8" />
                    <rect x={9} y={26} width={30} height={3} rx={1.5} fill="#C9BEA8" />
                    <path d="M10 47 h28" stroke="#C3B7A0" strokeWidth={1.3} />
                    <text className="red t" x={24} y={44} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--danger)">?</text>
                  </g>
                </g>
              </g>
              <g transform="translate(506,92)">
                <g className="prob" style={{ "--i": 2 } as CSSProperties}>
                  <g className="bobber" style={{ "--i": 2 } as CSSProperties}>
                    <circle cx={24} cy={32} r={20} fill="none" stroke="#C3B7A0" strokeWidth={2.4} />
                    <circle cx={24} cy={32} r={12} fill="none" stroke="#C9BEA8" strokeWidth={1.3} />
                    <rect x={19} y={0} width={10} height={14} rx={3} fill="#C3B7A0" />
                    <circle className="red" cx={42} cy={15} r={7} fill="var(--danger)" />
                  </g>
                </g>
              </g>
            </g>

            <rect x={58} y={220} width={13} height={106} rx={6} fill="#B7A88C" />
            <rect x={58} y={300} width={52} height={11} rx={5} fill="#B7A88C" />

            {/* twenty-four sheets, arriving, behind the person */}
            <g>
              {PAPER.map((p) => (
                <Sheet key={p.i} p={p} idx={p.i} />
              ))}
            </g>

            {/* the person */}
            <g>
              <Rig scope="m" ink="#2A2318" cut="#EEE7DA" />
            </g>

            {/* the desk */}
            <ellipse cx={270} cy={322} rx={340} ry={16} fill="url(#hf-deskshadow)" />
            <rect x={-150} y={306} width={756} height={12} rx={3} fill="#C8B695" />
            <rect x={-150} y={306} width={756} height={4} rx={2} fill="#DCCDAF" />
            <rect x={-150} y={318} width={756} height={15} fill="#9C8A6C" />
            <rect x={70} y={333} width={15} height={86} fill="#A69475" />
            <rect x={556} y={333} width={15} height={86} fill="#A69475" />

            <g>
              {FLOOR.map((p) => (
                <Sheet key={`f${p.i}`} p={p} idx={p.i} />
              ))}
            </g>
            {/* vignette — last, over everything in this world */}
            <rect x={-150} y={4} width={940} height={476} fill="url(#hf-vignA)" />
          </g>

          {/* ══════════ WORLD B · THE SYSTEM ══════════ */}
          <g className="world-order">
            <rect x={-150} width={940} height={480} fill="url(#hf-coldbg)" />
            <ellipse cx={380} cy={215} rx={340} ry={205} fill="url(#hf-lamp)" opacity=".8" />
            <ellipse cx={400} cy={226} rx={230} ry={150} fill="url(#hf-screenglow)" />

            {/* the same three problems, resolved — same objects, same places, green */}
            <g>
              <g transform="translate(252,84)">
                <g className="fix" style={{ "--i": 0 } as CSSProperties}>
                  <rect width={54} height={48} rx={6} fill="#141922" stroke="rgba(74,222,128,.4)" />
                  <rect width={54} height={13} rx={6} fill="#1D2430" />
                  <rect y={7} width={54} height={6} fill="#1D2430" />
                  <rect x={9} y={21} width={9} height={7} rx={1.5} fill="#2A323E" />
                  <rect x={22} y={21} width={9} height={7} rx={1.5} fill="#2A323E" />
                  <circle cx={38} cy={34} r={9} fill="rgba(74,222,128,.16)" />
                  <g transform="translate(38,34)">{GREEN_CHECK}</g>
                </g>
              </g>
              <g transform="translate(392,66)">
                <g className="fix" style={{ "--i": 1 } as CSSProperties}>
                  <rect width={48} height={58} rx={4} fill="#141922" stroke="rgba(74,222,128,.4)" />
                  <rect x={9} y={10} width={30} height={3} rx={1.5} fill="#2A323E" />
                  <rect x={9} y={18} width={24} height={3} rx={1.5} fill="#2A323E" />
                  <rect x={9} y={26} width={30} height={3} rx={1.5} fill="#2A323E" />
                  <path d="M12 44 q7-7 12 0 t12-2" stroke="var(--ok)" strokeWidth={1.8} fill="none" strokeLinecap="round" />
                  <path d="M10 50 h28" stroke="#2A323E" strokeWidth={1.3} />
                </g>
              </g>
              <g transform="translate(506,92)">
                <g className="fix" style={{ "--i": 2 } as CSSProperties}>
                  <circle cx={24} cy={32} r={20} fill="none" stroke="var(--ok)" strokeWidth={2.4} opacity=".55" />
                  <circle cx={24} cy={32} r={12} fill="none" stroke="#2A323E" strokeWidth={1.3} />
                  <rect x={19} y={0} width={10} height={14} rx={3} fill="#2A323E" />
                  <circle cx={42} cy={15} r={7} fill="rgba(74,222,128,.16)" />
                  <g transform="translate(42,15)">{GREEN_CHECK}</g>
                </g>
              </g>
            </g>

            <rect x={58} y={220} width={13} height={106} rx={6} fill="#1B202A" />
            <rect x={58} y={300} width={52} height={11} rx={5} fill="#1B202A" />

            {/* the same person, sitting back, hands off the desk */}
            <g>
              <Rig scope="o" ink="#232A35" cut="#0B0E13" />
            </g>

            {/* ══ THE SCREEN — this is the product ══ */}
            <g transform="translate(256,152)">
              <rect x={-8} y={-8} width={304} height={166} rx={12} fill="#0D1015" stroke="rgba(255,255,255,.16)" />
              <rect width={288} height={150} rx={7} fill="#10131A" />
              <rect x={123} y={158} width={42} height={12} fill="#0D1015" />
              <rect x={96} y={166} width={96} height={7} rx={3.5} fill="#191E26" />

              <g className="screencontent">
                {/* our name, on our product */}
                <circle cx={14} cy={13} r={5.4} fill="none" stroke="var(--brass)" strokeWidth={1.3} />
                <circle cx={14} cy={13} r={1.9} fill="var(--brass-bright)" />
                <text className="t" x={25} y={15.6} fontSize={6.6} letterSpacing=".1em" fill="#CFD4DD" fontWeight={500}>GUN LICENSE NYC</text>
                <rect x={218} y={6.5} width={66} height={13.5} rx={4} fill="rgba(95,208,224,.11)" stroke="rgba(95,208,224,.3)" strokeWidth={0.7} />
                <circle className="live" cx={227} cy={13.2} r={2.5} fill="var(--signal)" />
                <text className="t" x={234} y={15.6} fontSize={5.6} letterSpacing=".12em" fill="#7FC9D6">WE&rsquo;RE ON IT</text>
                <line x1={0} y1={26} x2={288} y2={26} stroke="#1B2029" strokeWidth={1} />

                {/* where you actually are */}
                <text className="t" x={14} y={38.5} fontSize={5.6} letterSpacing=".17em" fill="#6B7280">YOUR APPLICATION</text>
                <text className="t stg stg-a" x={274} y={38.5} textAnchor="end" fontSize={5.6} letterSpacing=".12em" fill="var(--brass)">STAGE 7 OF 13</text>
                <text className="t stg stg-b" x={274} y={38.5} textAnchor="end" fontSize={5.6} letterSpacing=".12em" fill="var(--brass)">STAGE 10 OF 13</text>
                <text className="t stg stg-c" x={274} y={38.5} textAnchor="end" fontSize={5.6} letterSpacing=".12em" fill="var(--ok)">STAGE 13 OF 13</text>
                <rect x={14} y={44} width={260} height={5} rx={2.5} fill="#1B2028" />
                <rect className="railfill" x={14} y={44} width={260} height={5} rx={2.5} fill="var(--brass)" />

                {/* the list */}
                <g>
                  {ROWS.map((label, i) => {
                    const y = 56 + i * 14.6
                    return (
                      <g className="row" key={label} style={{ "--i": i } as CSSProperties}>
                        <rect x={14} y={y} width={260} height={13} rx={4} fill="#161A22" />
                        <text className="ts rowlab" x={24} y={y + 9.2} fontSize={6.6} fill="#4C5462">{label}</text>
                        <g transform={`translate(263,${y + 6.5})`}>
                          <g className="rowtick">
                            <circle r={5.4} fill="rgba(74,222,128,.16)" />
                            <path d="M-2.6 0 l1.9 2.2 3.9-4.6" stroke="var(--ok)" strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                          </g>
                        </g>
                      </g>
                    )
                  })}
                </g>

                {/* the one thing to do next — YOUR MOVE (we don't book it; §8.2) */}
                <g transform="translate(14,117)">
                  <g className="nextcard">
                    <rect width={260} height={31} rx={7} fill="rgba(201,162,75,.10)" stroke="rgba(201,162,75,.45)" strokeWidth={0.9} />
                    <text className="t" x={11} y={12.5} fontSize={5.2} letterSpacing=".2em" fill="var(--signal)">NEXT UP &mdash; YOUR MOVE</text>
                    <text className="ts" x={11} y={24} fontSize={7.4} fontWeight={600} fill="var(--brass-bright)">Live-fire qualification &middot; Thu 9:40am</text>
                    <rect x={200} y={8} width={50} height={15} rx={5} fill="var(--brass)" />
                    <text className="t" x={225} y={18.4} textAnchor="middle" fontSize={5.6} letterSpacing=".1em" fontWeight={700} fill="#141209">CONFIRM</text>
                  </g>
                </g>
                {/* … and then nothing left on it */}
                <g transform="translate(14,117)">
                  <g className="donecard">
                    <rect width={260} height={31} rx={7} fill="rgba(74,222,128,.09)" stroke="rgba(74,222,128,.45)" strokeWidth={0.9} />
                    <circle cx={24} cy={15.5} r={8.4} fill="rgba(74,222,128,.16)" />
                    <g transform="translate(24,15.5)">
                      <path d="M-3.6 .2 l2.6 3 5.2-6.2" stroke="var(--ok)" strokeWidth={2.1} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                    <text className="t" x={41} y={13} fontSize={5.2} letterSpacing=".2em" fill="var(--signal)">EVERY STAGE CLEARED</text>
                    <text className="ts" x={41} y={24.5} fontSize={7.4} fontWeight={600} fill="#DDE3EA">Nothing left on your list.</text>
                  </g>
                </g>
              </g>
            </g>

            {/* the desk */}
            <rect x={-150} y={306} width={756} height={12} rx={3} fill="#272C35" />
            <rect x={-150} y={306} width={756} height={3} rx={1.5} fill="#333944" />
            <rect x={-150} y={318} width={756} height={15} fill="#13161C" />
            <rect x={70} y={333} width={15} height={86} fill="#101319" />
            <rect x={556} y={333} width={15} height={86} fill="#101319" />
            <rect x={-150} y={412} width={940} height={68} fill="var(--bg)" />

            {/* confetti behind the card */}
            <g>
              {CONFETTI_BACK.map((p) => (
                <Confetti key={p.i} p={p} />
              ))}
            </g>

            {/* ══ THE LICENSE ══ (wording attorney-cleared; §8.1) */}
            <g transform="translate(204,150)">
              <g className="lic">
                <ellipse className="lichalo" cx={116} cy={66} rx={200} ry={150} fill="url(#hf-halo)" />
                <rect width={232} height={132} rx={10} fill="#F4F2EE" />
                <path d="M0 10 a10 10 0 0 1 10-10 h212 a10 10 0 0 1 10 10 v18 H0 z" fill="var(--brass)" />
                <text className="t" x={14} y={20.5} fontSize={8.4} letterSpacing=".14em" fontWeight={700} fill="#141209">NYC PISTOL LICENSE</text>
                <rect x={196} y={9} width={22} height={9} rx={4.5} fill="#0B0A07" opacity=".32" />
                <rect width={232} height={132} rx={10} fill="none" stroke="var(--brass)" strokeWidth={1.6} />
                <rect x={16} y={42} width={54} height={62} rx={4} fill="#D9D4C9" />
                <circle cx={43} cy={63} r={10} fill="#BFB8A9" />
                <path d="M25 96 q18-22 36 0 z" fill="#BFB8A9" />
                <rect x={82} y={44} width={98} height={8} rx={4} fill="#14120E" />
                <rect x={82} y={61} width={126} height={5} rx={2.5} fill="#8A8580" />
                <rect x={82} y={73} width={104} height={5} rx={2.5} fill="#8A8580" />
                <rect x={82} y={85} width={80} height={5} rx={2.5} fill="#8A8580" />
                <text className="t" x={16} y={118} fontSize={6} letterSpacing=".12em" fill="#8A8580">ISSUED BY THE NYPD LICENSE DIVISION</text>
                <g transform="translate(192,98)">
                  <circle r={18} fill="none" stroke="var(--brass-deep)" strokeWidth={1.5} />
                  <circle r={11.5} fill="none" stroke="var(--brass-deep)" strokeWidth={0.9} />
                  <circle r={3.8} fill="var(--brass)" />
                  <g>
                    {SEAL_TICKS.map((s, i) => (
                      <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="var(--brass-deep)" strokeWidth={0.9} />
                    ))}
                  </g>
                </g>
              </g>
            </g>

            {/* and confetti in front of it */}
            <g>
              {CONFETTI_FRONT.map((p) => (
                <Confetti key={p.i} p={p} />
              ))}
            </g>
            {/* vignette — last, over everything in this world */}
            <rect x={-150} y={4} width={940} height={476} fill="url(#hf-vignB)" />
          </g>

          {/* ══ THE SWEEP ══ */}
          <g className="sweep">
            <g className="sweepbar">
              <rect x={640} width={4} height={480} fill="#FFF6E2" />
              <rect x={548} width={96} height={480} fill="url(#hf-sweepg)" opacity=".8" />
            </g>
          </g>
        </g>
        {/* /cam */}
      </svg>
      </div>

      <figcaption className="fcap">
        <div className="fcapin">
          <span suppressHydrationWarning className="capline" data-cap="c1">
            A NYC gun license takes <b>24 documents.</b>
          </span>
          <span suppressHydrationWarning className="capline" data-cap="c2">
            And it gets <b>messy, fast.</b>
          </span>
          <span suppressHydrationWarning className="capline" data-cap="c3">
            So we <b>simplified it.</b>
          </span>
          <span suppressHydrationWarning className="capline" data-cap="c4">
            We track, verify and chase <b>every step</b> &mdash;
          </span>
          <span suppressHydrationWarning className="capline" data-cap="c5">
            <b>right through to the last one.</b>
          </span>
          <span suppressHydrationWarning className="capline" data-cap="c6">
            <b>Until you&rsquo;re licensed.</b>
          </span>
        </div>
        <div className="fticker" aria-hidden>
          <i />
        </div>
      </figcaption>
    </figure>
    {/* Runs at parse time (immediately after the figure above), before the
        bundle loads — this is what starts the film without a click. */}
    <script dangerouslySetInnerHTML={{ __html: FILM_DRIVER }} />
    </>
  )
}
