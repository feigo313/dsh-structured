import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import { parsePersona } from '../src/index.js'

const whale = readFileSync('docs/1.0-PERSONA-WHALE.json', 'utf8')

function makeDom() {
  const element = () => ({ children: [], appendChild() {}, remove() {}, setAttribute() {}, removeAttribute() {}, querySelectorAll() { return [] }, closest() { return null } })
  const styles = new Map()
  const style = () => {
    const item = element()
    item.id = ''
    item.textContent = ''
    item.remove = () => { if (item.id) styles.delete(item.id) }
    return item
  }
  return {
    body: element(), documentElement: { setAttribute() {}, removeAttribute() {} },
    head: { appendChild(item) { if (item.id) styles.set(item.id, item) } },
    createElement: (tag) => {
      if (tag === 'style') return style()
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => ({ drawImage() {} }),
          toDataURL: () => 'data:image/jpeg;base64,AAAA',
        }
      }
      return element()
    },
    getElementById: (id) => styles.get(id) ?? null,
    querySelectorAll: () => [],
  }
}

function textOf(children) {
  if (Array.isArray(children)) return children.map(textOf).join('')
  if (children && typeof children === 'object') return textOf(children.props?.children)
  return children == null ? '' : String(children)
}

function allNodes(tree) {
  const out = []
  const visit = (node) => {
    if (!node) return
    if (Array.isArray(node)) { for (const item of node) visit(item); return }
    if (typeof node !== 'object') return
    out.push(node)
    visit(node.props?.children)
  }
  visit(tree)
  return out
}

function storage() {
  const map = new Map()
  return {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
    dump: () => Object.fromEntries(map),
  }
}

function makeHarness(state, setField, extraProps = {}) {
  const node = (type, props) => ({ type, props: props ?? {} })
  const hooks = []
  let hookIndex = 0
  let tree = null
  let current = null
  const written = { ...(state.value ?? {}) }
  const trackedSetField = async (field, value) => {
    const result = await setField(field, value)
    if (result !== false) written[field] = value
    return result
  }
  const readFields = extraProps.readFields ?? (() => ({ status: 'ready', writable: state.writable, value: { ...written } }))
  const render = () => { hookIndex = 0; tree = current({ state, setField: trackedSetField, readFields, ...extraProps }); return tree }
  const react = {
    useState(initial) {
      const index = hookIndex++
      if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial
      return [hooks[index], (next) => { hooks[index] = typeof next === 'function' ? next(hooks[index]) : next; render() }]
    },
  }
  const fakeRequire = (spec) => {
    if (spec === 'react/jsx-runtime') return { jsx: node, jsxs: node }
    if (spec === 'react') return react
    if (spec === '@deepseek-ai/dsh-client-ui-primitives') {
      return { Switch: function Switch(props) { return { type: 'Switch', props } }, SegmentedControl: function SegmentedControl(props) { return { type: 'SegmentedControl', props } } }
    }
    throw new Error('unexpected require ' + spec)
  }
  let definition = null
  const window = { __ModuleLoader__: { load(value) { definition = value } }, confirm: () => true, localStorage: storage() }
  class FakeFileReader {
    readAsDataURL() {
      this.result = 'data:image/png;base64,AAAA'
      this.onload?.()
    }
  }
  class FakeImage {
    set src(value) {
      this._src = value
      this.naturalWidth = 200
      this.naturalHeight = 100
      this.onload?.()
    }
    get src() { return this._src }
  }
  vm.runInNewContext(readFileSync('lib/client.js', 'utf8'), {
    window, document: makeDom(), TextEncoder, FileReader: FakeFileReader, Image: FakeImage,
    MutationObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: (fn) => fn(), cancelAnimationFrame() {}, setTimeout: (fn) => fn(), clearTimeout() {},
    console: { info() {}, warn() {}, error() {} },
  }, { filename: 'lib/client.js' })
  const plugin = definition.factory(fakeRequire)
  const form = { set() { return Promise.resolve(true) }, getSnapshot() { return null }, subscribe() { return () => {} } }
  const child = {
    configForms: { get() { return form }, whileServed(_ns, register) { register(); return () => {} } },
    slots: { inject(_name, factory) { factory(); return () => {} }, register() { return () => {} } },
    effect(fn) { return fn() },
  }
  plugin.__test.setupConfigPage(child, form)
  const api = plugin.__test.personaApi()
  current = api.PersonaEditor
  render()
  const nodes = () => allNodes(tree)
  const findButton = (label) => nodes().find((item) => item.type === 'button' && textOf(item.props.children) === label)
  const findTextarea = (needle = '') => nodes().find((item) => item.type === 'textarea' && String(item.props.value ?? '').includes(needle))
  const click = async (label) => {
    const button = findButton(label)
    assert.ok(button, 'missing button ' + label)
    await button.props.onClick?.({ stopPropagation() {} })
  }
  return {
    api, window, nodes, findButton, findTextarea, click,
    inputByValue(value) { return nodes().find((item) => item.type === 'input' && item.props.value === value) },
    nodeByClass(name) { return nodes().find((item) => String(item.props?.className ?? '').split(/\s+/).includes(name)) },
    setWindowConfirm(value) { window.confirm = () => value },
  }
}

const baseState = { status: 'ready', writable: true, revision: 0, value: { persona: whale, personaEnabled: false, personaRevision: 0 } }

test('v5 语气设置：档案行 + 三字段 + 规则行 + 样式预览，不再有基础/进阶/JSON', () => {
  const harness = makeHarness(baseState, async () => true)
  const text = harness.nodes().map((item) => String(textOf(item.props.children))).join(' ')
  assert.match(text, /语气风格/)
  assert.match(text, /样式预览/)
  assert.match(text, /切换人格/)
  assert.match(text, /开场/)
  assert.match(text, /性格/)
  assert.match(text, /收尾/)
  assert.match(text, /放在最前面 · 可留空/)
  assert.match(text, /代码 \/ diff \/ 报错/)
  assert.doesNotMatch(text, /基础|进阶|JSON 编辑|开头前缀|中间风格|结尾后缀/)
  assert.equal(harness.findButton('保存').props.disabled, true)
  assert.ok(harness.nodeByClass('dss-config'))
  assert.ok(harness.nodeByClass('dss-preview'))
  assert.ok(harness.inputByValue('Boss，'))
  assert.ok(harness.findTextarea('搞怪 / 傲娇怪'))
  assert.ok(harness.inputByValue('蓝色大肥鱼'))
  assert.ok(harness.inputByValue('主人，再来一碗白米饭！！~'))
  assert.equal(harness.nodes().some((item) => item.type === 'select'), false)
  const avatar = harness.nodes().find((item) => item.type === 'img' && item.props.src?.startsWith('data:image/jpeg;base64,'))
  assert.ok(avatar, 'default whale avatar must be a real image')
  assert.equal(harness.nodes().filter((item) => item.type === 'button' && textOf(item.props.children) === '普通').length, 1)
})

test('v5 编辑三字段/名称/签名 → 保存 persona + enabled + revision + 档案字段', async () => {
  const calls = []
  const harness = makeHarness(baseState, async (field, value) => { calls.push([field, value]) })
  harness.inputByValue('Boss，').props.onChange({ target: { value: '老板，' } })
  harness.findTextarea('搞怪 / 傲娇怪').props.onChange({ target: { value: '直接 / 克制' } })
  harness.inputByValue('——本鲸鱼娘可不背锅').props.onChange({ target: { value: '——收工' } })
  harness.inputByValue('蓝色大肥鱼').props.onChange({ target: { value: '新名字' } })
  harness.inputByValue('主人，再来一碗白米饭！！~').props.onChange({ target: { value: '新签名' } })
  assert.equal(harness.findButton('保存').props.disabled, false)
  await harness.click('保存')
  assert.deepEqual(calls.map(([field]) => field), ['persona', 'personaEnabled', 'personaRevision', 'personaName', 'personaSignature', 'personaAvatar'])
  assert.equal(calls[2][1], 1)
  const saved = JSON.parse(calls[0][1])
  assert.equal(saved.schema, 'dsh-structured/tone@1')
  assert.equal(saved.prefix, '老板，')
  assert.equal(saved.style, '直接 / 克制')
  assert.equal(saved.suffix, '——收工')
  assert.equal(calls[3][1], '新名字')
  assert.equal(calls[4][1], '新签名')
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('已保存，未启用')))
  assert.equal(harness.findButton('保存').props.disabled, true)
})

test('v5 批量保存：payload 六字段一次提交，revision 从快照读取', async () => {
  const calls = []
  let batch = null
  const harness = makeHarness(
    { status: 'ready', writable: true, revision: 9, value: { persona: whale, personaEnabled: false, personaRevision: 3 } },
    async (field, value) => { calls.push([field, value]); return true },
    { mutateFields: async (ops, revision) => { batch = { ops, revision }; return true } },
  )
  harness.inputByValue('Boss，').props.onChange({ target: { value: '批量前缀' } })
  await harness.click('保存')
  assert.equal(calls.length, 0, 'batch path must not call setField')
  assert.ok(batch)
  assert.equal(JSON.stringify(batch.ops.map((op) => [op.op, op.path[0]])), JSON.stringify([
    ['set', 'persona'], ['set', 'personaEnabled'], ['set', 'personaRevision'],
    ['set', 'personaName'], ['set', 'personaSignature'], ['set', 'personaAvatar'],
  ]))
  assert.match(batch.ops[0].value, /批量前缀/)
  assert.equal(batch.ops[2].value, 4)
  assert.equal(batch.revision, 9)
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('已保存，未启用')))
})

test('v5 批量保存被拒绝：保留草稿并允许重试', async () => {
  let batchCalls = 0
  const harness = makeHarness(
    { status: 'ready', writable: true, revision: 2, value: { persona: whale, personaEnabled: false } },
    async () => { throw new Error('setField must not run') },
    { mutateFields: async () => { batchCalls += 1; return false } },
  )
  harness.inputByValue('Boss，').props.onChange({ target: { value: '批量失败草稿' } })
  await harness.click('保存')
  assert.equal(batchCalls, 1)
  assert.ok(harness.inputByValue('批量失败草稿'))
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('批量写入失败')))
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('批量写入被宿主拒绝')))
  assert.equal(harness.findButton('保存').props.disabled, false)
})

test('v5 回滚：persona 失败不继续写后续字段', async () => {
  const calls = []
  const harness = makeHarness(baseState, async (field, value) => {
    calls.push([field, value])
    if (field === 'persona') throw new Error('persona failed')
    return true
  })
  harness.inputByValue('Boss，').props.onChange({ target: { value: 'persona 失败草稿' } })
  await harness.click('保存')
  assert.deepEqual(calls.map(([field]) => field), ['persona'])
  assert.ok(harness.inputByValue('persona 失败草稿'))
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('persona failed')))
})

test('v5 回滚：revision 失败回滚 enabled/persona', async () => {
  const calls = []
  const harness = makeHarness(baseState, async (field, value) => {
    calls.push([field, value])
    if (field === 'personaRevision') throw new Error('revision failed')
    return true
  })
  harness.inputByValue('Boss，').props.onChange({ target: { value: 'revision 失败草稿' } })
  await harness.click('保存')
  assert.deepEqual(calls.map(([field]) => field), ['persona', 'personaEnabled', 'personaRevision', 'personaEnabled', 'persona'])
  assert.equal(calls[3][1], false)
  assert.equal(calls[4][1], whale)
  assert.ok(harness.inputByValue('revision 失败草稿'))
})

test('v5 回滚：写后读回不一致触发六字段回滚', async () => {
  const calls = []
  const harness = makeHarness(
    baseState,
    async (field, value) => { calls.push([field, value]); return true },
    { readFields: () => ({ status: 'ready', writable: true, value: { persona: 'not-the-doc', personaEnabled: true, personaRevision: 99, personaName: 'x', personaSignature: 'y', personaAvatar: 'z' } }) },
  )
  harness.inputByValue('Boss，').props.onChange({ target: { value: '读回失败草稿' } })
  await harness.click('保存')
  assert.ok(harness.inputByValue('读回失败草稿'))
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('写后读回校验失败')))
  assert.deepEqual(calls.map(([field]) => field), [
    'persona', 'personaEnabled', 'personaRevision', 'personaName', 'personaSignature', 'personaAvatar',
    'personaAvatar', 'personaSignature', 'personaName', 'personaRevision', 'personaEnabled', 'persona',
  ])
})

test('v5 缺少读回接口：不宣布保存成功', async () => {
  const harness = makeHarness(baseState, async () => true, { readFields: undefined })
  harness.inputByValue('Boss，').props.onChange({ target: { value: '无读回草稿' } })
  await harness.click('保存')
  assert.ok(harness.inputByValue('无读回草稿'))
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).includes('缺少配置读回接口')))
})

test('v5 readonly：档案行/字段/保存/恢复默认全部禁用', () => {
  const harness = makeHarness({ status: 'ready', writable: false, value: { persona: whale, personaEnabled: true } }, async () => true)
  assert.equal(harness.findButton('保存').props.disabled, true)
  assert.equal(harness.findButton('恢复默认').props.disabled, true)
  assert.equal(harness.inputByValue('Boss，').props.disabled, true)
  assert.equal(harness.findTextarea('搞怪 / 傲娇怪').props.disabled, true)
  assert.equal(harness.nodes().some((item) => item.type === 'input' && item.props.type === 'file'), true)
  const file = harness.nodes().find((item) => item.type === 'input' && item.props.type === 'file')
  assert.equal(file.props.disabled, true)
})

test('v5 头像：上传后裁压到 128px JPEG，保存 personaAvatar；恢复默认清空', async () => {
  const calls = []
  const harness = makeHarness(baseState, async (field, value) => { calls.push([field, value]) })
  const fileInput = harness.nodes().find((item) => item.type === 'input' && item.props.type === 'file')
  assert.ok(fileInput)
  fileInput.props.onChange({ target: { files: [{ type: 'image/png' }], value: '' } })
  const avatars = harness.nodes().filter((item) => item.type === 'img' && item.props.src === 'data:image/jpeg;base64,AAAA')
  assert.equal(avatars.length, 2, 'profile and preview avatar must sync')
  assert.equal(harness.findButton('保存').props.disabled, false)
  await harness.click('保存')
  assert.ok(calls.some(([field, value]) => field === 'personaAvatar' && value === 'data:image/jpeg;base64,AAAA'))
  await harness.click('恢复默认')
  assert.equal(harness.nodes().some((item) => item.type === 'img' && item.props.src === 'data:image/jpeg;base64,AAAA'), false)
  const defaultAvatar = harness.nodes().find((item) => item.type === 'img' && String(item.props.src).startsWith('data:image/jpeg;base64,/9j/'))
  assert.ok(defaultAvatar, 'reset must restore the built-in whale avatar')
})

test('v5 tabGuard：dirty 时确认，clean 时放行', () => {
  const guard = {}
  const harness = makeHarness(baseState, async () => true, { tabGuard: guard })
  assert.equal(guard.confirm(), true)
  harness.inputByValue('Boss，').props.onChange({ target: { value: '草稿' } })
  harness.setWindowConfirm(false)
  assert.equal(guard.confirm(), false)
  harness.setWindowConfirm(true)
  assert.equal(guard.confirm(), true)
})

test('v5 模板：默认鲸鱼可删空后提示恢复默认；另存模板不自动选中', async () => {
  const harness = makeHarness(baseState, async () => true)
  await harness.click('切换人格')
  assert.ok(harness.findButton('×'))
  await harness.click('×')
  const text = harness.nodes().map((item) => String(textOf(item.props.children))).join(' ')
  assert.match(text, /模板已全部删除 · 用底部「恢复默认」找回/)
  await harness.click('＋ 将当前草稿另存为模板')
  const saved = JSON.parse(harness.window.localStorage.getItem('dsh-structured.tone.v5.templates'))
  assert.equal(saved.customs.length, 1)
  assert.equal(saved.customs[0].name, '蓝色大肥鱼')
  assert.equal(saved.customs[0].signature, '主人，再来一碗白米饭！！~')
  assert.equal(harness.findButton('保存').props.disabled, true, 'save-as-template must not select the new template')
})

test('v5 emoji：64 格面板，点选插入开场并更新计数器', async () => {
  const harness = makeHarness(baseState, async () => true)
  await harness.click('☺')
  const panel = harness.nodeByClass('dss-emoji-panel')
  assert.ok(panel)
  assert.equal(panel.props.children.length, 64)
  const first = panel.props.children[0]
  await first.props.onClick({ stopPropagation() {} })
  const prefix = harness.nodes().find((item) => item.type === 'input' && item.props.id === 'dss-prefix')
  assert.ok(String(prefix.props.value).includes('🐳'))
  assert.ok(harness.nodes().some((item) => item.type === 'span' && String(textOf(item.props.children)).endsWith(' / 80')))
})

test('v5 预览：普通 / 表格 / 代码三态可切换', async () => {
  const harness = makeHarness(baseState, async () => true)
  assert.ok(harness.findButton('普通'))
  await harness.click('表格')
  assert.ok(harness.nodes().some((item) => String(textOf(item.props.children)).includes('注入链路')))
  await harness.click('代码')
  assert.ok(harness.nodes().some((item) => String(textOf(item.props.children)).includes('代码 · tone-loader.js')))
  assert.ok(harness.findButton('复制代码') || harness.nodeByClass('dss-copy'))
  await harness.click('普通')
  assert.ok(harness.nodes().some((item) => String(textOf(item.props.children)).includes('这版能上')))
})

test('v5 Client/Host parity：同一无害/恶意 JSON 结果一致', () => {
  const harness = makeHarness(baseState, async () => true)
  const base = JSON.parse(whale)
  const cases = [
    base,
    { ...base, schema: 'dsh-structured/persona@1' },
    { ...base, extra: 1 },
    { ...base, style: '' },
    { ...base, prefix: 'x'.repeat(81) },
    { ...base, skipIn: ['bogus'] },
    { ...base, skipIn: ['code', 'code'] },
  ]
  for (const [index, doc] of cases.entries()) {
    const raw = JSON.stringify(doc)
    const client = harness.api.parseToneJson(raw)
    const host = parsePersona(raw)
    assert.equal(client.ok, host.ok, 'case ' + index)
    if (!client.ok && !host.ok) assert.equal(client.pointer, host.pointer, 'pointer case ' + index)
  }
})
