<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

<!-- BEGIN:project-conventions -->

# Crave — how this repository actually works

## Where the code lives

- `app/` — the Next.js App Router portal and every REST handler under `app/api/`.
- `lib/` — shared server code. Data access goes through `lib/dal/`; money maths is
  `lib/finance/`; dispatch is `lib/dispatch/`; the order state machine is
  `lib/catalog/order-state-machine.ts`.
- `dictionary/` — the translation dictionaries. `en.ts` is the source of truth and every other
  language is typed as `Dictionary`, so a missing key fails the build. `dictionary/react.tsx` is
  the React binding the four native apps share — it is a **store**, not a context, so call
  `useLanguage()` directly instead of adding a provider.
- `admin_app/`, `driver_app/`, `restaurant_app/`, `customer_app/` — the four standalone Capacitor
  React apps. They are not website wrappers.
- `load-tests/` — the k6 load test (`app-load-test.js`) and the abuse / concurrency suite
  (`abuse/`).
- `test/` — `node:test` suites run through `tsx`. The database-backed ones need
  `ALLOW_DATABASE_TESTS=true`, which `pnpm test:db` sets.

## Rules that bite

- **Never recalculate money on the client.** The order's `financial_snapshot` is the source of
  truth for settlement and invoices.
- **The delivery OTP is six digits** and belongs to the customer alone between pickup and
  delivery. `lib/auth/order-access.ts` strips it from every other reader; keep it that way.
- **The order status machine is canonical.** Transition through it, and lean on the optimistic
  lock in `app/api/orders/route.ts` (the `where: { id, status }` write) instead of
  read-then-write.
- **Broadcasts never carry a handover code.** `stripOrderSecrets()` runs over every WS payload.
- **`versionCode` goes up on every build.** `pnpm build:android` raises it so the in-app updater
  offers the new build. Use `KEEP_VERSION=1` to publish the version in `build.gradle` unchanged.
- **A test script needs the native-app header.** The login route only returns a token in the body
  when the request sends `x-crave-native-app`; without it the client is silently unauthenticated.

<!-- END:project-conventions -->
