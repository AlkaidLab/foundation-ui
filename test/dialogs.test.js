import test from 'node:test'
import assert from 'node:assert/strict'
import { createDialogStore } from '../src/dialog/store.js'

test('a confirmation resolves confirm on the confirming button and rejects cancel on the other', async () => {
  const d = createDialogStore()
  const yes = d.confirm('卸载驱动？', '卸载')
  d.settle(d.current().id, 'confirm')
  assert.equal(await yes, 'confirm')
  const no = d.confirm('卸载驱动？', '卸载')
  d.settle(d.current().id, 'cancel')
  await assert.rejects(no, (e) => e === 'cancel')
})

test('Escape is cancel, or close when the caller tells them apart; an alert resolves when it is closed', async () => {
  const d = createDialogStore()
  const a = d.confirm('x', 'y')
  d.settle(d.current().id, 'close')
  await assert.rejects(a, (e) => e === 'cancel')
  const b = d.ask({ message: 'x', distinguish: true })
  d.settle(d.current().id, 'close')
  await assert.rejects(b, (e) => e === 'close')
  const c = d.alert('完成', '重启')
  assert.equal(d.current().cancel, false)
  d.settle(d.current().id, 'close')
  assert.equal(await c, 'confirm')
})

test('questions come one at a time in the order they were asked', async () => {
  const d = createDialogStore()
  const first = d.confirm('一', '')
  const second = d.confirm('二', '')
  assert.equal(d.current().message, '一')
  d.settle(d.current().id, 'confirm')
  await first
  assert.equal(d.current().message, '二')
  d.settle(d.current().id, 'confirm')
  assert.equal(await second, 'confirm')
})
