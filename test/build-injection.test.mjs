import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('构建产物：banner + src，persona JSON 由构建注入', () => {
  const marker = "const PERSONA_WHALE_JSON = '__DSH_STRUCTURED_WHALE_JSON__'"
  const normalize = (lib) => lib.replace(/\r\n/g, '\n').replace(/const PERSONA_WHALE_JSON = ".*"/, marker)
  const hostSrc = readFileSync('src/index.js', 'utf8').replace(/\r\n/g, '\n')
  const hostLib = readFileSync('lib/index.js', 'utf8')
  assert.match(hostLib.split('\n')[0], /^\/\/ Generated from src\/index\.js/)
  assert.match(hostLib, /dsh-structured\/persona@1/)
  assert.doesNotMatch(hostLib, /const PERSONA_WHALE_JSON = '__DSH_STRUCTURED_WHALE_JSON__'/)
  assert.equal(normalize(hostLib).split('\n').slice(2).join('\n'), hostSrc)

  const clientSrc = readFileSync('src/client.js', 'utf8').replace(/\r\n/g, '\n')
  const clientLib = readFileSync('lib/client.js', 'utf8')
  assert.match(clientLib.split('\n')[0], /^\/\/ Generated from src\/client\.js/)
  assert.match(clientLib, /dsh-structured\/persona@1/)
  assert.doesNotMatch(clientLib, /const PERSONA_WHALE_JSON = '__DSH_STRUCTURED_WHALE_JSON__'/)
  assert.equal(normalize(clientLib).split('\n').slice(2).join('\n'), clientSrc)
})
