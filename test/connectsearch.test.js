import test from "node:test"
import assert from "node:assert/strict"
import { buildIndex, search } from "../src/search/index.js"
import { actionDocs } from "../src/search/texts.js"
import { settingDocs } from "../src/search/docs.js"

const entries = [
  { id: "s1", keyName: "pair_mode", title: "配对模式", path: "串流", icon: "tune", keywords: "pair client" },
  { id: "s2", keyName: "client_dl", title: "客户端下载目录", path: "文件", icon: "tune", keywords: "client download" },
  { id: "s3", keyName: "pin_cfg", title: "PIN 过期时间", path: "安全", icon: "tune", keywords: "pin" },
]
const docs = (locale) => [...settingDocs(entries, { locale }), ...actionDocs(locale, { restart() {}, connect() {}, download() {}, logs() {} })]
const first = (locale, q) => search(buildIndex(docs(locale)), q).flat[0]?.id

test("the words of pairing and installing lead to the connect actions in both languages", () => {
  for (const q of ["配对", "配对新设备", "添加设备", "连接", "连接设备", "新设备", "二维码", "扫码", "手机", "平板", "电视", "pair", "connect", "add device", "pin", "qr code"]) {
    assert.equal(first("zh", q), "action:connect", `zh ${q}`)
    assert.equal(first("en", q), "action:connect", `en ${q}`)
  }
  for (const q of ["下载", "下载客户端", "客户端", "安装", "download", "client", "install", "Moonlight", "V+", "Enhanced"]) {
    assert.equal(first("zh", q), "action:download", `zh ${q}`)
    assert.equal(first("en", q), "action:download", `en ${q}`)
  }
})

test("a setting never ranks above them for those words", () => {
  const r = search(buildIndex(docs("zh")), "配对")
  assert.equal(r.groups[0].type, "action")
  assert.ok(r.flat.findIndex((d) => d.type === "setting") > r.flat.findIndex((d) => d.id === "action:connect"))
})

test("the quick actions are the two lead actions", () => {
  assert.deepEqual(docs("zh").filter((d) => d.quick).map((d) => d.id), ["action:connect", "action:download"])
})
