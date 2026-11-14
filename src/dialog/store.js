import { reactive } from 'vue'

/**
 * Questions and notices that stop the person (the Material 3 dialog): one queue for the window, shown by MDialogHost. `ask` has the call shape of the earlier
 * message boxes so a caller only changes its import: it resolves 'confirm' on the confirming button and rejects with 'cancel' (the cancel button) or 'close'
 * (Escape, only when `distinguish`; else it is 'cancel'). An `alert` (no cancel button) resolves when it is closed.
 * options: { title, message, type: 'info' | 'warning' | 'error' | 'success', confirmText, cancelText, cancel: bool, distinguish: bool, persistent: bool (the backdrop does not close it), danger: bool }
 */
export function createDialogStore() {
  const state = reactive({ queue: [], seq: 0 })
  function ask(options = {}) {
    return new Promise((resolve, reject) => {
      state.queue.push({ id: ++state.seq, cancel: true, distinguish: false, persistent: false, type: '', ...options, resolve, reject })
    })
  }
  const confirm = (message, title = '', options = {}) => ask({ ...options, message, title, cancel: options.showCancelButton !== false })
  const alert = (message, title = '', options = {}) => ask({ ...options, message, title, cancel: false })
  function settle(id, action) {
    const at = state.queue.findIndex((d) => d.id === id)
    if (at < 0) return
    const [item] = state.queue.splice(at, 1)
    if (action === 'confirm' || (!item.cancel && action !== 'cancel')) item.resolve('confirm')
    else item.reject(action === 'close' && item.distinguish ? 'close' : 'cancel')
  }
  return { state, ask, confirm, alert, settle, current: () => state.queue[0] || null }
}

let shared = null
export const useDialogs = () => (shared ||= createDialogStore())
export const resetDialogs = () => { shared = null }
