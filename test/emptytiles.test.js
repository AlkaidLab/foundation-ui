// An empty tile is a designed state: the card's name, an icon, one line that says what is missing and the one action that fills it
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { smallOf } from '../src/vue/homeSmall.js'
import { hasNoData } from '../src/vue/homeSizes.js'
const T = { emptyStart: '开始串流', emptyPair: '配对设备', emptyAddress: '设置公网访问', emptyNews: '查看公告' }

test('every kind of empty tile offers the one action that fills it, with the products\' own action types', () => {
  const last = smallOf({ id: 'last-session', kind: 'widget', title: '上次串流', data: { type: 'rows', rows: [], empty: '还没有串流过' } }, T)
  assert.equal(last.empty, true); assert.deepEqual(last.action, { label: '开始串流', type: 'guide-go', value: { id: 'connect' } })
  const online = smallOf({ id: 'clients-online', kind: 'widget', title: '在线', data: { type: 'clients', items: [], empty: '没有设备在线' } }, T)
  assert.deepEqual(online.action, { label: '配对设备', type: 'table-action' })
  const news = smallOf({ id: 'announcements', kind: 'widget', title: '公告', data: { type: 'news', items: [], empty: '没有公告' } }, T)
  assert.deepEqual(news.action, { label: '查看公告', type: 'open', value: 'announcements' })
  const recent = smallOf({ id: 'recent-games', kind: 'widget', title: '最近玩过', data: { type: 'apps', items: [], empty: '还没有玩过' } }, T)
  assert.equal(recent.action.type, 'guide-go')
})

test('a public address that is not set is an empty tile that leads to setting it', () => {
  const card = { id: 'public-address', kind: 'widget', title: '公网地址', data: { type: 'address', saved: '', texts: { unset: '未设置' } } }
  assert.equal(hasNoData(card.data), true)
  const v = smallOf(card, T)
  assert.equal(v.empty, true); assert.equal(v.value, '未设置'); assert.deepEqual(v.action, { label: '设置公网访问', type: 'detail' })
  const set = smallOf({ ...card, data: { type: 'address', saved: 'play.example.com', texts: {}, path: { word: '可达', tone: 'ok' } } }, T)
  assert.ok(!set.empty)
})

test('the square empty tile is centred: name, icon, one line, one button', () => {
  const css = fs.readFileSync(new URL('../src/css/dash.css', import.meta.url), 'utf8')
  assert.match(css, /\.m-dsmall\.is-empty \.m-dsmall__in \{ display: flex; flex-direction: column; align-items: center; justify-content: center/)
  assert.match(css, /\.m-dsmall\.is-empty \.m-dsmall__act \{ height: 30px/)
})
