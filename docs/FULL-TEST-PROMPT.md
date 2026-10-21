# Full acceptance test — dsh-structured 0.7.3

You are an **independent verifier**. Do not edit `src/`, `lib/`, `test/`, or `cordis.patch.yml`. Do not publish to GitHub, npm, or the plugin market. Produce evidence; do not weaken tests or claim unverified results.

## Environment

- Repo: `G:\dsh-structured` · version `0.7.3` · desktop-first DSH plugin.
- Desktop is Electron. **Never ask the user to press F5/refresh a browser.** Client loading is app-managed; if a reload is needed, use `plugin_manager`/app-side restart, not a browser refresh.
- Desktop profile already has `dsh-structured 0.7.3` applied (`file:G:/dsh-structured/dsh-structured-0.7.3.tgz`).
- Test profile `structured-test` exists (`dsh-base` + `dsh-headless`). Update it to 0.7.3 before host-only tests:
  `dsh plugin --profile structured-test add "G:\dsh-structured\dsh-structured-0.7.3.tgz"`
- Do not modify the desktop profile. Do not install/uninstall other plugins. Do not touch `~/.dsh/AGENTS.md` or user memory.

## Deliverables

1. `G:\dsh-structured\docs\FULL-TEST-REPORT.md` with commands, pass/fail table, defects, screenshot paths, blockers.
2. `G:\dsh-structured\artifacts\full-test-<YYYYMMDD-HHMM>\` containing screenshots.
3. A final message: 3-line summary + report path + count of pass/fail/blocked.

## T1 — Static and build

Run and capture exact output:

```powershell
cd G:\dsh-structured
npm test
node scripts/desktop-check.mjs
node --check src/index.js
node --check src/client.js
npm pack --dry-run --json
```

Pass criteria:
- 30/30 tests, 0 failures.
- desktop preflight PASS.
- `npm pack --dry-run` includes `lib/index.js`, `lib/client.js`, `cordis.patch.yml`, `icon.svg`, `locale/en.json`, `locale/zh.json`, `README.md`, `LICENSE`; excludes `node_modules/`, `*.tgz`, `.tools/`, `artifacts/`.
- No secrets, tokens, local absolute paths in the packed files.

## T2 — Host contract

Use `structured-test` profile (headless). Test:
1. `/structured status` shows default on, state path, GenUI detection.
2. `/structured off` → same session next turn has no `dsh-structured:style` / reminder text; `/structured on` restores.
3. New session default on; state survives process restart.
4. `style.md` non-empty fully overrides built-in; deleting it falls back.
5. Corrupt `state.json` → plugin still works, fail-open; no turn failure.
6. Subagent session (`header.origin: 'subagent'`) is skipped by default; `includeSubagents: true` injects.
7. GenUI: `genui: auto` on the test profile → no `dsh-ui` line (not installed); `genui: on` → line appears; `genui: off` → no line.
8. Session log contains no `producer-owned` error.

Commands:

```powershell
dsh --profile structured-test "状态检查：/structured status"
dsh --profile structured-test --json "用一句话说明当前插件是否生效"
node scripts/session-inspect.mjs --last-system --grep "结构化输出（本会话已启用" --json
node scripts/session-inspect.mjs --last-system --grep "一句标题" --json
node scripts/session-inspect.mjs --last-system --grep "producer-owned" --json
```

## T3 — Visual acceptance (desktop)

Use the current desktop app; do not refresh it. Open a conversation that shows:
- title card (16px/700 bold title, no "结论" label, 15.5 body); a plain first blockquote must still render as a 16.5px/600 lead card with icon and accent border;
- metric card;
- risk card;
- next-step card;
- table with `**表格结论：**` lead, 68px status column, `✅ 完成` / `⚠️ 待做`;
- code block with language banner;
- one long reply (table ≥10 rows, code ≥30 lines);
- one GenUI `dsh-ui` component adjacent to markdown (no double styling).

Capture screenshots with PowerShell (save under `artifacts/full-test-<stamp>\`):

```powershell
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $b.Width, $b.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($b.Location, [System.Drawing.Point]::Empty, $b.Size)
$bmp.Save("G:\dsh-structured\artifacts\full-test-<stamp>\01-cards-light.png", [System.Drawing.Imaging.ImageFormat]::Png)
```

Capture at least:
1. `01-cards-light.png` — conclusion + table + next card.
2. `02-cards-dark.png` — same content in dark theme.
3. `03-status-table.png` — status column with both ✅/⚠️.
4. `04-code-block.png` — code block banner + copy/wrap controls.
5. `05-long-content.png` — long table/code, no horizontal overflow.
6. `06-genui-adjacent.png` — `dsh-ui` component next to markdown.
7. `07-narrow-window.png` — ~800px width; no clipped card/table.
8. `08-before-after.png` — if 0.5.0 screenshot exists; otherwise mark `not available` and do not fabricate.

Pass criteria:
- Card title is visibly bolder/larger than body; label 13px (action cards); title 16px; body 15.5; plain lead 16.5/600.
- Max 2 emphasis cards per reply; no card-in-card.
- Status column only tinted, no full-row pastel.
- Table lead visible; no vertical borders.
- No overflow, no clipped buttons, no unreadable low-contrast text.
- GenUI component not restyled/double-rendered by our CSS.

## T4 — Conversation sample (12 prompts)

Run each in a fresh session; save final replies and screenshots if useful:
1. 比较 pnpm 和 npm 在 Windows 上的取舍，给一个明确建议。
2. 插件 0.7.3 刚装好，列一个重启后的验收清单。
3. 解释为什么流式渲染时不能直接包裹 DOM 节点。
4. 给一个 DSH 插件从开发到安装的 5 步流程。
5. 评估当前视觉方案的风险和回滚路径。
6. 把 Phase 2 剩余工作拆成可执行的下一步。
7. 总结卡片系统和 GenUI 的分工。
8. 宿主升级后 markdown class 改名，会发生什么，怎么排查？
9. 对比 CSS 皮肤和 React 卡片组件两种方案。
10. 给一个 500 字以内的项目状态汇报。
11. 现在的结构化输出还有哪些不足？给优先级。
12. 设计一个 12 条 prompt 的视觉验收方案。

Measure per reply:
- first-screen contains a no-label title card (bold title, no "结论" label) — count /12.
- number of emphasis cards ≤2.
- table has `**表格结论：**` and status labels.
- prose rate via:

```powershell
node scripts/measure-prose.mjs --since-days 1 --limit 12 --json
```

Pass criteria: first-screen card ≥80%; max cards ≤2 for all; table lead 100% when table present; status labels correct; prose rate <10%; no missing card title; first line is `> **title**`, never `> **结论**`; any prompt/command/config in the reply is a fenced code block with a language tag (copy button visible).

## T5 — Streaming / regression / uninstall

- Stream a long reply; no freeze, no duplicate cards, no flicker, no console error.
- Rapid sequence of 5 replies; observer does not stack callbacks.
- Test profile uninstall: `node scripts/uninstall.mjs --profile structured-test --dry-run`, then real; check no `node_modules/dsh-structured`, no state dir, no bundle row. Do not uninstall desktop.
- Reinstall test profile 0.7.3; verify injection again.

## T6 — Publish readiness (read-only)

Do not publish. Check and report:
- `package.json` has `name`, `version`, `license`, `repository`, `homepage`, `bugs`, `keywords` including `dsh-plugin`, `dsh` bundle manifest.
- README has install, rollback, verification, screenshots, no local absolute path as the only install method.
- `icon.svg`, `locale/en.json`, `locale/zh.json`, `LICENSE`, `CHANGELOG.md` (if absent, flag).
- `npm pack --dry-run` clean; no secrets; no `.tools`/`artifacts`.
- Git: repo not initialized (`git status` fails) — flag as publish blocker; no remote.
- npm name `dsh-structured` is unclaimed; npm auth not configured (`npm whoami` fails) — flag as publish blocker.
- Marketplace: catalog source `awesome-dsh-plugin/awesome-dsh-plugin`; submit one YAML `data/plugins/<owner>__<repo>.yml`; requires repo ≥1 day old, `dsh-plugin` topic, `dsh.bundle`; category `session` or `ui`. Flag the 1-day age gate.

## Report format

`docs/FULL-TEST-REPORT.md`:

```markdown
# dsh-structured 0.7.3 — Full Test Report
- Date / environment:
- Verdict: PASS | PASS WITH DEFECTS | BLOCKED
- T1 static: pass/fail + command output
- T2 host: pass/fail per case
- T3 visual: screenshot table + pass/fail
- T4 conversation: 12/12 table, card rate, prose rate
- T5 streaming/uninstall: pass/fail
- T6 publish readiness: checklist + blockers
- Defects: severity, file/line, reproduction, expected/actual
- Unverified: explicit list
```

Final message: `PASS n / FAIL n / BLOCKED n`, report path, artifact directory. Do not edit source; do not publish.
