<script>
import { defineComponent, h } from 'vue'
import { parseMarkdown } from '../announcements/markdown.js'

// Draws a Markdown text (announcements) as real elements. The reader (announcements/markdown.js) yields plain nodes, so no HTML is ever inserted and a link or an image is https only.
// A click on a link goes to `open-url` (the product opens it in the browser).
export default defineComponent({
  name: 'MMarkdown',
  props: { source: { type: String, default: '' } },
  emits: ['open-url'],
  setup(props, { emit }) {
    const inline = (nodes) => nodes.map((n, i) => {
      switch (n.t) {
        case 'text': return n.v
        case 'br': return h('br', { key: i })
        case 'strong': return h('strong', { key: i }, inline(n.c))
        case 'em': return h('em', { key: i }, inline(n.c))
        case 'del': return h('del', { key: i }, inline(n.c))
        case 'code': return h('code', { key: i }, n.v)
        case 'link': return h('a', { key: i, href: n.href, target: '_blank', rel: 'noopener noreferrer', onClick: (e) => { e.preventDefault(); emit('open-url', n.href) } }, inline(n.c))
        case 'img': return h('img', { key: i, class: 'm-md__img', src: n.src, alt: n.alt, loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer', draggable: 'false' })
        default: return null
      }
    })
    const block = (b, i) => {
      switch (b.t) {
        case 'h': return h(`h${Math.min(6, b.level + 1)}`, { key: i, class: 'm-md__h' }, inline(b.c))
        case 'p': return h('p', { key: i }, inline(b.c))
        case 'ul': return h('ul', { key: i }, b.items.map((c, j) => h('li', { key: j }, inline(c))))
        case 'ol': return h('ol', { key: i }, b.items.map((c, j) => h('li', { key: j }, inline(c))))
        case 'quote': return h('blockquote', { key: i }, b.c.map(block))
        case 'code': return h('pre', { key: i }, h('code', b.v))
        case 'hr': return h('hr', { key: i })
        default: return null
      }
    }
    return () => h('div', { class: 'm-md' }, parseMarkdown(props.source).map(block))
  },
})
</script>
