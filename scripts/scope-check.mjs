// Lists the identifiers a <script> block uses that the file declares, imports or is given nowhere: the mistake where a handler calls a helper that was
// copied in without its definition (a say(...) with no say). Only the script is checked; the template is compiled by Vue against its own bindings.
// Deliberately whole-file: a name declared anywhere in the file counts as declared, so what this finds is exactly "used but never declared or imported".
import { parse as parseSfc } from '@vue/compiler-sfc'
import { parse as parseJs } from '@babel/parser'
import { walk } from 'estree-walker'

// compile-time macros of <script setup>: they are gone before the browser sees the module
const MACROS = new Set(['defineProps', 'defineEmits', 'defineExpose', 'defineModel', 'defineOptions', 'defineSlots', 'withDefaults'])

// what a script may reach without importing it: the language, the web platform, and the two things every window of these products has
const GLOBALS = new Set([
  'arguments', 'undefined', 'NaN', 'Infinity', 'globalThis',
  'window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'location', 'history', 'performance', 'console', 'screen', 'visualViewport', 'innerWidth', 'innerHeight', 'outerWidth', 'outerHeight', 'scrollX', 'scrollY', 'self', 'top', 'parent', 'frames',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'queueMicrotask',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'Worker', 'EventSource', 'MessageChannel', 'MessagePort', 'BroadcastChannel',
  'AbortController', 'AbortSignal', 'Blob', 'File', 'FileReader', 'FormData', 'Headers', 'Request', 'Response', 'ReadableStream', 'WritableStream', 'TransformStream',
  'URL', 'URLSearchParams', 'Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'EvalError', 'URIError', 'AggregateError', 'Proxy', 'Reflect',
  'JSON', 'Math', 'Number', 'String', 'Boolean', 'Array', 'Object', 'Function', 'Symbol', 'Map', 'Set', 'WeakMap', 'WeakSet', 'WeakRef', 'BigInt', 'Promise', 'Date', 'RegExp',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent', 'structuredClone', 'crypto',
  'Intl', 'getComputedStyle', 'getSelection', 'matchMedia', 'scrollTo', 'scrollBy', 'open', 'close', 'alert', 'confirm', 'prompt', 'atob', 'btoa',
  'CustomEvent', 'Event', 'EventTarget', 'KeyboardEvent', 'MouseEvent', 'PointerEvent', 'TouchEvent', 'WheelEvent', 'InputEvent', 'ProgressEvent', 'MessageEvent', 'ErrorEvent', 'ClipboardEvent', 'DragEvent', 'StorageEvent', 'HashChangeEvent', 'PopStateEvent', 'BeforeUnloadEvent', 'FocusEvent', 'PromiseRejectionEvent',
  'Node', 'Element', 'HTMLElement', 'HTMLCanvasElement', 'HTMLImageElement', 'HTMLVideoElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'SVGElement', 'Image', 'Audio', 'Option', 'CharacterData', 'Text', 'Comment', 'DocumentFragment', 'ShadowRoot', 'Range', 'Selection', 'DOMTokenList', 'NodeList',
  'MutationObserver', 'ResizeObserver', 'IntersectionObserver', 'PerformanceObserver', 'ReportingObserver',
  'AudioContext', 'OfflineAudioContext', 'MediaStream', 'MediaRecorder', 'MediaDeviceInfo', 'RTCPeerConnection', 'RTCDataChannel', 'SpeechSynthesisUtterance',
  'CanvasRenderingContext2D', 'Path2D', 'DOMMatrix', 'DOMPoint', 'DOMRect', 'DOMRectReadOnly', 'Gamepad', 'GamepadHapticActuator', 'WakeLock', 'ClipboardItem', 'Credential', 'CredentialsContainer', 'PublicKeyCredential',
  'CSS', 'Notification', '__PROD__', '__DEV__', 'setImmediate', 'clearImmediate',
])

const patternNames = (node, into) => {
  if (!node) return
  if (node.type === 'Identifier') { into.add(node.name); return }
  if (node.type === 'ObjectPattern') { for (const p of node.properties) patternNames(p.type === 'RestElement' ? p.argument : p.value, into); return }
  if (node.type === 'ArrayPattern') { for (const el of node.elements) patternNames(el, into); return }
  if (node.type === 'AssignmentPattern') { patternNames(node.left, into); return }
  if (node.type === 'RestElement') { patternNames(node.argument, into) }
}

/** [{ name, line }] of every identifier the script blocks of the source reference without declaring, importing or being handed it. */
export function undeclaredIdentifiers(source, { filename = 'component.vue' } = {}) {
  const blocks = []
  if (filename.endsWith('.vue')) {
    const { descriptor, errors } = parseSfc(source, { filename })
    if (errors && errors.length) return errors.map((e) => ({ name: '<parse error>', line: e.loc?.start?.line ?? 0, message: String(e.message) }))
    if (descriptor.scriptSetup) blocks.push(descriptor.scriptSetup.content)
    if (descriptor.script && descriptor.script !== descriptor.scriptSetup) blocks.push(descriptor.script.content)
    if (!blocks.length) return []
  } else blocks.push(String(source))

  const declared = new Set()
  const used = new Map()
  for (const code of blocks) {
    const ast = parseJs(code, { sourceType: 'module', allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true, allowSuperOutsideMethod: true })
    // the names of a re-export (export { x } from '...') belong to the other module; they are not uses of this file's bindings
    const reexported = new Set()
    walk(ast, { enter(node) { if ((node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') && node.source) for (const s of node.specifiers || []) reexported.add(s.local.name) } })
    walk(ast, {
      enter(node, parent) {
        if (node.type === 'Identifier') {
          if (parent) {
            if ((parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression') && parent.property === node && !parent.computed) return
            if (parent.type === 'MetaProperty' || parent.type === 'ImportAttribute') return
            // babel names an object literal's entry ObjectProperty (an ESTree Property); both spellings, and a method's place, are keys, not uses
            if ((parent.type === 'Property' || parent.type === 'ObjectProperty' || parent.type === 'ObjectMethod' || parent.type === 'MethodDefinition' || parent.type === 'ClassProperty') && parent.key === node && !parent.computed && !parent.shorthand) return
            if (String(parent.type).startsWith('Import') && (parent.imported === node || parent.local === node)) return
            if (parent.type === 'ExportSpecifier' && parent.local === node && reexported.has(node.name)) return
            if (parent.type === 'ExportSpecifier' && parent.exported === node && parent.local !== node) return
            if ((parent.type === 'LabeledStatement' || parent.type === 'BreakStatement' || parent.type === 'ContinueStatement') && parent.label === node) return
          }
          if (!used.has(node.name)) used.set(node.name, node.loc?.start?.line ?? 0)
        }
        // every name the file binds, anywhere in it
        if (node.type === 'VariableDeclarator') patternNames(node.id, declared)
        else if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration' || node.type === 'TSEnumDeclaration') { if (node.id) declared.add(node.id.name) }
        else if (node.type === 'CatchClause') patternNames(node.param, declared)
        if (Array.isArray(node.params)) for (const p of node.params) patternNames(p, declared)
        if (node.type === 'ImportDeclaration') {
          for (const s of node.specifiers || []) declared.add(s.local.name)
        }
      },
    })
  }
  return [...used].filter(([name]) => !declared.has(name) && !MACROS.has(name) && !GLOBALS.has(name)).map(([name, line]) => ({ name, line }))
}
