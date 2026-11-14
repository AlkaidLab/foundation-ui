import test from 'node:test'
import assert from 'node:assert/strict'
import { DISPLAY_TREE, DISPLAY_TREE_PLACES, LEGACY_DISPLAY_KEYS, displayMapping, displayTreePlaces, homeOf, homesOf } from '../src/settings/displayTree.js'
import { DISPLAY_PLACES, SEARCH_INDEX, displayPlaces, parseSettingsHash } from '../src/settings/index.js'

const oldKeys = Object.values(LEGACY_DISPLAY_KEYS).flat()

test('DT1: the tree has the seven approved places in order and 高级 is the last, apart from the rest', () => {
  assert.deepEqual(DISPLAY_TREE_PLACES, ['output', 'modes', 'hdr', 'quality', 'encoders', 'virtual', 'advanced'])
  assert.deepEqual(DISPLAY_PLACES.map((p) => p.id), DISPLAY_TREE_PLACES, 'the places of the model are the tree')
  assert.equal(DISPLAY_TREE.filter((p) => p.last).length, 1)
  assert.equal(DISPLAY_TREE.at(-1).place, 'advanced')
  assert.deepEqual(displayTreePlaces('linux').map((p) => p.place), ['output', 'modes', 'encoders', 'advanced'])
  assert.deepEqual(displayPlaces('linux').map((p) => p.id), ['output', 'modes', 'encoders', 'advanced'])
  assert.equal(new Set(DISPLAY_TREE.map((p) => p.icon)).size, DISPLAY_TREE.length, 'every place has an icon of its own')
})

test('DT2: the sections are the final titles of the brief, in order', () => {
  const sections = Object.fromEntries(DISPLAY_TREE.map((p) => [p.place, p.sections.map((s) => s.id)]))
  assert.deepEqual(sections.output, ['target', 'mode', 'prep', 'headless', 'advanced'])
  assert.deepEqual(sections.modes, ['policy', 'resolutions', 'rates'])
  assert.deepEqual(sections.hdr, ['status', 'system', 'calibration', 'advanced'])
  assert.deepEqual(sections.encoders, ['bitrate', 'format', 'encoder', 'effective', 'advanced'])
  assert.deepEqual(sections.advanced, ['capture', 'gpu', 'compat', 'sync', 'reset'])
})

test('DT3 mapping: every old display/video/capture/encoder setting key is in the new tree exactly once', () => {
  assert.equal(new Set(oldKeys).size, oldKeys.length, 'the list of old keys has no duplicate')
  for (const key of oldKeys) assert.equal(homesOf(key).length, 1, `${key} has exactly one home: ${JSON.stringify(homesOf(key))}`)
  const mapping = displayMapping()
  assert.equal(mapping.length, oldKeys.length)
  assert.ok(mapping.every((row) => row.to && row.to.place && row.to.section))
})

test('DT3 mapping: a key listed in a section is never also a shortcut elsewhere, and a shortcut names a key that has a home', () => {
  for (const p of DISPLAY_TREE) for (const s of p.sections) for (const key of s.shortcuts || []) {
    assert.ok(homeOf(key), `${key} (a shortcut on ${p.place}/${s.id}) has a home`)
    assert.notDeepEqual(homeOf(key), { place: p.place, section: s.id })
  }
})

test('DT3 mapping: moved keys land where the brief puts them', () => {
  const at = (key) => `${homeOf(key).place}/${homeOf(key).section}`
  assert.equal(at('max_bitrate'), 'encoders/bitrate')
  assert.equal(at('output_name'), 'output/target')
  assert.equal(at('capture_target'), 'output/target')
  assert.equal(at('display_device_prep'), 'output/prep')
  assert.equal(at('vdd_headless_create'), 'output/headless')
  assert.equal(at('resolutions'), 'modes/resolutions')
  assert.equal(at('fps'), 'modes/rates')
  assert.equal(at('codec_enable_hdr'), 'hdr/status')
  assert.equal(at('hdr_prep'), 'hdr/system')
  assert.equal(at('hdr_enhanced'), 'hdr/advanced')
  assert.equal(at('vdd_vulkan_hdr_bridge'), 'hdr/advanced')
  assert.equal(at('hdr_luminance_analysis'), 'hdr/advanced')
  for (const key of ['codec_strategy', 'hevc_mode', 'av1_mode']) assert.equal(at(key), 'encoders/format')
  assert.equal(at('encoder'), 'encoders/encoder')
  for (const key of ['nvenc_preset', 'qsv_preset', 'amd_quality', 'sw_tune', 'vt_coder', 'min_threads']) assert.equal(at(key), 'encoders/advanced')
  assert.equal(at('vdd_keep_enabled'), 'virtual/device')
  assert.equal(at('nvenc_vdd_force_vsync'), 'advanced/sync', 'the NVIDIA vsync card is an advanced setting even though its name says nvenc')
  assert.equal(at('mat_live'), 'advanced/sync')
  assert.equal(at('adapter_name'), 'advanced/gpu')
  assert.equal(at('capture'), 'advanced/capture')
})

test('DT4 routes: an old address of 显示与视频 lands on the new place, by key and by place', () => {
  const to = (hash) => parseSettingsHash(hash, SEARCH_INDEX)
  assert.deepEqual(to('#tab=display&sub=video'), { tab: 'display', sub: 'advanced' }, 'the old 捕获与视频 is 高级')
  assert.deepEqual(to('#tab=av'), { tab: 'display', sub: 'advanced' })
  assert.deepEqual(to('#tab=advanced'), { tab: 'display', sub: 'advanced' })
  assert.deepEqual(to('#display'), { tab: 'display', sub: 'output' }, 'the first place')
  assert.deepEqual(to('#tab=display&sub=modes&focus=max_bitrate'), { tab: 'display', sub: 'encoders', focus: 'max_bitrate' }, 'the key decides')
  assert.deepEqual(to('#tab=display&sub=virtual&focus=vdd_headless_create'), { tab: 'display', sub: 'output', focus: 'vdd_headless_create' })
  assert.deepEqual(to('#tab=display&sub=encoders&focus=hdr_enhanced'), { tab: 'display', sub: 'hdr', focus: 'hdr_enhanced' })
  assert.deepEqual(to('#tab=display&sub=video&focus=adapter_name'), { tab: 'display', sub: 'advanced', focus: 'adapter_name' })
  assert.deepEqual(to('#nvenc_vdd_force_vsync'), { tab: 'display', sub: 'advanced', focus: 'nvenc_vdd_force_vsync' })
  assert.deepEqual(to('#mat_live'), { tab: 'display', sub: 'advanced', focus: 'mat_live' })
  assert.deepEqual(to('#tab=encoders&sub=nv&focus=nvenc_preset'), { tab: 'display', sub: 'encoders', focus: 'nvenc_preset' })
})

test('DT5 search: every key of the display pages that the index lists is in the tree, and every tree key is searchable', () => {
  const indexed = SEARCH_INDEX.filter((e) => e.params.tab === 'display' || e.id === 'mat_live').map((e) => e.id)
  for (const key of indexed) assert.equal(homesOf(key).length, 1, `${key} is in the index and has one home`)
  for (const p of DISPLAY_TREE) for (const s of p.sections) {
    const entries = SEARCH_INDEX.filter((e) => homesOf(e.id).some((h) => h.place === p.place && h.section === s.id))
    for (const e of entries) assert.equal(e.params.sub, p.place, `${e.id} is searched at its home`)
  }
})
