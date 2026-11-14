// The bitrate ceiling (max_bitrate) as the Web UI and the panel both show and write it. One place, so the two cannot disagree.
// The host keeps it in Kbps and answers it as a string ("65000"); a key the config file does not have is not sent at all.
// 0 is not "no limit" and not "off": the client decides the bitrate (the host's default), so the word for it is 自动 / Automatic.

/** The presets of the chips, in Mbps (0 = automatic). */
export const BITRATE_PRESETS_MBPS = Object.freeze([0, 20, 40, 80, 120, 200])
/** The top of the shared slider: 33 positions after automatic, ending at 800 Mbps (what the host takes). */
export const BITRATE_SLIDER_MAX_PROGRESS = 33
/** Kept for callers that use the logical range for nudge buttons and labels. */
export const BITRATE_SLIDER_MAX_MBPS = 800

// The scale of the slider: ten positions per decade, spaced by the Renard series R10 (ISO 3:1973, preferred numbers), from 0.5 to 800 Mbps.
//   Why a geometric scale: what a person notices of a bitrate is a relative change, so a step of 1 Mbps is huge at 2 Mbps and invisible at 200 Mbps.
//   With a constant ratio between positions (the 10th root of 10, 1.26, before rounding) the largest error of picking the nearest position is the same
//   at every size, about 12 %. R10 was chosen over R5 (1.58, too coarse for the 5 to 50 Mbps where most streams are) and R20 (1.12, 20 positions a decade
//   make the track hard to hit with a finger). The recommended encoder bitrates that public guidance gives for common formats (a 1080p60 H.265 or AV1
//   stream 12 Mbps, 1440p60 24, 2160p60 35; the same formats in H.264 17, 34 and 50) all sit within about 10 % of a position, so each format has a position of its own.
//   The values are the R10 numbers of the standard, 1.00 1.25 1.60 2.00 2.50 3.15 4.00 5.00 6.30 8.00, times the decade, in whole Kbps.
//   Position 0 is automatic (the client decides). Sources: m3e-iso3-renard-20261115, m3e-youtube-live-bitrate-20261115 (docs/authority/source-index.tsv).
const R10 = Object.freeze([100, 125, 160, 200, 250, 315, 400, 500, 630, 800])
const TICKS_KBPS = Object.freeze([0, ...[1, 10, 100, 1000].flatMap((decade) => R10.map((r) => r * decade)).filter((k) => k >= 500 && k <= BITRATE_SLIDER_MAX_MBPS * 1000)])

/** Whole Kbps from what the host sent: a number or a numeric string; a missing, empty, negative or unreadable value is 0 (automatic), never a made-up number. */
export function bitrateKbps(raw) {
  const n = Math.round(Number(raw))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** The slider position (whole Mbps) of a stored value: 0 for automatic. The stored value itself is not rewritten by showing it. */
export const bitrateSliderMbps = (raw) => Math.round(bitrateKbps(raw) / 1000)

/** The slider position of a stored Kbps value: the nearest position by ratio (a value between two positions is shown at the closer one, in its own words by bitrateText); 0 is automatic. */
export function bitrateSliderProgress(raw) {
  const kbps = bitrateKbps(raw)
  if (kbps <= 0) return 0
  let best = 1
  let bestDistance = Infinity
  for (let i = 1; i < TICKS_KBPS.length; i += 1) {
    const distance = Math.abs(Math.log(kbps / TICKS_KBPS[i]))
    if (distance < bestDistance - 1e-12) { best = i; bestDistance = distance }
  }
  return best
}

/** The whole Kbps of a slider position; zero is always automatic, a position outside the track is the nearest end. */
export function bitrateFromProgress(value) {
  const p = Math.min(BITRATE_SLIDER_MAX_PROGRESS, Math.max(0, Math.round(Number(value) || 0)))
  return TICKS_KBPS[p]
}

/** Fractions (0..1 of the track) of the visible marks: the start (automatic) and each power of ten, 1, 10 and 100 Mbps. */
export const bitrateSegmentMarks = Object.freeze([0, 1000, 10000, 100000].map((kbps) => (kbps ? bitrateSliderProgress(kbps) : 0) / BITRATE_SLIDER_MAX_PROGRESS))

/**
 * The positions of a segmented bitrate slider that is limited to minKbps..maxKbps (a live session's target is never automatic and never under 1 Mbps): { min, max } in slider positions.
 * Pass them as :min / :max of the slider together with bitrateSliderProgress / bitrateFromProgress, so a page with a limited range draws the same scale as the one with automatic.
 */
export function bitrateSliderSpan(minKbps = 0, maxKbps = BITRATE_SLIDER_MAX_MBPS * 1000) {
  return { min: bitrateSliderProgress(minKbps), max: bitrateSliderProgress(maxKbps) }
}

/**
 * Fractions (0..1 of the slider) where the values of the chips stand, so a mark sits under the value a chip writes (the nearest position, exactly under it for a preset that is an R10 number): presets in Mbps (0 = automatic has no mark, it is the start of the track).
 * `minKbps` / `maxKbps` are the limits of the slider (see bitrateSliderSpan); a preset outside them has no mark.
 */
export function bitrateChipMarks(presetsMbps = BITRATE_PRESETS_MBPS, minKbps = 0, maxKbps = BITRATE_SLIDER_MAX_MBPS * 1000) {
  const { min, max } = bitrateSliderSpan(minKbps, maxKbps)
  const marks = new Set()
  for (const m of presetsMbps) {
    const p = bitrateSliderProgress(m * 1000)
    if (m > 0 && p > min && p <= max && max > min) marks.add((p - min) / (max - min))
  }
  return Object.freeze([...marks].sort((a, b) => a - b))
}

/** The value to store for a slider position in Mbps (whole Kbps, never a float such as 65432.00000000001). */
export const bitrateFromMbps = (mbps) => {
  const n = Math.round(Number(mbps))
  return Number.isFinite(n) && n > 0 ? n * 1000 : 0
}

/** "65 Mbps", "65.4 Mbps", "0.5 Mbps"; '' for automatic. */
export const bitrateMbpsText = (raw) => {
  const kbps = bitrateKbps(raw)
  return kbps ? `${Math.round(kbps / 100) / 10} Mbps` : ''
}

/** The words for a stored value: its Mbps, or `autoText` for automatic. */
export const bitrateText = (raw, autoText) => bitrateMbpsText(raw) || autoText

/** Chips for the presets (values in Kbps, so a chip is chosen by equality and writes exactly what it names), plus one for a stored value that is none of them. */
export function bitrateChips(raw, autoText, presets = BITRATE_PRESETS_MBPS) {
  const kbps = bitrateKbps(raw)
  const chips = presets.map((m) => ({ value: m * 1000, label: m === 0 ? autoText : `${m} Mbps` }))
  if (kbps > 0 && !chips.some((c) => c.value === kbps)) chips.push({ value: kbps, label: bitrateMbpsText(kbps) })
  return chips.sort((a, b) => a.value - b.value) // automatic first, then by size: the same order on the Web UI and the panel
}

/**
 * The next value of a step button (Mbps, + or -) inside 0..maxMbps. Automatic steps up to one step and the lowest step goes back to automatic:
 * the buttons never jump from "the client decides" to the top of the range.
 */
export function bitrateNudge(raw, deltaMbps, maxMbps = BITRATE_SLIDER_MAX_MBPS) {
  const next = bitrateSliderMbps(raw) + deltaMbps
  return Math.min(maxMbps, Math.max(0, next)) * 1000
}
