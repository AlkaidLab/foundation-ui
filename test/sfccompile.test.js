import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { compileTemplate, parse } from '@vue/compiler-sfc'

// every component's template compiles (a duplicate attribute or a broken directive is caught here, not only in a browser)
test('every .vue template of the package compiles', () => {
  const dir = new URL('../src/vue/', import.meta.url)
  const bad = []
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.vue'))) {
    const { descriptor, errors } = parse(fs.readFileSync(new URL(f, dir), 'utf8'), { filename: f })
    if (errors.length) { bad.push(`${f}: ${errors[0].message || errors[0]}`); continue }
    if (!descriptor.template) continue
    const r = compileTemplate({ source: descriptor.template.content, filename: f, id: 'x', compilerOptions: { isCustomElement: (t) => t.startsWith('md-') } })
    if (r.errors.length) bad.push(`${f}: ${r.errors[0].message || r.errors[0]}`)
  }
  assert.deepEqual(bad, [])
})
