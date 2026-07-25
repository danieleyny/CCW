// Load .env.local into process.env BEFORE any test module imports — so modules
// that read env at eval time (lib/stripe's STRIPE_ENABLED) see the local keys.
// A no-op in CI where the file is absent. Wired via setupFiles in vitest.config.
import { config } from "dotenv"
config({ path: ".env.local" })
