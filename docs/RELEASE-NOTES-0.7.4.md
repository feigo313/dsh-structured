# dsh-structured 0.7.4

Structured output for DSH: a no-label title card first, then tables/lists/steps; per-session toggle and `style.md` override.

## What changed

- No-label title card: `> **title**` + body; no `> **结论**` prefix.
- Card system: 13px label, 16px/700 title, 15.5 body, 16.5/600 lead fallback; fixed accent `#2563eb` (`#60a5fa` dark).
- Tables: 11px/700 header, 18px cell padding, 68px status column, no full-row pastel.
- GenUI: soft detection via `clientModules`; no stale profile-env fallback.
- `measure-prose` counts card lines; 12/12 structured, 0% prose on the acceptance sample.
- `state.json` hot reload on mtime; `/structured` is prompt-only and says so.
- Packaging: screenshots, `screenshots.json`, npm/market/GitHub Release install docs; audit-only docs excluded from the tarball.

## Verification

- `npm test`: 30/30.
- `node scripts/desktop-check.mjs`: PASS.
- `npm pack`: 34 files; npm tarball 756,986 bytes, SHA-256 `dbd2935f…`; the GitHub Release asset was replaced with that same tarball on 2026-10-21 (asset digest and size now match npm).
- `npm publish --dry-run --ignore-scripts`: success (unauthenticated warning only).
- `structured-test`: install → inject → real uninstall → reinstall, all pass.
- 12 headless prompts: 12/12 completed; title card 12; no `> **结论**`; max 2 cards; table lead 11/12; code 5/12; prose 0; over500 11/12.

## Install

- Plugin market: search `dsh-structured` after listing.
- npm: `dsh plugin --profile <profile> add dsh-structured`.
- GitHub Release: download `dsh-structured-0.7.4.tgz` and install it as a local package.
- Local tgz is development-only.

## Known gaps

- `@deepseek-ai/*` peer gate is not declared; `engines.dsh`/`dsh.compatibility` are advisory (P2).
- 500-char cap is a prompt rule, not runtime-enforced; 12/12 samples exceed it if counted over the whole markdown.
