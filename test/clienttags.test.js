import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CLIENTS, clientsForOs } from '../src/clients/catalogue.js'
import { clientTags, targetTag } from '../src/clients/tags.js'

// the asset lists of the real release metadata (read from www.alkaidlab.com/release-metadata on 2026-11-03: type and name of the latest release)
const meta = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8')).channels.latest.assets
const assets = { 'moonlight-vplus-pc': meta('moonlight-vplus-pc'), 'moonlight-vplus': meta('moonlight-vplus'), 'moonlight-macos-enhanced': meta('moonlight-macos-enhanced') }
const of = (client) => assets[client.product]
const client = (id) => CLIENTS.find((c) => c.id === id)
const tag = (id, platform) => clientTags(client(id), of, 'en', client(id).targets.find((t) => t.platform === platform))[0]

test('the tags name the system and the architectures the release really has', () => {
  assert.equal(tag('vplus-desktop', 'windows'), 'Windows · x64 / ARM64')
  assert.equal(tag('vplus-desktop', 'macos'), 'macOS · Apple Silicon') // this release has no Intel build: nothing is claimed
  assert.equal(tag('vplus-desktop', 'linux'), 'Linux · x64 / ARM64 · AppImage')
  assert.equal(tag('vplus-desktop', 'steam'), 'Steam Link')
  assert.equal(tag('macos-enhanced', 'macos'), 'macOS · Apple Silicon / Intel') // Universal is left out: it runs on both and the longer tag wrapped to two lines
  assert.equal(targetTag({ os: 'macos', platform: 'macos' }, [{ type: 'macos-universal-dmg' }], 'en'), 'macOS · Universal')
  assert.equal(targetTag({ os: 'macos', platform: 'macos' }, [{ type: 'macos-arm64-dmg' }, { type: 'macos-universal-dmg' }], 'en'), 'macOS · Apple Silicon · Universal')
  assert.equal(tag('vplus-android', 'android'), 'Android · arm64-v8a / armeabi-v7a')
  assert.equal(tag('voidlink', 'ios'), 'iOS / iPadOS')
  assert.equal(tag('vplus-harmony', 'harmony'), 'HarmonyOS NEXT')
})

test('without release data a tag does not claim an architecture', () => {
  assert.equal(clientTags(client('vplus-desktop'), () => undefined, 'en', client('vplus-desktop').targets[0]).length, 0)
  assert.equal(targetTag({ os: 'windows', platform: 'windows' }, [], 'en'), '')
  // aliases and checksum files add nothing
  assert.equal(targetTag({ os: 'windows', platform: 'windows' }, [{ type: 'windows-arm64-portable-alias' }, { type: 'file-other' }], 'en'), '')
})

test('a client of several systems has one tag per system in the full list', () => {
  const tags = clientTags(client('vplus-desktop'), of, 'en')
  assert.deepEqual(tags.map((t) => t.split(' · ')[0]), ['Windows', 'macOS', 'Linux', 'Steam Link'])
  assert.equal(clientsForOs('android').length, 3)
})
