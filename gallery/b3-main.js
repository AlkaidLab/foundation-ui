import { createApp } from "vue"
import "../src/css/all.css"
import "../src/vue/index.js"
import { applyTheme } from "../src/tokens/theme.js"
import B3 from "./B3Gallery.vue"

// The tiles of B3: ?theme=light|dark|black &seed=<hex> &style= &ids=<tile ids> &tiles=bold (the new designs; without it: as before) &tv=id:2 &sizes=id:s.m,... (the sizes to draw, default: what the tile offers)
const q = new URLSearchParams(location.search)
const seed = q.get("seed")
applyTheme(document.documentElement, { ...(seed ? { light: `#${seed.replace("#", "")}`, dark: `#${seed.replace("#", "")}` } : {}), black: q.get("theme") === "black", style: q.get("style") || undefined })
document.documentElement.dataset.motion = "reduced"
createApp(B3).mount("#app")
