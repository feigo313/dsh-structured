import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('构建产物：banner + src，persona JSON 与 docs 精确一致', () => {
  const whaleDoc = JSON.parse(readFileSync('docs/1.0-PERSONA-WHALE.json', 'utf8'))
  const extractInjected = (lib) => {
    const line = lib.split(/\r?\n/).find((item) => item.includes('const PERSONA_WHALE_JSON ='))
    assert.ok(line, 'missing injected persona constant')
    const literal = line.slice(line.indexOf('= ') + 2).trim()
    return JSON.parse(JSON.parse(literal))
  }
  const hostSrc = readFileSync('src/index.js', 'utf8')
  const hostLib = readFileSync('lib/index.js', 'utf8')
  assert.match(hostLib.split('\n')[0], /^\/\/ Generated from src\/index\.js/)
  assert.doesNotMatch(hostLib, /const PERSONA_WHALE_JSON = '__DSH_STRUCTURED_WHALE_JSON__'/)
  assert.deepEqual(extractInjected(hostLib), whaleDoc)
  assert.equal(hostLib.split(/\r?\n/).filter((line) => line.startsWith('// Generated')).length, 1)

  const clientSrc = readFileSync('src/client.js', 'utf8')
  const clientLib = readFileSync('lib/client.js', 'utf8')
  assert.match(clientLib.split('\n')[0], /^\/\/ Generated from src\/client\.js/)
  assert.doesNotMatch(clientLib, /const PERSONA_WHALE_JSON = '__DSH_STRUCTURED_WHALE_JSON__'/)
  assert.deepEqual(extractInjected(clientLib), whaleDoc)

  const marker = "const PERSONA_WHALE_JSON = '__DSH_STRUCTURED_WHALE_JSON__'"
  const normalize = (lib) => lib.replace(/\r\n/g, '\n').replace(/const PERSONA_WHALE_JSON = ".*"/, marker)
  assert.equal(normalize(hostLib).split('\n').slice(2).join('\n'), hostSrc.replace(/\r\n/g, '\n'))
  assert.equal(normalize(clientLib).split('\n').slice(2).join('\n'), clientSrc.replace(/\r\n/g, '\n'))
})
