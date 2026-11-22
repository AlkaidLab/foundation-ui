// The adapter tile never cuts an address: the name is shortened by a rule and cut at a word; the address of a row has its own flex item that does not shrink
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { shortNicName } from '../src/vue/nicNames.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('the name of an adapter is shortened by a rule: bracketed ids, (R) marks, trailing boilerplate, a vendor in front of three more words', () => {
  assert.equal(shortNicName('ZeroTier One [154a350c867ec550]'), 'ZeroTier One')
  assert.equal(shortNicName('Intel(R) Ethernet Connection I219-V'), 'Ethernet Connection I219-V')
  assert.equal(shortNicName('Realtek PCIe GbE Family Controller'), 'Realtek PCIe GbE')
  assert.equal(shortNicName('Intel(R) Wi-Fi 6E AX211 160MHz'), 'Wi-Fi 6E AX211 160MHz')
  for (const n of ['以太网 11', 'Ethernet', 'Hyper-V Virtual Ethernet Adapter', '']) assert.equal(shortNicName(n), n, n)
})

test('the tile writes the address whole: its own item in a row, one nowrap line in the card, and the name is cut at a word', () => {
  const v = read('../src/vue/tiles/TileNet.vue'), css = read('../src/css/tiles-metrics.css')
  assert.match(v, /<span v-if="o\.ip" class="m-tnet__subip m-dnum">\{\{ o\.ip \}\}<\/span>/)
  assert.match(v, /<MTrimWords :text="p\.label \|\| p\.name" \/>/)
  assert.match(css, /\.m-tnet__subip \{ flex: none; white-space: nowrap; \}/)
  assert.match(css, /:is\(\.m-dash__cell, \.m-dock__cell\) \.m-tnet__ip, :is\(\.m-dash__cell, \.m-dock__cell\) \.m-tnet__ip\[data-fit-wrap\] \{ white-space: nowrap !important; overflow-wrap: normal; \}/)
  const w = read('../src/vue/MTrimWords.vue')
  assert.match(w, /words\.slice\(0, n\)\.join\(props\.sep\)\}…/)
})
