// The tree of markdown.js drawn as Vue elements. Nothing here writes markup into the page: text goes in as text, so it is escaped by Vue; only addresses that markdown.js has already approved reach href and src.
// Links leave through `open` (the product's way to open an address outside the window), never as a navigation of the window itself.
import { h } from 'vue'

const HEADING_TAG = ['h3', 'h4', 'h5', 'h6', 'h6', 'h6']

function inlineNodes(nodes, ctx) {
  return nodes.map((n, i) => {
    switch (n.t) {
      case 'text': return n.v
      case 'br': return h('br', { key: i })
      case 'code': return h('code', { key: i, class: 'dm-md__code' }, n.v)
      case 'b': return h('strong', { key: i }, inlineNodes(n.c, ctx))
      case 'i': return h('em', { key: i }, inlineNodes(n.c, ctx))
      case 'del': return h('del', { key: i }, inlineNodes(n.c, ctx))
      case 'a': return h('a', { key: i, class: 'dm-md__a', href: n.href, rel: 'noopener noreferrer', target: '_blank', onClick: (e) => { e.preventDefault(); ctx.open?.(n.href) } }, inlineNodes(n.c, ctx))
      case 'img': return h('img', {
        key: i, class: 'dm-md__img', src: n.src, alt: n.alt, loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer', draggable: 'false', title: n.alt || undefined,
        onClick: () => (ctx.image || ctx.open)?.(n.src),
        onError: (e) => { e.target.classList.add('dm-md__img--broken') },
      })
      default: return ''
    }
  })
}

function blockNodes(blocks, ctx) {
  return blocks.map((b, i) => {
    switch (b.t) {
      case 'h': return h(HEADING_TAG[b.level - 1], { key: i, class: ['dm-md__h', `dm-md__h--${b.level}`] }, inlineNodes(b.c, ctx))
      case 'p': return h('p', { key: i }, inlineNodes(b.c, ctx))
      case 'code': if (ctx.code) return ctx.code(b, i)
        return h('pre', { key: i, class: 'dm-md__pre', tabindex: 0, 'data-lang': b.lang || undefined }, [h('code', null, b.text)])
      case 'quote': return h('blockquote', { key: i, class: 'dm-md__quote' }, blockNodes(b.c, ctx))
      case 'hr': return h('hr', { key: i, class: 'dm-md__hr' })
      case 'ul': case 'ol': return h(b.t, { key: i, class: ['dm-md__list', b.items.some((x) => x.task !== null) && 'dm-md__list--tasks'], start: b.t === 'ol' && b.start !== 1 ? b.start : undefined },
        b.items.map((it, k) => h('li', { key: k, class: it.task === null ? undefined : ['dm-md__task', it.task && 'dm-md__task--done'] }, [it.task === null ? null : h('span', { class: 'dm-md__box', 'aria-hidden': 'true' }), ...blockNodes(it.c, ctx)])))
      case 'table': return h('div', { key: i, class: 'dm-md__table' }, [h('table', null, [
        h('thead', null, [h('tr', null, b.head.map((c, k) => h('th', { key: k, style: b.align[k] ? { textAlign: b.align[k] } : undefined }, inlineNodes(c, ctx))))]),
        h('tbody', null, b.rows.map((r, k) => h('tr', { key: k }, r.map((c, j) => h('td', { key: j, style: b.align[j] ? { textAlign: b.align[j] } : undefined }, inlineNodes(c, ctx)))))),
      ])])
      default: return null
    }
  })
}

/** Vue nodes of a list of blocks (markdown.js parseMarkdown). `ctx.open(url)` opens an address outside the window; `ctx.image(src)` opens a picture instead (the viewer of the Issue Form view); `ctx.code(block, key)` draws a code block in its own way. */
export const renderBlocks = (blocks, ctx = {}) => blockNodes(blocks, ctx)
