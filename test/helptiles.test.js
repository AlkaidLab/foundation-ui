import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"
import { HELP_TILE_IDS, shortVersion, updateTile, doctorTile, feedbackTile, downloadsTile, helpTiles, tileLabel, noticeAfterTile, aboutLine } from "../src/helpTiles/model.js"
import { helpTileTexts, HELP_TILE_LOCALES, HELP_TILE_KEYS } from "../src/helpTiles/texts.js"
import { LOCALE_CODES } from "../src/locale/texts/resolve.js"
import { afterCheck, afterOpened, noticeView } from "../src/update/notice.js"

const here = dirname(fileURLToPath(import.meta.url))
const src = (p) => readFileSync(join(here, "..", "src", p), "utf8")
const T = helpTileTexts("en")
const ZH = helpTileTexts("zh")
const ago = (at) => `ago:${at}`
// the width of a word in em (a wide letter 1, a narrow one .3, the rest .58): the value line of a tile at its smallest is 112 px at 20 px type
const em = (s) => [...s].reduce((a, c) => a + (/[\u1100-\u11ff\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(c) ? 1 : /[ iIl.,:·]/.test(c) ? 0.3 : /[mwMW]/.test(c) ? 0.85 : 0.58), 0)

test("the short form of a version: no v, no build stamp, the channel stays", () => {
  assert.equal(shortVersion("v2026.1122.123456"), "2026.1122")
  assert.equal(shortVersion("2026.1031.121458"), "2026.1031")
  assert.equal(shortVersion("1.0.9"), "1.0.9")
  assert.equal(shortVersion("v1.0.9-rc.2"), "1.0.9-rc.2")
  assert.equal(shortVersion("1.0.9+build.5"), "1.0.9")
  assert.equal(shortVersion(""), "")
  assert.equal(shortVersion(null), "")
})

test("the update tile: every state says its version, its state and its action", () => {
  const base = { installed: "v2026.1122.100000", next: "2026.1123.090000", checkedAt: 1000 }
  const idle = updateTile({ ...base, state: "idle", checkedAt: 0 }, ZH, ago)
  assert.deepEqual([idle.value, idle.sub, idle.action.kind, idle.action.label], ["2026.1122", "尚未检查", "check", "检查更新"])
  const checking = updateTile({ ...base, state: "checking" }, ZH, ago)
  assert.deepEqual([checking.sub, checking.action.kind, checking.busy], ["正在检查…", "none", true])
  const latest = updateTile({ ...base, state: "latest" }, ZH, ago)
  assert.deepEqual([latest.value, latest.sub, latest.aux, latest.action.kind], ["2026.1122", "已是最新", "ago:1000", "check"])
  const available = updateTile({ ...base, state: "available" }, ZH, ago)
  assert.deepEqual([available.value, available.sub, available.accent, available.action.kind, available.action.label], ["2026.1123", "有新版本", "tertiary", "open", "更新"])
  const error = updateTile({ ...base, state: "error" }, ZH, ago)
  assert.deepEqual([error.value, error.sub, error.accent, error.action.kind, error.action.label], ["2026.1122", "检查失败", "warn", "check", "重试"])
  assert.equal(updateTile({ state: "nonsense" }, T).state, "idle")
  assert.equal(updateTile({ state: "latest" }, T).value, "–", "no installed version is a dash, not an empty tile")
})

test("an update tile of any state has the same lines: the tile never changes size with its state", () => {
  const shapes = ["idle", "checking", "available", "latest", "error"].map((state) => Object.keys(updateTile({ state, installed: "1.0.0", next: "1.0.1" }, T)).sort().join())
  assert.equal(new Set(shapes).size, 1)
  for (const state of ["idle", "checking", "available", "latest", "error"]) {
    const t = updateTile({ state, installed: "1.0.0", next: "1.0.1", checkedAt: 5 }, T, ago)
    assert.ok(t.label && t.value, state)
  }
})

test("the doctor tile: a plain start line, or the result with its time as the part that leaves first", () => {
  assert.deepEqual([doctorTile(null, ZH).value, doctorTile(null, ZH).action.label, doctorTile(null, ZH).aux], ["未体检", "开始体检", ""])
  const ok = doctorTile({ at: 5, counts: { pass: 20, warn: 0, fail: 0, skip: 1 } }, ZH, ago)
  assert.deepEqual([ok.value, ok.accent, ok.aux, ok.action.label], ["正常", "ok", "ago:5", "重新体检"])
  const warn = doctorTile({ at: 5, counts: { pass: 18, warn: 2, fail: 0, skip: 0 } }, ZH, ago)
  assert.deepEqual([warn.value, warn.unit, warn.accent, warn.state], ["2", "项待处理", "warn", "warn"])
  const fail = doctorTile({ at: 5, counts: { pass: 10, warn: 1, fail: 3, skip: 0 } }, ZH, ago)
  assert.deepEqual([fail.value, fail.accent, fail.state], ["4", "error", "fail"])
  assert.equal(doctorTile({ at: 5, empty: true, counts: { pass: 0, warn: 0, fail: 0, skip: 0 } }, ZH).state, "none", "a check that found nothing out is not a result")
  assert.equal(doctorTile({ counts: { pass: 1, warn: 0, fail: 0 } }, ZH).state, "none", "a summary without a time is not ours")
})

test("the feedback tile: unread answers, else the reports with the state of the newest, else the action itself", () => {
  const none = feedbackTile({}, ZH, ago)
  assert.deepEqual([none.state, none.hero, none.value, none.unit, none.sub, none.aux], ["none", "feedback", "写反馈", "", "", ""], "no report: no line of copy, the action is the hero")
  const unread = feedbackTile({ unread: 2, newest: "串流黑屏", count: 3, latest: { at: 9, status: "replied" } }, ZH, ago)
  assert.deepEqual([unread.value, unread.unit, unread.sub, unread.action.kind, unread.accent, unread.hero], ["2", "条新回复", "串流黑屏", "replies", "primary", ""])
  const processing = feedbackTile({ count: 3, latest: { at: 9, status: "processing" } }, ZH, ago)
  assert.deepEqual([processing.value, processing.unit, processing.sub, processing.aux, processing.action.kind, processing.hero], ["3", "条已提交", "处理中", "ago:9", "write", ""])
  assert.equal(feedbackTile({ count: 1, latest: { at: 9, status: "replied" } }, ZH, ago).sub, "已回复")
  assert.equal(feedbackTile({ count: 1, latest: { at: 9, status: "fixed" } }, ZH, ago).sub, "已修复")
  assert.equal(feedbackTile({ count: 1, latest: { at: 9, status: "fixed" } }, ZH, ago).state, "fixed")
  assert.equal(feedbackTile({ unread: "x" }, ZH).state, "none", "no invented data")
  assert.equal(feedbackTile({ unread: -2, count: 0 }, ZH).state, "none")
  assert.equal(feedbackTile({ count: 2 }, ZH).state, "none", "reports without a time are not a state")
})

test("no tile has a line of copy: every value and every state line is state, an action is the hero where there is none", () => {
  const all = [
    ...["idle", "checking", "available", "latest", "error"].map((state) => updateTile({ state, installed: "1.0.0", next: "1.1.0", checkedAt: 5 }, T, ago)),
    doctorTile(null, T), doctorTile({ at: 5, counts: { pass: 3, warn: 0, fail: 0 } }, T, ago), doctorTile({ at: 5, counts: { pass: 3, warn: 1, fail: 0 } }, T, ago),
    feedbackTile({}, T), feedbackTile({ unread: 1, newest: "x" }, T), feedbackTile({ count: 1, latest: { at: 5, status: "processing" } }, T, ago),
    downloadsTile({}, T), downloadsTile({ os: "Windows", client: "Moonlight V+" }, T),
  ]
  const copy = ["Private", "No account needed", "私下发送", "无需账号"]
  for (const t of all) for (const key of ["value", "sub", "aux", "unit"]) assert.ok(!copy.includes(t[key]), `${t.id}.${key} is ${t[key]}`)
  // a tile that states nothing says so by its hero (the action), and has no sub line
  for (const t of all.filter((x) => x.hero)) assert.deepEqual([t.sub, t.aux, t.unit], ["", "", ""], t.id)
})

test("the downloads tile names the system and its client once the person chose a system; before that the action is the hero", () => {
  const t = downloadsTile({ os: "Android", client: "Moonlight V+" }, T)
  assert.deepEqual([t.state, t.value, t.sub, t.action.kind, t.hero], ["chosen", "Android", "Moonlight V+", "open", ""])
  const none = downloadsTile({}, T)
  assert.deepEqual([none.state, none.hero, none.value, none.sub], ["none", "download", "Download", ""])
})

test("the row: 软件更新 first, four tiles, each with an accessible name that carries its action", () => {
  const tiles = helpTiles({ update: { state: "available", installed: "1.0.0", next: "1.1.0" }, doctor: null, feedback: {}, downloads: { os: "Windows", client: "Moonlight V+" } }, T, ago)
  assert.deepEqual(tiles.map((t) => t.id), HELP_TILE_IDS)
  assert.equal(tiles[0].id, "update")
  assert.match(tileLabel(tiles[0]), /Software update · 1\.1\.0 · Update available · Update/)
  assert.match(tileLabel(tiles[2]), /Report a problem · Write/)
})

test("the dot: acting on an available update opens it; showing a state does not", () => {
  const waiting = afterCheck({ available: "", seen: "" }, { version: "2.0.0", is_latest: false }, { installed: "1.0.0" })
  assert.equal(noticeView(waiting, { installed: "1.0.0" }).dot, true)
  const available = updateTile({ state: "available", installed: "1.0.0", next: "2.0.0" }, T)
  const opened = noticeAfterTile(waiting, available)
  assert.equal(noticeView(opened, { installed: "1.0.0" }).dot, false, "the dot is out after the tile is pressed")
  assert.equal(noticeView(opened, { installed: "1.0.0" }).waiting, true, "the update is still waiting")
  assert.deepEqual(opened, afterOpened(waiting))
  for (const state of ["idle", "checking", "latest", "error"]) assert.equal(noticeAfterTile(waiting, updateTile({ state, installed: "1.0.0" }, T)), waiting, state)
  assert.equal(noticeAfterTile(waiting, doctorTile(null, T)), waiting)
  // a newer version brings the dot back
  const newer = afterCheck(opened, { version: "2.1.0", is_latest: false }, { installed: "1.0.0" })
  assert.equal(noticeView(newer, { installed: "1.0.0" }).dot, true)
})

test("the line of 关于 in the list: the version, and the state when an update waits", () => {
  assert.equal(aboutLine("v2026.1122.123456", { state: "available" }, ZH), "2026.1122 · 有新版本")
  assert.equal(aboutLine("2026.1122.5555", { state: "latest" }, ZH), "2026.1122")
  assert.equal(aboutLine("", { state: "available" }, ZH), "有新版本")
})

test("every language has every word, and no word is too long for a tile or says 遥测", () => {
  assert.deepEqual([...HELP_TILE_LOCALES].sort(), [...LOCALE_CODES].filter((c) => !["en_GB", "en_US"].includes(c)).sort())
  for (const code of LOCALE_CODES) {
    const X = helpTileTexts(code)
    for (const key of HELP_TILE_KEYS) assert.ok(typeof X[key] === "string" && X[key], `${code}.${key}`)
    // what is drawn as a value, a state line or an action is read in 112 px: a long word would clip
    for (const key of ["doctorOk", "doctorNone", "actWrite", "actDownload"]) assert.ok(em(X[key]) <= 5.5, `${code}.${key} is ${X[key]}: ${em(X[key]).toFixed(1)} em, the value line holds 5.6`)
    // the state line of the feedback tile is 12 px type: 9.3 em in 112 px
    for (const key of ["stProcessing", "stReplied", "stFixed"]) assert.ok(em(X[key]) <= 9, `${code}.${key} is ${X[key]}: ${em(X[key]).toFixed(1)} em`)
    for (const key of ["actCheck", "actUpdate", "actRetry", "actStart", "actRerun", "actWrite", "actReplies", "actDownload"]) assert.ok([...X[key]].length <= 16, `${code}.${key} is ${X[key]}`)
    for (const key of HELP_TILE_KEYS) assert.ok(!X[key].includes("遥测"), `${code}.${key}`)
  }
  assert.equal(helpTileTexts("zh-CN").update, "软件更新")
  assert.equal(helpTileTexts("zh-Hant-TW").update, "軟體更新")
  assert.equal(helpTileTexts("en_GB").update, T.update)
})

test("the grid: four standard tiles in a row when they fit, two by two at the phone size otherwise, the tile a square", () => {
  const css = src("css/helptiles.css")
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 196px\)\)/)
  assert.match(css, /@container helptiles \(min-width: 628px\) \{[^}]*repeat\(4, 148px\)/, "4 x 148 + 3 x 12 = 628")
  assert.match(css, /aspect-ratio: 1 \/ 1/)
  assert.match(css, /clamp\(20px, 13\.5cqw, 32px\)/, "the value shrinks to a floor, never wraps")
  assert.doesNotMatch(css, /grid-template-columns:[^;]*1fr/, "a tile is never stretched")
  assert.match(css, /\.m-helptile__sub \{[^}]*height: 16px[^}]*overflow: hidden/, "the second part wraps off the one line that shows")
})

test("the component is the small tile of the overview and acts through events", () => {
  const vue = src("vue/MHelpTiles.vue")
  assert.match(vue, /class="m-tile m-cal m-calm is-s m-helptile"/)
  assert.match(vue, /emit\(k === .open. \? .open-update. : .check.\)/)
  assert.match(vue, /reportFeedback\(/)
  assert.ok(!/fetch\(|XMLHttpRequest/.test(vue), "no network of its own")
})
