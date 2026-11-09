export type EligibilityArt = "age" | "location" | "training" | "record" | "history" | "storage"

const trainingSegments = Array.from({ length: 18 }, (_, index) => {
  const start = -Math.PI / 2 + (index / 18) * Math.PI * 2 + 0.05
  const end = start + (Math.PI * 2) / 18 - 0.1
  const radius = 40
  const color = index < 16 ? "#14254A" : "#BF953A"
  return `<path class="art-training-segment" d="M${(radius * Math.cos(start)).toFixed(1)} ${(radius * Math.sin(start)).toFixed(1)}A${radius} ${radius} 0 0 1 ${(radius * Math.cos(end)).toFixed(1)} ${(radius * Math.sin(end)).toFixed(1)}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" style="animation-delay:${(
    0.3 +
    index * 0.05
  ).toFixed(2)}s"/>`
}).join("")

const recordRows = [90, 112, 134, 156]
  .map(
    (y, index) =>
      `<path class="art-thin" d="M98 ${y}h58"/><rect class="art-line" x="76" y="${y - 8}" width="14" height="14" rx="3"/><path class="art-gold art-pop" style="animation-delay:${(
        0.4 +
        index * 0.3
      ).toFixed(1)}s" d="M79 ${y}l3 3 6-7"/>`
  )
  .join("")

const safeTicks = Array.from({ length: 16 }, (_, index) => {
  const angle = (index / 16) * Math.PI * 2
  return `<line class="art-line" x1="${(30 * Math.cos(angle)).toFixed(1)}" y1="${(
    30 * Math.sin(angle)
  ).toFixed(1)}" x2="${(24 * Math.cos(angle)).toFixed(1)}" y2="${(
    24 * Math.sin(angle)
  ).toFixed(1)}" stroke-width="1.6"/>`
}).join("")

export const ELIGIBILITY_ART: Record<EligibilityArt, string> = {
  age: `<svg viewBox="0 0 240 200"><g class="art-float"><rect class="art-white art-line" x="28" y="44" width="170" height="110" rx="14"/><rect class="art-panel" x="28" y="44" width="170" height="26" rx="14"/><rect class="art-panel" x="28" y="58" width="170" height="12"/><circle class="art-panel art-line" cx="72" cy="108" r="22"/><path class="art-line" d="M58 126c4-10 24-10 28 0"/><circle class="art-line" cx="72" cy="102" r="8"/><path class="art-thin" d="M108 98h66M108 114h52M108 130h40"/></g><g class="art-pop"><circle class="art-gold-fill" cx="190" cy="54" r="30"/><circle class="art-gold" cx="190" cy="54" r="30"/><circle class="art-gold" cx="190" cy="54" r="24" stroke-dasharray="3 4" stroke-width="1.6"/><text x="190" y="62" text-anchor="middle" font-family="Bodoni Moda,serif" font-size="24" fill="#14254A">21+</text></g></svg>`,
  location: `<svg viewBox="0 0 240 200"><g transform="translate(120 120)"><path class="art-panel" d="M0-56 96-8 0 40-96-8z"/><path class="art-line" d="M0-56 96-8 0 40-96-8z"/><g class="art-thin"><path d="M-48-32 48 16M-24-44 72 4M24-44-72 4M48-32-48 16"/></g><g class="art-white art-line"><path d="M-62-14v-26l14-7v26z"/><path d="M-48-21v-26l14 7v26z"/></g><g class="art-white art-line"><path d="M30 6v-40l16-8v40z"/><path d="M46-2v-40l16 8v40z"/></g><g class="art-white art-line"><path d="M-10 10v-30l12-6v30z"/><path d="M2 4v-30l12 6v30z"/></g><path class="art-gold art-draw" d="M-80-6C-50 10-30-30 0-20S40 20 70-10"/><g class="art-bob"><path class="art-navy-fill" d="M70-38c-9 0-16 7-16 16 0 12 16 26 16 26s16-14 16-26c0-9-7-16-16-16z"/><circle cx="70" cy="-22" r="6" fill="#D9B25A"/></g><ellipse class="art-gold art-pulse" cx="70" cy="-8" rx="14" ry="5" stroke-width="1.6"/></g></svg>`,
  training: `<svg viewBox="0 0 240 200"><g class="art-float"><rect class="art-white art-line" x="26" y="40" width="130" height="120" rx="10"/><path class="art-thin" d="M46 66h90M46 82h70M46 98h80"/><path class="art-gold" d="M46 124h48"/><circle class="art-gold-fill art-gold" cx="124" cy="132" r="13"/><path class="art-gold" d="M118 144l-4 14 10-5 10 5-4-14" stroke-width="2"/></g><g transform="translate(176 92)"><circle class="art-white" r="46"/>${trainingSegments}<text y="2" text-anchor="middle" font-family="Bodoni Moda,serif" font-size="19" fill="#14254A">16+2</text><text y="18" text-anchor="middle" font-family="IBM Plex Mono" font-size="8" letter-spacing="1.4" fill="#6B7484">HOURS</text></g></svg>`,
  record: `<svg viewBox="0 0 240 200"><g class="art-float"><rect class="art-panel" x="64" y="30" width="120" height="150" rx="10" transform="rotate(6 124 105)"/><rect class="art-white art-line" x="56" y="24" width="120" height="150" rx="10"/><path class="art-thin" d="M76 50h80M76 64h56"/>${recordRows}<g class="art-scan"><rect x="50" y="36" width="132" height="2" fill="#BF953A"/><rect x="50" y="26" width="132" height="12" fill="#BF953A" opacity=".12"/></g></g></svg>`,
  history: `<svg viewBox="0 0 240 200"><circle class="art-gold art-pulse" cx="120" cy="100" r="78" stroke-width="1.2" stroke-dasharray="2 6"/><g class="art-float"><path class="art-panel" d="M120 22l66 22v46c0 46-30 74-66 92-36-18-66-46-66-92V44z"/><path class="art-line" d="M120 22l66 22v46c0 46-30 74-66 92-36-18-66-46-66-92V44z"/><path class="art-white art-line" d="M120 46l44 15v31c0 30-20 49-44 61-24-12-44-31-44-61V61z"/><path class="art-gold art-draw" d="M100 98l14 14 28-30" stroke-width="4"/></g></svg>`,
  storage: `<svg viewBox="0 0 240 200"><g class="art-float"><rect class="art-panel" x="44" y="26" width="152" height="150" rx="16"/><rect class="art-line" x="44" y="26" width="152" height="150" rx="16"/><rect class="art-white art-line" x="58" y="40" width="124" height="122" rx="10"/><g transform="translate(120 101)"><circle class="art-gold-fill art-gold" r="30"/><g class="art-spin">${safeTicks}<line class="art-line" x1="0" y1="0" x2="0" y2="-18" stroke-width="3"/></g><circle r="5" fill="#14254A"/></g><path class="art-line" d="M196 62h8M196 140h8" stroke-width="4"/><path class="art-line" d="M58 176v10M182 176v10" stroke-width="4"/></g></svg>`,
}
