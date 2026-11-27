import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { centresOnWindow } from '../src/vue/useModalBridge.js'

const css = readFileSync(new URL("../src/css/expressive.css", import.meta.url), "utf8")

// A page that lives in the control panel's frame centres its sheet on the whole window with the shell's --m-frame-dx, and the width keeps the moved sheet inside the frame.
// When the frame has no room for that (a detail pane beside a wide list puts the window's middle near its edge) the sheet stands in the middle of the frame at its full
// width: the shift is dropped there, and the width no longer depends on the offset, so it cannot shrink to a sliver (the reported vertical card of the picker).
// Under 600 of a standalone window the sheet is a bottom sheet; inside a frame it stays a centred dialog.
test("the centred sheet moves by the frame offset only while the frame has the room for it", () => {
  const base = css.match(/\.m-sheet--center \{[^}]*\}/)?.[0] ?? ""
  assert.match(base, /translate: var\(--m-frame-dx\) 0/)
  assert.match(base, /100vw - 2 \* max\(var\(--m-frame-dx\), -1 \* var\(--m-frame-dx\)\) - 24px/)
  const framed = css.match(/html\[data-m-frame='frame'\] \.m-sheet--center \{([^}]*)\}/)?.[1] ?? ""
  assert.match(framed, /width: min\(var\(--m-dialog-w, 600px\), calc\(100vw - 32px\)\)/)
  assert.match(framed, /translate: none/)
  const narrow = css.match(/html:not\(\[data-m-frame\]\) \.m-sheet--center \{([^}]*)\}/)?.[1] ?? ""
  assert.match(narrow, /width: 100%/)
  assert.match(narrow, /translate: none/)
})

test("a sheet stands in the window's middle only when the frame has room for a usable one", () => {
  assert.equal(centresOnWindow(793, -48), true, "a frame beside the rail: the window's middle is inside it")
  assert.equal(centresOnWindow(444, -228), false, "a detail pane beside a 360 px list: the middle is outside")
  assert.equal(centresOnWindow(300, -120), false, "a narrow frame, however far the middle is")
  assert.equal(centresOnWindow(900, 0), true, "a page in its own window: no offset")
})
