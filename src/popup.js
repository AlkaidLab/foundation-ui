// The page of a host's menu window (MMenuPopup) with only what it needs: the Material menu elements, the menu component, the theme helpers. A host that shows context menus in a window of its
// own loads this, not the whole library: the window is made at start and stays for the whole session.
import '@material/web/menu/menu.js'
import '@material/web/menu/menu-item.js'
import '@material/web/divider/divider.js'
export { default as MMenuPopup } from './vue/MMenuPopup.vue'
export { themeSnapshot, applyThemeSnapshot, POPUP_PAD } from './contextmenu/popup.js'
export { default as MTrayPopup } from './vue/MTrayPopup.vue'
