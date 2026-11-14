// Feedback is for every user: no developer mode in the way of the report, the sign-in, the account row or the menu item; the screenshot is masked before the sheet opens and the person can only add to it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { devReport, registerDevReport, openDevReport, closeDevReport, addManualMask, undoManualMask, clearManualMasks } from '../src/vue/devmode/devReport.js'
import { devmodeTexts } from '../src/devmode/texts.js'
import { contextTexts } from '../src/contextmenu/texts.js'
import { makePng } from './pngFixture.js'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const flag = (src) => /useDeveloperMode|developerMode|\.enabled\.value/.test(src)

test('none of the feedback files asks whether developer mode is on', () => {
  for (const f of ['src/vue/devmode/DevReport.vue', 'src/vue/devmode/DevSignIn.vue', 'src/vue/devmode/DevReportHost.vue', 'src/vue/devmode/DevShotMask.vue', 'src/vue/devmode/devReport.js', 'src/vue/MFeedbackAccount.vue', 'src/vue/MFeedbackRow.vue', 'src/vue/MErrorHost.vue', 'src/devmode/feedback.js', 'src/devmode/signin.js']) assert.equal(flag(read(f)), false, f)
})

test('the words: the send button says 登录 GitHub 后发送 when signed out, and the account section has its name', () => {
  assert.equal(devmodeTexts('zh').sendSignIn, '登录 GitHub 后发送')
  assert.equal(devmodeTexts('zh').acctTitle, '账号与反馈')
  assert.equal(devmodeTexts('zh').disconnectGithub, '退出 GitHub 登录')
  assert.equal(contextTexts('zh').feedbackHere, '反馈此处问题')
  assert.ok(devmodeTexts('en').sendSignIn && devmodeTexts('en').feedbackHere)
})

test('the report sheet: two ways, privately to the developers or a zip on this computer; nothing public, no account', () => {
  const src = read('src/vue/devmode/DevReport.vue')
  assert.match(src, /const dest = ref\('ours'\)/)
  assert.match(src, /\{ id: 'ours'/); assert.match(src, /\{ id: 'local'/)
  assert.match(src, /submitReport\(doc, \{ id: reportIdOf\(doc\) \}\)/)
  assert.match(src, /readErrors\(\) === 'off'/, 'a report follows the error-report choice')
  for (const gone of ['sendThroughBackend', 'reportIssueUrl', 'newIssueUrl', 'openDevSignIn', 'useDevAccount', 'visibleRepos', 'sentGithub', "id: 'github'", "id: 'anon'", 'p.openUrl']) assert.ok(!src.includes(gone), gone)
  assert.match(src, /data-dev="report-type"/)
})

const png = makePng(40, 20)
const fakeMask = async (bytes, rects) => ({ bytes, width: 40, height: 20, regions: [{ x: 1, y: 1, w: 5, h: 5, kind: 'host' }, { x: 10, y: 4, w: 8, h: 3, kind: 'pin' }] })
const painted = []
const fakePaint = async (bytes, rects) => { painted.push(rects.map((r) => ({ ...r }))); return { bytes: Uint8Array.from([...bytes.subarray(0, 8), rects.length]), width: 40, height: 20 } }

test('opening the report: the capture is masked before the sheet is open and the original is not kept', async () => {
  registerDevReport({ capture: async () => png, mask: fakeMask, paint: fakePaint, logs: () => 'log', env: () => 'env' })
  closeDevReport()
  await openDevReport({ kind: 'error', error: { name: 'E', message: 'm' } })
  assert.equal(devReport.open, true)
  assert.equal(devReport.shotAuto.length, 2)
  assert.deepEqual(devReport.shotSize, { width: 40, height: 20 })
  assert.equal(devReport.shot, devReport.shotBase)
  assert.equal(devReport.shotMaskFailed, false)
})

test('the mask tool: boxes are added on the automatic result, undo and clear take only the hand-drawn ones, the automatic ones never go', async () => {
  const auto = devReport.shotAuto.map((r) => ({ ...r }))
  await undoManualMask(); await clearManualMasks()
  assert.deepEqual(devReport.shotAuto, auto)
  await addManualMask({ x: 20, y: 10, w: 10, h: 6 })
  await addManualMask({ x: 2, y: 2, w: 2, h: 2 })
  assert.equal(devReport.shotManual.length, 1, 'a box smaller than 4 pixels is a slip of the hand')
  await addManualMask({ x: 30, y: 15, w: 100, h: 100 })
  assert.deepEqual(devReport.shotManual[1], { x: 30, y: 15, w: 10, h: 5, kind: 'manual' }, 'clamped to the picture')
  assert.equal(devReport.shot[8], 2, 'the image shown is painted from the automatic result plus both boxes')
  assert.notEqual(devReport.shot, devReport.shotBase)
  assert.deepEqual(painted.at(-1).length, 2)
  await undoManualMask()
  assert.equal(devReport.shotManual.length, 1)
  await clearManualMasks()
  assert.equal(devReport.shotManual.length, 0)
  assert.equal(devReport.shot, devReport.shotBase, 'no hand-drawn box: the automatic result itself')
  assert.deepEqual(devReport.shotAuto, auto, 'the automatic boxes are untouched')
})

test('a capture that cannot be masked is not attached: never the original', async () => {
  registerDevReport({ capture: async () => png, mask: async () => null, paint: fakePaint })
  closeDevReport()
  await openDevReport({ kind: 'error', error: { name: 'E', message: 'm' } })
  assert.equal(devReport.shot, null); assert.equal(devReport.shotBase, null)
  assert.equal(devReport.shotMaskFailed, true); assert.equal(devReport.shotFailed, true)
  closeDevReport()
})

test('no capture at all (a browser): no screenshot, no failure of the masking', async () => {
  registerDevReport({ capture: async () => null, mask: fakeMask })
  await openDevReport({ kind: 'feedback' })
  assert.equal(devReport.shot, null); assert.equal(devReport.shotMaskFailed, false)
  closeDevReport()
})
