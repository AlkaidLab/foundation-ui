import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL("../src/css/expressive.css", import.meta.url), "utf8")

// A page that lives in the control panel's frame centres its sheet on the whole window with the shell's --m-frame-dx, and the width keeps the moved sheet inside the frame.
// Under 600 of the frame the sheet is a bottom sheet that spans the frame: there the offset must be dropped, or the full-width sheet keeps the shift of a frame whose middle
// is not the window's middle and its left side is cut off by the frame's own edge (the small-window report: the input row was not fully visible).
test("the centred sheet moves by the frame offset only while the offset keeps it inside the frame", () => {
  const base = css.match(/\.m-sheet--center \{[^}]*\}/)?.[0] ?? ""
  assert.match(base, /translate: var\(--m-frame-dx\) 0/)
  assert.match(base, /100vw - 2 \* max\(var\(--m-frame-dx\), -1 \* var\(--m-frame-dx\)\) - 24px/)
  const narrow = css.match(/@media \(max-width: 599\.98px\) \{[^@]*?\.m-sheet--center \{([^}]*)\}/)?.[1] ?? ""
  assert.match(narrow, /width: 100%/)
  assert.match(narrow, /translate: none/)
})
