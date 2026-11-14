import { createApp } from "vue"
import "../src/css/all.css"
import "../src/vue/index.js"
import { applyTheme } from "../src/tokens/theme.js"
import Page from "./AnnouncementGallery.vue"

// The announcement tile on the smart page (?state=idle|live|after &news=unread|read|none &theme=light|dark): the tile is the real one, the tiles around it are placeholders in the plan's order and sizes.
const q = new URLSearchParams(location.search)
applyTheme(document.documentElement, { black: q.get("theme") === "black" })
document.documentElement.dataset.motion = "reduced"
createApp(Page).mount("#app")
