// The tags of a client card: the system and the architectures it comes in, read from the release data (the asset types of the release metadata,
// www.alkaidlab.com/release-metadata/<product>.json), never guessed. A client whose release data is not at hand shows no tag for the architectures; the stores
// (iOS, tvOS, HarmonyOS) have no release assets and name their system.
//
// Asset types seen in the metadata: windows-x64-installer, windows-x64-portable, windows-arm64-portable, macos-arm64-dmg, macos-x64-dmg, macos-universal-dmg,
// linux-x64-appimage, linux-arm64-appimage, steam-link-zip, android-apk (and `-alias` / `-zsync` / `file-other` entries, which add nothing).
//
// The Android client ships one universal APK; its native libraries were read from the APK of release 12.14.2 (lib/arm64-v8a, lib/armeabi-v7a), as the metadata
// does not carry them.
import { osName } from './catalogue.js'

export const ANDROID_ABIS = Object.freeze(['arm64-v8a', 'armeabi-v7a'])
const STORE_TAGS = Object.freeze({ ios: 'iOS / iPadOS', 'apple-tv': 'tvOS', harmony: 'HarmonyOS NEXT', baozi: 'HarmonyOS', crown: 'Android' })

const usable = (asset) => asset && typeof asset.type === 'string' && !/-alias$|-zsync$|^file-/.test(asset.type)
const archOf = (type) => (/-x64-/.test(type) ? 'x64' : /-arm64-/.test(type) ? 'arm64' : /-universal-/.test(type) ? 'universal' : '')
const ARCH_NAME = { windows: { x64: 'x64', arm64: 'ARM64' }, linux: { x64: 'x64', arm64: 'ARM64' }, macos: { x64: 'Intel', arm64: 'Apple Silicon' } }
// the order a system names its builds in: x64 then ARM64 on Windows and Linux, Apple Silicon then Intel on macOS
const ORDER = { windows: ['x64', 'arm64'], linux: ['x64', 'arm64'], macos: ['arm64', 'x64'] }

/** The tag of one target of a client: "Windows · x64 / ARM64", "macOS · Apple Silicon / Intel", "Linux · x64 / ARM64 · AppImage", "Android · arm64-v8a / armeabi-v7a"; '' when there is nothing real to say. */
export function targetTag(target, assets, locale = 'en') {
  const platform = target.platform
  if (STORE_TAGS[platform]) return STORE_TAGS[platform]
  const label = (platform === 'android-tv' ? 'Android TV' : platform === 'quest' ? 'Quest' : osName(target.os, locale))
  if (platform === 'android' || platform === 'android-tv' || platform === 'quest') return `${label} · ${ANDROID_ABIS.join(' / ')}`
  if (platform === 'steam') return 'Steam Link'
  const list = (assets || []).filter(usable).filter((a) => a.type.startsWith(`${target.os}-`))
  if (!list.length) return ''
  const names = ARCH_NAME[target.os] || {}
  const archs = (ORDER[target.os] || ['x64', 'arm64']).filter((a) => list.some((x) => archOf(x.type) === a))
  const universal = list.some((x) => archOf(x.type) === 'universal')
  const parts = archs.map((a) => names[a] || a)
  // macOS Enhanced: one universal build next to the two single ones. A universal build runs on both, so next to Apple Silicon AND Intel it says nothing more; the tag stays on one line
  // ("macOS · Apple Silicon / Intel", a card holds about 190 px of text). Universal is named when it is the only one, or next to a single architecture.
  const arch = [parts.length ? parts.join(' / ') : '', universal && parts.length < 2 ? 'Universal' : ''].filter(Boolean).join(' · ')
  const format = target.os === 'linux' && list.some((x) => /appimage$/.test(x.type)) ? 'AppImage' : ''
  return [label, arch, format].filter(Boolean).join(' · ')
}

/**
 * The tags of a client card. `assetsOf(client)` gives the release assets of the client's product (an array, or undefined while they are not read).
 * `only` is one target (a card of a system): its tag alone; without it one tag per system of the client.
 */
export function clientTags(client, assetsOf, locale = 'en', only = null) {
  const assets = assetsOf?.(client)
  const targets = only ? [only] : client.targets
  const seen = new Set()
  const tags = []
  for (const t of targets) {
    const tag = targetTag(t, assets, locale)
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    tags.push(tag)
  }
  return tags
}
