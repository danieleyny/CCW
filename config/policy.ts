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
const NAME = "The Refile Promise"

/**
 * `body` is the promise itself, and it is what components render. `full`
 * prefixes the name for contexts that need the promise as one standalone
 * string. They are composed, not copy-pasted — RefilePromise used to hardcode
 * this paragraph inline while its own docstring claimed it read from here, so
 * editing this file changed nothing on screen.
 */
const BODY =
  "If we assemble your filing packet and the License Division returns it as incomplete, we reassemble it and you refile at no additional charge from us. Government fees are set by the City and the State; we do not control them and cannot refund them. This is a promise about our work — not about the outcome of your application. The NYPD retains full investigative discretion."

export const refilePromise = {
  name: NAME,
  short: "If the License Division returns your packet as incomplete, we reassemble it and you refile at no additional charge from us.",
  body: BODY,
  full: `${NAME}. ${BODY}`,
} as const
