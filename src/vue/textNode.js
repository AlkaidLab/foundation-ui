// Text that Vue patches in place. An element whose only child is an interpolation is updated by setting its textContent, which replaces its text node (a childList
// mutation, a new node every time a live number changes); a text vnode is updated by its nodeValue (one characterData change, the node stays). Use it for numbers and
// lines that change while the page is idle: <span><MText :text="value" /></span>.
import { Text, h } from 'vue'

export const MText = (props) => h(Text, String(props.text ?? ''))
MText.props = ['text']
