// What an element of the window adds to its own context menu (SPEC-context-menu, "Project actions"). An element carries `data-ctx="kind:id"` (an overview tile, a stack, a client row, an application,
// a log line, a rail item) or a setting's `data-cfg="key"`; the part of the window that owns the thing registers a builder for the kind and returns the items. The provider asks the builders of every
// such ancestor of the element under the pointer, the nearest first.
//   register('tile', ({ id, el, texts }) => [{ id: 'resize', label, icon, children: [...] }, { id: 'remove', label, danger: true, run() {} }])
const builders = new Map()
/** Registers the builder of a kind; returns the function that removes it. */
export function registerContext(kind, builder) {
  const list = builders.get(kind) || []
  list.push(builder); builders.set(kind, list)
  return () => { const l = builders.get(kind) || []; const i = l.indexOf(builder); if (i >= 0) l.splice(i, 1) }
}
/** The items the builders of `kind` give for this element: [] when there is none. */
export function contextItemsOf(kind, ctx) {
  const out = []
  for (const b of builders.get(kind) || []) { try { out.push(...(b(ctx) || [])) } catch { /* a builder that fails adds nothing */ } }
  return out
}
/** The copy of an item that puts a text on the clipboard and says so (the product's `notice`); the same for every builder. */
export const copyWithNotice = (text, cb, T) => navigator.clipboard?.writeText(String(text)).then(() => cb?.notice?.(T.copied)).catch(() => { /* the clipboard is not offered */ })
