import assert from "node:assert/strict"
import test from "node:test"
import { APPLIES, appliesOf, appliesText } from "../src/settings/applies.js"
import { SETTING_META } from "../src/settings/meta.js"

test("pin_prompt is a two-way choice that defaults to the full-screen entry", () => {
  assert.equal(SETTING_META.pin_prompt.control, "seg")
  assert.equal(SETTING_META.pin_prompt.def, "fullscreen")
  assert.equal(SETTING_META.pin_prompt.tier, 2)
})

test("pin_prompt applies at the next pairing request, on every platform, in both languages", () => {
  for (const platform of ["windows", "linux", "macos", ""]) assert.equal(appliesOf("pin_prompt", platform), APPLIES.REQUEST)
  assert.equal(APPLIES.REQUEST, "next-request")
  assert.equal(appliesText("pin_prompt", "windows", "zh"), "下一次配对请求生效")
  assert.equal(appliesText("pin_prompt", "windows", "en"), "Applies at the next pairing request")
  // the other classes are as they were
  assert.equal(appliesOf("port"), APPLIES.RESTART)
  assert.equal(appliesOf("max_bitrate"), APPLIES.NOW)
})
