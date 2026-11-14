import test from 'node:test'
import assert from 'node:assert/strict'
import { diagnosisRequestBody, openLogDiagnosis } from '../src/diagnostics/logDiagnosis.js'

const SECRET = [
  'Error: encoder failed Authorization: Bearer abcdefghijklmnop9876',
  'sk-abcdefghijklmnopqrstuvwxyz token=supersecretvalue api_key=anothersecretvalue user@example.com 192.168.0.10 fd00:: fe80:: AA:BB:CC:DD:EE:FF 123e4567-e89b-12d3-a456-426614174000',
  'open C:\\Users\\name\\app.log and /home/name/.config',
].join('\n')

const SECRETS = [
  'abcdefghijklmnop9876', 'sk-abcdefghijklmnopqrstuvwxyz', 'supersecretvalue', 'anothersecretvalue',
  'user@example.com', '192.168.0.10', 'fd00::', 'fe80::', 'AA:BB:CC:DD:EE:FF',
  '123e4567-e89b-12d3-a456-426614174000', 'C:\\Users\\name', '/home/name',
]

test('findings show when no proxy is configured, and the request cannot carry the raw log', () => {
  const prepared = openLogDiagnosis(SECRET)
  assert.ok(prepared.findings.length > 0, 'a local finding')
  assert.ok(prepared.suggestions.length > 0)
  const sent = JSON.stringify(diagnosisRequestBody({ model: 'm', requestText: prepared.requestText }))
  for (const secret of SECRETS) assert.equal(sent.includes(secret), false, secret)
  assert.match(sent, /<hidden>/)
  assert.match(sent, /<ipv6>/)
  assert.match(sent, /<email>/)
  assert.ok(sent.includes('<ip>'))
  const forced = JSON.stringify(diagnosisRequestBody({ model: 'm', requestText: SECRET }))
  for (const secret of SECRETS) assert.equal(forced.includes(secret), false, 'raw log pasted as the request: ' + secret)
})
