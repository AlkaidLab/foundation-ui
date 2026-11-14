import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { connectTexts } from "../src/clients/recommend.js"

test("the download tile has the words of its overflow menu in both languages", () => {
  for (const locale of ["zh", "en"]) {
    const T = connectTexts(locale)
    for (const key of ["copyLink", "share", "switchTo", "more", "download", "official"]) assert.ok(T[key], `${locale} ${key}`)
    assert.match(T.switchTo, /\{os\}/)
  }
})

test("the download tile at small and medium shows one button and one overflow, and the chips of the systems only at large", () => {
  const source = readFileSync(new URL("../src/vue/MDashDownload.vue", import.meta.url), "utf8")
  assert.match(source, /<MOsChips v-if="size === .l."/)
  assert.equal((source.match(/m-ddl__go/g) || []).length, 1)
  assert.match(source, /<MOverflow :items="menu"/)
  // the badge sits in the name column, under the name: it cannot overlap it
  assert.match(source, /<b>\{\{ name\(rec\.client\) \}\}<\/b><MClientTag :official="rec\.official"/)
})
