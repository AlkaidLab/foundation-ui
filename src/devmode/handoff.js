// The two things the sign-in asks the person to do outside the window: open github.com/login/device and copy the code. Both answer true or false and never throw; the sheet says what to do by hand when it is false.
/** `open` is the product's openUrl (it opens the system browser and answers false when it could not); without one the window's own open is the last resort (a webview usually refuses it). */
export async function openAddress(url, { open = null, windowOpen = (...a) => globalThis.window?.open?.(...a) } = {}) {
  try { return open ? (await open(url)) !== false : !!windowOpen(url, '_blank', 'noopener') } catch { return false }
}
/** The clipboard API first (a webview may not allow it), then the old copy command on a hidden field. */
export async function copyText(text, { clipboard = globalThis.navigator?.clipboard, document: doc = globalThis.document } = {}) {
  try { await clipboard.writeText(text); return true } catch { /* refused or not there: the old way */ }
  try {
    const box = doc.createElement('textarea')
    box.value = text; box.setAttribute('readonly', ''); box.style.cssText = 'position:fixed;opacity:0'
    doc.body.appendChild(box); box.select()
    const done = !!doc.execCommand('copy')
    box.remove()
    return done
  } catch { return false }
}
