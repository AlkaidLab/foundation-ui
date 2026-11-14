import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const read = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8")

test("a row with several end buttons can wrap them below the text instead of crushing the title", () => {
  const item = read("vue/MItem.vue")
  assert.match(item, /wrap: \{ type: Boolean, default: false \}/)
  assert.match(item, /'m-item--wrap': props\.wrap/)
  const css = read("css/layout.css")
  assert.match(css, /\.m-item--wrap \{ flex-wrap: wrap;/)
  assert.match(css, /\.m-item--wrap \.m-item__body \{ flex: 1 1 12em; \}/)
})
