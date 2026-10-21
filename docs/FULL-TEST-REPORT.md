# dsh-structured 0.7.3 — Full Test Report

- **Date / environment**: 2026-10-21 16:15–16:35 +08:00 · Windows · DSH CLI `0.1.7-rc.2` · desktop profile (Electron, plugin 0.7.3 applied) · `structured-test` profile (base + headless, 0.7.3) · model `deepseek-official/deepseek-flash` (reasoning high) · Node `v24.15.0` / npm `11.15.0`.
- **Verdict**: **PASS WITH DEFECTS** — 0.7.3 fixes the 0.6.2 P0/P1 issues (no-label title, card-aware prose metric, hot state reload, clean uninstall, GenUI env pollution, publish metadata). Remaining gaps are visual evidence and publish prerequisites, not host-contract failures.
- **Stance**: zero-trust. Every claim below was re-run locally. No `src/`, `lib/`, `test/`, or `cordis.patch.yml` edits; desktop profile untouched; no publish. Test profile was modified and its state restored from backup.

---

## T1 — Static and build

| Check | Command | Result | Status |
| --- | --- | --- | --- |
| Unit tests | `npm test` | `tests 30 / pass 30 / fail 0` (0.107 s) | ✅ PASS |
| Desktop preflight | `node scripts/desktop-check.mjs` | all rows PASS; "desktop 兼容性预检通过" | ✅ PASS |
| Syntax | `node --check src/index.js` / `src/client.js` | exit 0 / exit 0 | ✅ PASS |
| Pack file list | `npm pack --dry-run --json` | 29 files; includes `lib/index.js`, `lib/client.js`, `cordis.patch.yml`, `icon.svg`, `locale/en.json`, `locale/zh.json`, `README.md`, `LICENSE`; excludes `node_modules/`, `*.tgz`, `.tools/`, `artifacts/`, `docs/FULL-TEST-*.md` | ✅ PASS |
| No secrets / local absolute paths in packed files | grep over packed docs/src/scripts | 0 secret patterns; 0 `C:\`/`G:\` absolute paths | ✅ PASS |

Evidence: `artifacts/full-test-20261021-1615/t1-npm-test.log`, `t1-checks.log`, `t1-pack.json`.

`npm test` regenerated `lib/`; the resulting hashes match the installed 0.7.3 package in both test and desktop profiles (`lib/index.js` `9cdcde81…`, `lib/client.js` `f5739025…`).

---

## T2 — Host contract (`structured-test`, headless)

| # | Case | Evidence | Status |
| --- | --- | --- | --- |
| 1 | `/structured status` shows default on, state path, GenUI detection | real handler via simulated host invocation; "新会话默认：开启 / 状态文件：…state.json / GenUI 联动：未检测（纯 markdown fallback）"; also reports "视觉层：始终开启" | ✅ PASS (dispatch simulated) |
| 2 | `/structured off` → same session next turn 0 hits; `/structured on` restores | session `8d58e2cf…`: turn1 main `hits 1`; turn2 off main `hits 0`, title `hits 0`; turn3 on main `hits 1` | ✅ PASS |
| 3 | New session default on; state survives process restart | turn1 was fresh with no state entry → injection; turns 2/3 in separate `dsh` processes read the same `state.json` | ✅ PASS |
| 4 | `style.md` overrides; delete falls back | custom marker `hits 1`; after delete marker `hits 0`, built-in `hits 1` | ✅ PASS |
| 5 | Corrupt `state.json` → fail-open | `{ bad json`; headless `EXIT=0`; system message `hits 1`; no turn failure | ✅ PASS |
| 6 | Subagent skipped by default; `includeSubagents: true` injects | real subagent `41e2402a…` (`origin: subagent`, depth 1): main `hits 0`; with patch `includeSubagents: true`, subagent `881aa4d6…`: main `hits 1` | ✅ PASS |
| 7 | GenUI `auto` / `on` / `off` | auto `hits 0`; on `hits 1`; off `hits 0` (grep `dsh-ui`) | ✅ PASS |
| 8 | No `producer-owned` error | 12/12 T4 sessions `turn/end=completed`; all T2 sessions completed; stderr grep 0 | ✅ PASS |

Additional fix verification:
- **No-label contract**: injected system text contains `> **一句标题**`, contains "不要写「结论」标签", and **does not contain `> **结论**`** (`t2-label.json` / `t2-nolabel.json`).
- **State hot reload**: in-process harness: section 709 chars → external `state.json` false → 0 chars → external true → 709 chars, without restart (`artifacts/.../t2-hot-reload.log`).
- Unrelated environment anomaly: `session-6c1509e1…` (not one of our runs, created earlier) ended with `TRANSPORT` ("DeepSeek Messages transport failed"), not `producer-owned`; excluded from T2.

Evidence: `artifacts/full-test-20261021-1615/t2-*.json` / `t2-*.log` / `t2-our-turn-status.txt`.

> Caveat: headless does not dispatch slash commands. Cases 1–3 use the plugin's real handler and real `state.json` via `.tools/toggle.mjs`; only the host invocation is simulated. Real composer dispatch remains unverified.

---

## T3 — Visual acceptance (desktop)

The current desktop was on the Usage Stats page; I did **not** switch sessions or click the app (foreground was disturbed in the prior audit). The only live 0.7.3 visual evidence is a **provided screenshot** from `artifacts/final-0.7.3/screen-01.png` (created 14:42, inspected here, not captured by this run). Raw reply for that screenshot: `session-8d072f9a…` (1,203 chars) — first line is a no-label title blockquote; the table and "三个坑" callout are inside a ` ```dsh-ui ` fence (GenUI), not plugin markdown.

| # | File | Status | Notes |
| --- | --- | --- | --- |
| — | `00-current-desktop.png` | captured by this run | desktop on Usage Stats; no conversation |
| 01 | `01-cards-light-provided.png` (provided) | ⚠️ PARTIAL | no-label title card (16px/700) + `表格结论：` lead + GenUI table/callout; no plugin markdown status table / next card |
| 02 | `02-cards-dark.png` | ⚠️ NOT AVAILABLE | would require changing the live theme |
| 03 | `03-status-table.png` | ⚠️ NOT AVAILABLE | no markdown status-table in the provided view |
| 04 | `04-code-block.png` | ⚠️ NOT AVAILABLE | no fenced code block in the provided view |
| 05 | `05-long-content.png` | ⚠️ NOT AVAILABLE | provided table is 5 data rows; no ≥10-row / ≥30-line code |
| 06 | `06-genui-adjacent.png` (provided crop) | ✅ PASS | raw reply is a `dsh-ui` table + warning callout next to markdown; visually distinct, no double styling |
| 07 | `07-narrow-window.png` | ⚠️ NOT AVAILABLE | would resize the live window |
| 08 | `08-before-after.png` | ⚠️ NOT AVAILABLE | no 0.5.0 screenshot; not fabricated |

Static CSS contract (`src/client.js`):
- title card `16px/700` (line 214), action label `13px` (line 199), body `15.5px` (line 217), plain lead `16.5px/600` (lines 185–189) — **PASS static**.
- status column `68px` (lines 115–117) — present in CSS, but **not live-verified**; the provided table is GenUI, so T3 status-column acceptance is blocked.
- `isStatementCard()` recognizes a one-`<p>` `<strong>title</strong> + body` and multi-`<p>` forms; plain first blockquotes without a title become lead cards. `max 2 cards` is prompt-only; no runtime cap (observed max 2 in T4).
- GenUI guard checks `[data-genui]`; installed GenUI roots carry `data-genui`; no double styling observed in the provided screenshot.

**T3 verdict: BLOCKED** — title card/GenUI/table lead partially verified; 5/8 screenshot cases unavailable. No visual FAIL evidence.

---

## T4 — Conversation sample (12 fresh sessions)

Same test profile, `deepseek-flash`, 12 prompts, all turns completed.

| # | Chars | Card blocks | Table lines | `表格结论` | Code blocks | First line |
| --- | ---: | ---: | ---: | --- | ---: | --- |
| 01 | 936 | 2 | 7 | yes | 1 | `> **Windows 上默认…**` |
| 02 | 829 | 1 | 7 | yes | 1 | `> **Boss，重启 Desktop…**` |
| 03 | 779 | 2 | 5 | yes | 0 | `> **外部包裹的节点…**` |
| 04 | 1019 | 2 | 0 | n/a | 0 | `> **五步流程…**` |
| 05 | 647 | 2 | 7 | yes | 0 | `> **皮肤没有热开关…**` |
| 06 | 669 | 2 | 5 | yes | 0 | `> **Phase 2 只剩验收…**` |
| 07 | 896 | 1 | 7 | yes | 0 | `> **Boss：形状归卡片…**` |
| 08 | 1089 | 2 | 6 | yes | 1 | `> **宿主改名不会报错…**` |
| 09 | 861 | 2 | 7 | yes | 0 | `> **推荐：CSS 皮肤…**` |
| 10 | 664 | 2 | 7 | yes | 0 | `> **Boss，0.7.3 已装…**` |
| 11 | 542 | 1 | 7 | yes | 0 | `> **最缺的是输出侧校验…**` |
| 12 | 1299 | 2 | 6 | yes | 1 | `> **12 条探针各压…**` |

Summary:
- first-line no-label title card: **12/12 = 100%**; `> **结论**` first line: **0/12** ✅
- empty title: **0/12** ✅
- max emphasis/card blocks: **2** (≤2) ✅
- table lead when table present: **11/11 = 100%** ✅
- status labels: 02/06/07/10/12 carry ✅/⚠️/❌ marks; no contradictory status labels observed (full status-column rendering remains T3-unverified)
- code fences with language tags: **4/4** ✅
- prose rate (exact 12 sessions): **0/12 = 0.0%** ✅
- `node scripts/measure-prose.mjs --since-days 1 --limit 12 --json`: **33.3% (4/12)** — this command samples the older audit session, not the T4 set; not a valid T4 measure.
- length observation: **12/12 final markdown >500 chars** (min 542, max 1299). Table lines include header + separator, i.e. 5 data rows where 7 lines; the ≤5-row rule is respected. The ≤500-character rule is **not met if counted literally** on the whole reply; visible prose may be lower. Flagged as a product risk, not a T4 pass criterion.

Evidence: `artifacts/full-test-20261021-1615/t4/*.jsonl`, `analysis.json`, `prose.json`, `prose-since.json`, `turn-status.txt`.

---

## T5 — Streaming / regression / uninstall

| Case | Result | Status |
| --- | --- | --- |
| Long reply stream (T4 #12, 1299 chars) / 12 replies | all 12 `turn/end completed`; one final per session; no duplicate messages | ✅ PASS (headless) |
| Rapid 5 replies / observer stacking | 12 sessions run concurrently without duplicate finals; client observer not loaded headless | ✅ PASS (headless) |
| `uninstall.mjs --profile structured-test --dry-run` | prints both planned commands; no writes | ✅ PASS |
| Real uninstall | removes package, bundle row, `node_modules/dsh-structured`, and `$DSH_HOME/dsh-structured` | ✅ PASS |
| Reinstall 0.7.3 + injection | new session main `hits 1`; state backup restored afterward | ✅ PASS |

Evidence: `artifacts/full-test-20261021-1615/t5-dryrun.log`, `t5-uninstall.log`, `t5-reinstall-inject.json`.

Live desktop freeze/flicker/console-error checks remain unverified (no session switch).

---

## T6 — Publish readiness (read-only; nothing published)

| Item | Result | Status |
| --- | --- | --- |
| `name` / `version` / `license` / `keywords` incl. `dsh-plugin` / `dsh.bundle` | all present | ✅ PASS |
| `repository` / `homepage` / `bugs` | present (`feigo313/dsh-structured`) | ✅ PASS |
| README install / rollback / verification | present; install no longer uses a local absolute path as the only method | ✅ PASS |
| README screenshots | **no images**; no `screenshots.json` | ❌ FAIL |
| `icon.svg`, `locale/en.json`, `locale/zh.json`, `LICENSE`, `CHANGELOG.md` | all present | ✅ PASS |
| `npm pack` clean | 29 files; no `.tools`/`artifacts`/`FULL-TEST` docs; no secrets/paths | ✅ PASS |
| `.gitignore` | present (`node_modules/`, `.tools/`, `artifacts/`, `*.tgz`, `.DS_Store`) | ✅ PASS |
| Git repo / remote | **not a git repository**; no remote | ⛔ BLOCKED |
| npm name / auth | `dsh-structured` unclaimed on npmjs (404); `npm whoami` → `ENEEDAUTH` | ⛔ BLOCKED (auth) |
| Marketplace | `dsh.bundle` + `dsh-plugin` keyword present; no GitHub repo, no `dsh-plugin` topic, no 1-day age, no `data/plugins/<owner>__<repo>.yml` | ⛔ BLOCKED |

The declared GitHub repo `feigo313/dsh-structured` could not be reached from this network (`git ls-remote` timeout), so its age/topic cannot be verified. Marketplace rules were read from the cloned `awesome-dsh-plugin/awesome-dsh-plugin` `contributing.md`.

**T6 verdict: BLOCKED** (publish prerequisites and screenshots).

---

## Defects / residual risks

### P1 — publish blockers
1. **No local Git repository / remote**: `git status` fails; cannot push, tag, or submit a marketplace entry. `package.json` declares the intended repo, but it does not exist locally.
2. **npm auth missing**: `npm whoami` → `ENEEDAUTH`; name is unclaimed, but publishing would fail.
3. **Marketplace gates unmet**: no repo → no 1-day age, no `dsh-plugin` topic, no YAML entry. These are process blockers, not code defects.

### P2 — product / evidence risks
4. **T3 visual evidence incomplete**: only a provided screenshot (title card + GenUI table/callout); no dark, markdown status table, code block, ≥10-row/30-line content, or narrow-window capture. Status-column CSS (68px) is unverified live; the provided table is GenUI, not the plugin's markdown table.
5. **Reply length**: 12/12 final markdown >500 chars (min 542, max 1299). If TASK's "≤500 字" is literal for the whole reply, the rule is not met; table-row cap is met (5 data rows). This conflicts with the "结构化 ≠ 变长" priority and should be checked on prose-only length or enforced.
6. **`/structured off` is prompt-only**: status text now explicitly says "视觉层：始终开启"; the client always injects the visual layer. This is disclosed, but users expecting "off = plain output" will still see card/table styling.
7. **Max-two-cards is prompt-only**: `decorate()` renders every matching blockquote; no runtime cap. Observed max 2 in T4, but a model emitting 3 would render 3.
8. **Client performance risk**: `decorate(document)` runs on every `MutationObserver` batch (`src/client.js:383–384`) and scans all markdown roots/tables/paragraphs; long streaming replies are O(document) per frame. No measured freeze; T3/T5 visual streaming unverified.
9. **Status-column attribution**: CSS targets `td:first-child` only; the provided live table is GenUI, so the 68px status-column behavior on a real markdown table is unverified.
10. **README/market screenshots missing**: no images, no `screenshots.json`; marketplace storefront falls back to README extraction, which yields nothing.
11. **Compatibility metadata is still decorative** (`package.json:33–40,63`): installed DSH's `evaluatePluginCompatibility` reads only `peerDependencies` on `@deepseek-ai/dsh*` (verified in `@deepseek-ai/dsh-app-boot`); `engines.dsh` and `dsh.compatibility.dshReleases` are not consulted. With no peerDependencies, the plugin installs on any DSH version. Add an explicit prerelease peer range if gating matters.

### Fixed vs 0.6.2 (verified this run)
- P0 no-label contract: injected text has `> **一句标题**`, no `> **结论**`, and says "不要写「结论」标签".
- P1 prose metric: `measure-prose.mjs` counts card lines; exact T4 = 0.0%.
- P1 hot state reload: in-process 709 → 0 → 709 chars.
- P1 uninstall residue: `uninstall.mjs --profile` removes package, bundle row, `node_modules`, and state dir.
- P2 GenUI env pollution: auto detection now relies on `clientModules` only; auto/on/off correct.
- P2 publish metadata: repository/homepage/bugs, `.gitignore`, CHANGELOG present.

---

## Unverified (explicit)

1. Real `/structured` dispatch from the desktop composer (headless handler simulation only).
2. Live dark theme, narrow-window, markdown status table, fenced code block, ≥10-row/30-line content, before/after screenshots.
3. Live desktop streaming freeze/flicker/duplicate-card behavior and console errors.
4. Whether the declared GitHub repo exists, its age, and its `dsh-plugin` topic (network timeout).
5. Marketplace CI result until a repo and YAML entry exist.
6. Literal ≤500-character compliance: totals exceed 500, but a prose-only count is not separately defined by the test brief.

---

## Evidence index

- T1: `artifacts/full-test-20261021-1615/t1-npm-test.log`, `t1-checks.log`, `t1-pack.json`
- T2: `artifacts/full-test-20261021-1615/t2-*`
- T3: `artifacts/full-test-20261021-1615/00-current-desktop.png`, `01-cards-light-provided.png`, `06-genui-adjacent.png`; source: `artifacts/final-0.7.3/screen-01.png`
- T4: `artifacts/full-test-20261021-1615/t4/`
- T5: `artifacts/full-test-20261021-1615/t5-*`
- Marketplace rules: `.tools/awesome-dsh-plugin/contributing.md`

---

## Final counts (top-level)

**PASS 4 / FAIL 0 / BLOCKED 2** — T1 static PASS, T2 host PASS, T3 visual BLOCKED, T4 conversation PASS, T5 uninstall/regression PASS, T6 publish BLOCKED.

**Verdict: PASS WITH DEFECTS; not publishable until T6 prerequisites and screenshots are closed.**
