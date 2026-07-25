// Vitest stub for the `server-only` package. In the app it throws when bundled
// for the client; in node/vitest we want server modules to import freely so we
// can test them. Aliased in vitest.config.ts.
export {}
