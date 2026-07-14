/**
 * V5b Workstream C — The Refile Promise, stated exactly once and imported
 * everywhere it renders. It is a promise about OUR labor, never about the
 * NYPD's decision.
 *
 * LEGAL (AGENTS.md rule 4): none of the forbidden marketing words appear in or
 * near this copy. The promise never mentions approval, denial, odds, or
 * timelines. It always renders adjacent to `brand.disclaimer`, never in place
 * of it. This copy is why the banned-word guard (tests/copy-guard.test.ts)
 * exists.
 */
export const refilePromise = {
  name: "The Refile Promise",
  short: "If the License Division returns your packet as incomplete, we reassemble it and you refile at no additional charge from us.",
  full:
    "The Refile Promise. If we assemble your filing packet and the License Division returns it as incomplete, we reassemble it and you refile at no additional charge from us. Government fees are set by the City and the State; we do not control them and cannot refund them. This is a promise about our work — not about the outcome of your application. The NYPD retains full investigative discretion.",
} as const
