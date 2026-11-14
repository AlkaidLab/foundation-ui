import test from "node:test"
import assert from "node:assert/strict"
import { COLOUR_PICTURE, WALLPAPERS, autoPick, colourPictureId } from "../src/appearance/wallpaper.js"

test("with Auto the colours come from one picture whatever the shape of the window", () => {
  for (const [w, h] of [[1920, 1080], [1440, 900], [1200, 800], [1100, 700], [760, 1000]]) {
    const shown = autoPick(null, w, h)
    assert.equal(colourPictureId("auto", shown), COLOUR_PICTURE, w + "x" + h)
  }
  assert.ok(WALLPAPERS[COLOUR_PICTURE])
})

test("a picture the person chose gives its own colours", () => {
  assert.equal(colourPictureId("vivi1", "vivi1"), "vivi1")
  assert.equal(colourPictureId("vivi2", "vivi2"), "vivi2")
  assert.equal(colourPictureId("file", null), null)
})
