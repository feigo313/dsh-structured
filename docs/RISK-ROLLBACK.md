# 视觉方案：风险评估与回滚路径（0.7.3）

评估对象：`src/client.js` 的视觉层（CSS 皮肤 + 语义装饰）+ `src/index.js` 注入的标题卡契约。
实装状态：desktop profile 已装 0.7.3（`file:<repo>/dsh-structured-0.7.3.tgz`，`dsh.profile.bundles` 中一行）。
基线：0.7.3 源码 + 当前 desktop 配置；本轮未重启、未改 profile。

## 结论

没有 P0：视觉层只加 `<style>` 和属性，选择器失配时退化为原生 markdown，不会打断会话。
两个 P1 都在“可控性”，不在“正确性”：

1. **皮肤没有运行时开关。** `/structured off` 只停提示词注入，`apply()` 无条件注入样式；要关皮肤只能删 bundle 行重开，或整包卸载。
2. **语义判定靠中文前缀 + “首个引用块”猜。** 任何以 `结论/判断/风险` 开头的 blockquote 会被做成卡；任何非卡的首个 blockquote 会被升成 16.5px/600 的 lead。文本不变，但层级会撒谎。

## 风险清单

| 级别 | 风险 | 证据 | 触发 / 影响 |
| --- | --- | --- | --- |
| P1 | 皮肤无法热关闭 | `src/client.js:401-411` 无条件注入；config 只有 4 项（`cordis.patch.yml:16-20`）；status 明示“视觉层始终开启”（`src/index.js:297`） | 任何“先关掉看看”都要重开 Desktop；无法用 `/structured off` 做视觉 A/B |
| P1 | 首个引用块 / 前缀误判 | `isFirstBlockquote`（`src/client.js:301-304`）只看“是不是第一个 blockquote”；`decorate` 把它升为 lead（`:337`）；`cardTypeFor` 只看开头两字（`:276-279`） | 引用报错信息、用户原话、外部文档会被当成“主结论/风险卡”；不改文本，改观感 |
| P2 | 每帧全量重扫 | `MutationObserver` 监听 `body`（`:433-434`），rAF 后 `decorate(document)` 跑 7 组 `querySelectorAll`（`:321-397`） | 长会话 + 流式输出时每帧扫全量 DOM；开销随会话长度线性增长 `[I]`，未实测 |
| P2 | 宿主内部标记耦合 | `_markdown_`、`.md-code-block`、`[data-code-block-banner]`、`[data-theme="dark"]`（`:54-269`） | 宿主改名后不报错、静默半失效；暗色强调色可能不生效，不是干净降级 |
| P2 | desktop 卸载脚本会失败 | `scripts/uninstall.mjs:29` 调 `dsh plugin --profile <p> remove`；`README.md:36` 明确 desktop 被 CLI 拒绝；失败时脚本在删状态前退出（`:35-39`） | “一条命令卸载”在 desktop 上无效，state 目录残留；必须手工 pnpm |
| P3 | 视觉逻辑无 DOM 测试 | `test/structured.test.mjs:491-499` 只 grep 字符串；statement/lead/status 分支无断言 | 0.7.1/0.7.2 的 statement 失效这类回归，单测拦不住 |
| P3 | GenUI / 作用面靠猜 | `inGenui` 只认 `[data-genui]`、`[class*="genui-root"]`（`:281-287`）；皮肤选择器不区分消息角色 | 标记改名会套进 GenUI；是否也作用到用户消息/设置文档未验证 |

## 回滚阶梯

按影响面从小到大。每档写明生效条件与代价。

### L0 会话级：只停注入（立即生效）

```text
/structured off
```

下一轮起 system prompt 不再有规则段与尾部提醒。**皮肤仍在**，表格、卡片、状态色照旧。
代价：0 重启；局限：不能用来判断“视觉方案本身有没有问题”。

### L1 全局停注入（重启生效）

profile 的 `cordis.patch.yml` 覆盖同一 id（config 整份替换，不是深合并）：

```yaml
- id: dsh-structured
  config: { defaultEnabled: false, tailReminder: false, includeSubagents: false, genui: auto }
```

新会话默认不注入；已显式 `/structured on` 的会话仍注入（显式优先）。皮肤仍在。

### L2 停插件（推荐的视觉回滚）

1. 退出 Desktop。
2. 从 `profiles/desktop/package.json` 的 `dsh.profile.bundles` 删掉 `"dsh-structured"`。
3. 重开 Desktop。

host 一定不加载；client 预期随 bundle 卸载（未实测）。`node_modules` 原封不动，把行加回去即可恢复——这是最轻的“能关皮肤”档。
若重开后 Console 仍出现 `[dsh-structured] visual layer active`，说明 client 由依赖图加载而非 bundle 行，需要走 L3 的 `pnpm remove`。

### L3 完整卸载（desktop）

1. 退出 Desktop。
2. 删 `dsh.profile.bundles` 里的 `"dsh-structured"` 行。
3. 清状态目录（脚本从仓库跑，删包前后都行）：

   ```powershell
   node <repo>\scripts\uninstall.mjs
   ```

   **不要带 `--profile desktop`**：CLI 会拒绝，脚本随即退出，state 不会被删。
4. 在 profile 目录移除依赖：

   ```powershell
   $profileDir = Join-Path $env:DSH_HOME 'profiles\desktop'
   Set-Location $profileDir
   pnpm remove dsh-structured
   ```

5. 重开 Desktop。

不要整份恢复 `package.json.bak-*` 快照：会把快照之后安装/调整的其他插件一起回滚。定向删依赖 + bundle 行更安全。

### L4 版本回退

用于“0.7.3 引入新问题”。退出 Desktop 后：

```powershell
Set-Location (Join-Path $env:DSH_HOME 'profiles\desktop')
pnpm add <repo>\dsh-structured-0.7.2.tgz
```

0.7.2 缺“多段落首卡也识别为 statement”的修复，会把已修好的首卡打回去；只在 0.7.3 确认回归时用。

## 回滚验收

```powershell
$d = Join-Path $env:DSH_HOME 'profiles\desktop'
Test-Path "$d\node_modules\dsh-structured"                       # L3 后 False；L2 仍 True
Select-String -Path "$d\package.json" -Pattern 'dsh-structured'  # L2/L3 后无输出
Test-Path (Join-Path $env:DSH_HOME 'dsh-structured')             # L3 后 False
```

重启后目检 / DevTools：

- `document.documentElement.dataset.dshStructured` 为 `undefined`
- 新回复上不再出现 `data-dsh-structured-*` 属性
- Console 不再打印 `[dsh-structured] visual layer active`

注入是否真的停了：

```powershell
node <repo>\scripts\session-inspect.mjs --last-system --grep "结构化输出（本会话已启用"
```

## 未验证（别当成结论）

1. L2 后 client 是否随 bundle 一并卸载：需要一次重启 + DevTools 探针。
2. `[data-theme="dark"]` 是否是宿主真实的暗色标记：DevTools 看 `documentElement`。
3. 流式长会话的扫描开销：Performance 面板看 long task，当前只有静态推断。
4. 皮肤作用面：是否也命中用户消息、设置页、插件文档；选择器没有角色范围。
5. GenUI 当前版本的根标记：0.6.2 实测有 `data-genui`，0.7.3 未复测。

## 结构性建议（按性价比）

1. 加 `visual: on|off` 配置，client 启动时读取，与 `/structured` 解耦。这与 `docs/VISUAL-PLAN.md:131-133` 的“不增加 visual 配置”冲突，需要明确改计划；收益是视觉试错不再需要重启。
2. lead 判定收紧：只在“回复开头 3 个块内、且没有卡片”时升级；或要求模型显式标记首卡。
3. `decorate` 只扫 MutationRecord 的 target 子树，或流式期间做 100ms 节流，避免每帧全量。
4. 选择器自检：`markdownRoots=0` 时把 `<html data-dsh-structured>` 置为 `degraded` 并 warn 一次，让静默失败可见。
5. 补 DOM 测试（happy-dom / jsdom）覆盖 statement / lead / status / row 四类分支；现在的 client 测试只证明字符串存在。
