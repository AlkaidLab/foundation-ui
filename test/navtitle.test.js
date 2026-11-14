import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// where the list is a page of its own (a narrow window), its category is the title at the top left, as 设置 has it: every destination of the bottom bar has one
const list = fs.readFileSync(new URL('../src/vue/MNavList.vue', import.meta.url), 'utf8')

test('the list pane can write its category as the title of the page, with the markup of a page title', () => {
  assert.match(list, /titled: \{ type: Boolean, default: false \}/)
  assert.match(list, /<div v-if="titled && title" class="m-page m-navlist__titlebar"><header class="m-page__bar"><h1 class="m-page__title">\{\{ title \}\}<\/h1><\/header><\/div>/)
  assert.ok(list.indexOf('m-navlist__titlebar') < list.indexOf('<slot name="top" />'), 'the title is the first thing of the list')
})
