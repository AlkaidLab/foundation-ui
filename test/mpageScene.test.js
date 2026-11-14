import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/vue/MPage.vue', import.meta.url), 'utf8')

test('MPage tells a scene that is not MScene that a page is there, and when it goes (the frame of the control panel draws its Back this way)', () => {
  assert.match(src, /onMounted\(\(\) => scene\?\.pageMounted\?\.\(\)\)/)
  assert.match(src, /onBeforeUnmount\(\(\) => scene\?\.pageUnmounted\?\.\(\)\)/)
})
test('the arrow is still drawn from the scene or the page\'s own back, in the title row before the title', () => {
  assert.match(src, /<button v-if="back \|\| scene\?\.canBack\.value" type="button" class="m-page__back"[^>]*@click="back \? emit\('back'\) : scene\.back\(\)">/)
  assert.ok(src.indexOf('class="m-page__back"') < src.indexOf('class="m-page__title"'))
})
