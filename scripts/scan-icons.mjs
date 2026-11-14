// Finds every Material Symbols name the code asks for, in this package and in the products that use it, so the glyph set (src/icons/icons.js) is built from what is used and a name that is not
// in the set cannot ship. Static: the names written in templates and scripts (icon="x", icon: 'x', <MIcon name="x">, the quoted names inside an icon expression or an ICON map). Names that
// are built at run time (a name that comes from data) are found by the run-time collection of MIcon (globalThis.__mIconMissing), which the sweep scripts read.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const PACKAGE_ROOT = path.resolve(here, '..')
export const SYMBOLS_DIR = path.join(PACKAGE_ROOT, 'node_modules/@material-symbols/svg-400/rounded')
export const DEFAULT_ROOTS = [
  path.join(PACKAGE_ROOT, 'src'),
  path.resolve(PACKAGE_ROOT, '../ds5-panel-redesign/src/renderer'),
  path.resolve(PACKAGE_ROOT, '../ds5-web-advanced/src_assets/common/assets/web'),
]
const SKIP_DIR = /(^|[\\/])(node_modules|tests?|dist|build|public|assets|_harness|locale|fonts|i18n)([\\/]|$)/
const SKIP_FILE = /(^|[\\/])(icons|names|labels|searchIndex|rowLines)\.js$|\.test\.js$|\.min\.js$/

const exists = new Map()
export const isSymbol = (name) => {
  if (!exists.has(name)) exists.set(name, fs.existsSync(path.join(SYMBOLS_DIR, `${name}.svg`)))
  return exists.get(name)
}

function* walk(dir) {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (!SKIP_DIR.test(p)) yield* walk(p) } else if (/\.(vue|js|mjs)$/.test(e.name) && !SKIP_FILE.test(p)) yield p
  }
}

const NAME = /^[a-z][a-z0-9_]*$/
const quoted = (text) => [...text.matchAll(/["'`]([a-z][a-z0-9_]*)["'`]/g)].map((m) => m[1])

/** The expressions that set an icon: `icon: <expr>` in script (up to the comma or brace of its own level) and `:icon="<expr>"` in a template. */
function* iconExpressions(text) {
  for (const m of text.matchAll(/:(?:icon|title-icon|trail-icon)="([^"]+)"/g)) yield m[1]
  for (const m of text.matchAll(/(?<![:\w-])icon\s*:\s*/g)) {
    let depth = 0
    let i = m.index + m[0].length
    const start = i
    for (; i < text.length; i++) {
      const c = text[i]
      if (c === '(' || c === '[' || c === '{') depth++
      else if (c === ')' || c === ']' || c === '}') { if (depth === 0) break; depth-- }
      else if ((c === ',' && depth === 0) || c === '\n') break
    }
    yield text.slice(start, i)
  }
}

/**
 * { explicit: Map(name -> files), tokens: Map(name -> files) }
 *   explicit: a single name written as the icon of something (a typo here is an error, the name is not in the symbol set)
 *   tokens:   quoted words inside an icon expression or an ICON map that are names of symbols (words that are not symbols are other words)
 */
export function scanIcons(roots = DEFAULT_ROOTS) {
  const explicit = new Map()
  const tokens = new Map()
  const add = (map, name, file) => { if (!map.has(name)) map.set(name, new Set()); map.get(name).add(file) }
  for (const root of roots) for (const file of walk(root)) {
    const text = fs.readFileSync(file, 'utf8')
    const rel = path.relative(path.resolve(PACKAGE_ROOT, '..'), file)
    for (const m of text.matchAll(/(?<![:\w-])(?:icon|iconName|titleIcon|trailIcon|leadIcon|statusIcon)\s*[:=]\s*["']([a-z][a-z0-9_]*)["']/g)) add(explicit, m[1], rel)
    for (const m of text.matchAll(/(?<![:\w-])(?:icon|title-icon|trail-icon|lead-icon|icon-name)=["']([a-z][a-z0-9_]*)["']/g)) add(explicit, m[1], rel)
    for (const m of text.matchAll(/<MIcon\b[^>]*?(?<![:\w-])name=["']([a-z][a-z0-9_]*)["']/g)) add(explicit, m[1], rel)
    // a choice between two names in the expression that sets an icon (icon: cond ? 'x' : 'y', :icon="cond ? 'x' : 'y'"), also when the condition has commas of its own
    for (const expr of iconExpressions(text)) for (const m of expr.matchAll(/\?\s*["']([a-z][a-z0-9_]*)["']\s*:\s*["']([a-z][a-z0-9_]*)["']/g)) { add(explicit, m[1], rel); add(explicit, m[2], rel) }
    // an expression: icon: a ? 'x' : 'y', :icon="..." , :name="..." on MIcon
    for (const m of text.matchAll(/\bicon\s*:\s*([^,}\n]*\?[^,}\n]*)/g)) for (const n of quoted(m[1])) if (isSymbol(n)) add(tokens, n, rel)
    for (const m of text.matchAll(/:(?:icon|name|title-icon|trail-icon)="([^"]+)"/g)) for (const n of quoted(m[1])) if (isSymbol(n)) add(tokens, n, rel)
    // a map or a list of names: const ICON = { a: 'x' }, ICONS_OF = [...], iconOf = { ... }
    for (const m of text.matchAll(/\b(?:const|let|var)\s+[A-Za-z_]*[Ii][Cc][Oo][Nn][A-Za-z_]*\s*=\s*(\{[^}]*\}|\[[^\]]*\])/g)) for (const n of quoted(m[1])) if (isSymbol(n)) add(tokens, n, rel)
    for (const m of text.matchAll(/\bicons\s*:\s*(\[[^\]]*\]|\{[^}]*\})/g)) for (const n of quoted(m[1])) if (isSymbol(n)) add(tokens, n, rel)
  }
  return { explicit, tokens }
}

/** Every name the scan found that is a symbol, and the explicit names that are not (typos, names the symbol set does not have). */
export function scanResult(roots) {
  const { explicit, tokens } = scanIcons(roots)
  const names = new Set()
  const unknown = []
  for (const [name, files] of explicit) { if (NAME.test(name) && isSymbol(name)) names.add(name); else unknown.push({ name, files: [...files] }) }
  for (const name of tokens.keys()) names.add(name)
  return { names: [...names].sort(), unknown }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { names, unknown } = scanResult()
  console.log(`${names.length} icon names used`)
  if (unknown.length) { for (const u of unknown) console.log(`NOT A SYMBOL: ${u.name}  (${u.files.slice(0, 2).join(', ')})`); process.exitCode = 1 }
}
