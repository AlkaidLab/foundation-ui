// md-outlined-text-field is a form-associated custom element: its native <input> lives in a shadow root, so the browser's implicit submission (Enter in a text control of a
// form) never happens for it. This is the repair the Material Web docs give: Enter in a text field asks the form to submit with form.requestSubmit(), which is the real
// submit path (the submit event, the form's own handler, validation), not a call of the handler. Use it as the form's @keydown.
//  - a composition in progress (an IME choosing a word) is left alone, as are Shift/Ctrl/Alt/Meta + Enter, a textarea (Enter is a new line), and anything that is not a text field
//    (a button or a checkbox keeps its own Enter/Space).
export function submitOnEnter(event) {
  if (event.key !== 'Enter' || event.defaultPrevented || event.isComposing || event.keyCode === 229) return false
  if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return false
  const field = event.target
  if (!field?.matches?.('md-outlined-text-field, md-filled-text-field') || field.type === 'textarea') return false
  const form = event.currentTarget
  if (typeof form?.requestSubmit !== 'function') return false
  event.preventDefault()
  form.requestSubmit()
  return true
}
