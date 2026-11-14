import test from 'node:test'
import assert from 'node:assert/strict'
import { undeclaredIdentifiers } from '../scripts/scope-check.mjs'

// the check that stands under the overview of the panel: it must find a name that is only used, and not trip on the everyday shapes of a script
const vue = (body) => '<script setup>' + body + '</script>'
const NL = String.fromCharCode(10)

test('finds the helper that is used but never declared, and nothing else', () => {
  const body = ["import { ref } from 'vue'", 'const n = ref(0)', 'const go = () => { say(n.value) }'].join(NL)
  assert.deepEqual(undeclaredIdentifiers(vue(body), { filename: 'x.vue' }).map((x) => x.name), ['say'])
})

test('the everyday shapes are not uses: member names, keys, shorthand of declared names, macros, import.meta, import attributes', () => {
  const body = [
    "import data from './data.json' with { type: 'json' }",
    "import { computed, defineProps } from 'vue'",
    'const props = defineProps({ id: String })',
    'const host = computed(() => ({ name: data.name, props: props.id, dev: import.meta.env.DEV }))',
    "const on = (type) => type === 'a'",
    "const item = { name: 'x' }",
  ].join(NL)
  assert.deepEqual(undeclaredIdentifiers(vue(body), { filename: 'x.vue' }), [])
})

test('a plain module is checked too, and a name declared later in the file counts', () => {
  const src = ['const go = () => later()', 'function later() { return 1 }'].join(NL)
  assert.deepEqual(undeclaredIdentifiers(src, { filename: 'plain.js' }), [])
})
