/**
 * The consent an applicant affirms when they apply their signature to a
 * document. It lives in its own module so the client-side sign step can show the
 * EXACT text the server records — one string, no drift between what somebody
 * read and what we logged. (Importing it from document-engine would drag pdf-lib
 * and node crypto into the browser bundle.)
 */
export const SIGNING_CONSENT =
  "I am signing this document electronically. I affirm the statements in it are true and complete to the best of my knowledge, and I agree my electronic signature has the same legal effect as a handwritten one."
