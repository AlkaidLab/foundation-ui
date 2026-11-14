import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { connectTexts } from "../src/clients/index.js"

// the client card of the downloads page without a system filter (MClientCard)
const src = (p) => readFileSync(new URL(p, import.meta.url), "utf8")
const card = src("../src/vue/MClientCard.vue")
const css = src("../src/css/connect.css")

test("MClientCard is exported by the vue barrel", () => {
  assert.match(src("../src/vue/index.js"), /export \{ default as MClientCard \} from "\.\/MClientCard\.vue"/)
})

test("a card offers one primary download; the other builds are a menu, not a list; the details stay one click away", () => {
  assert.equal((card.match(/m-ccard__go/g) || []).length >= 3, true)
  assert.match(card, /role="menu"/)
  assert.match(card, /role="menuitem"/)
  assert.match(card, /emit\(.open.\)/)
  assert.match(card, /emit\(.open-url., best\.url\)/)
  assert.match(card, /<MLinkActions/)
})

test("the row of actions never wraps and the grid reflows by the room of the page", () => {
  assert.match(css, /\.m-ccard__acts \{[^}]*flex-wrap: nowrap/)
  assert.match(css, /\.m-cgrid \{[^}]*repeat\(auto-fill, minmax\(min\(100%, 264px\), 1fr\)\)/)
})

test("the menu entry for the details has its words in both languages", () => {
  for (const l of ["zh", "en"]) assert.ok(connectTexts(l).allFiles.length > 3)
})
