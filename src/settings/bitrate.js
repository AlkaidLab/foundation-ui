// The bitrate ceiling (max_bitrate) as the Web UI and the panel both show and write it. One place, so the two cannot disagree.
// The host keeps it in Kbps and answers it as a string ("65000"); a key the config file does not have is not sent at all.
// 0 is not "no limit" and not "off": the client decides the bitrate (the host's default), so the word for it is 自动 / Automatic.

/** The presets of the chips, in Mbps (0 = automatic). */
export const BITRATE_PRESETS_MBPS = Object.freeze([0, 20, 40, 80, 120, 200])
/** The top of the shared segmented slider: 67 positions, ending at 800 Mbps. */
export const BITRATE_SLIDER_MAX_PROGRESS = 67
/** Kept for callers that use the logical range for nudge buttons and labels. */
export const BITRATE_SLIDER_MAX_MBPS = 800

// V+ PR 724 uses a piecewise scale: fine steps below 200 Mbps and wider steps
// above it. Position zero remains the host/client automatic value in Foundation.
// Source: ba-vplus-pr724-20261109.
const SEGMENT_ENDS = Object.freeze([0, 9, 24, 39, 49, 59, 63, BITRATE_SLIDER_MAX_PROGRESS])

/** Whole Kbps from what the host sent: a number or a numeric string; a missing, empty, negative or unreadable value is 0 (automatic), never a made-up number. */
export function bitrateKbps(raw) {
  const n = Math.round(Number(raw))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** The slider position (whole Mbps) of a stored value: 0 for automatic. The stored value itself is not rewritten by showing it. */
export const bitrateSliderMbps = (raw) => Math.round(bitrateKbps(raw) / 1000)

/** Convert a stored Kbps value to the shared segmented slider position. */
export function bitrateSliderProgress(raw) {
  const kbps = bitrateKbps(raw)
  if (kbps <= 0) return 0
  const progress = kbps < 5000 ? Math.min(8, 1 + Math.round((kbps - 500) / 500))
    : kbps <= 20000 ? 9 + Math.round((kbps - 5000) / 1000)
      : kbps <= 50000 ? 24 + Math.round((kbps - 20000) / 2000)
        : kbps <= 100000 ? 39 + Math.round((kbps - 50000) / 5000)
          : kbps <= 200000 ? 49 + Math.round((kbps - 100000) / 10000)
            : kbps <= 400000 ? 59 + Math.round((kbps - 200000) / 50000)
              : 63 + Math.round((kbps - 400000) / 100000)
  return Math.min(BITRATE_SLIDER_MAX_PROGRESS, Math.max(0, progress))
}

/** Convert a segmented slider position to whole Kbps; zero is always automatic. */
export function bitrateFromProgress(value) {
  const p = Math.min(BITRATE_SLIDER_MAX_PROGRESS, Math.max(0, Math.round(Number(value) || 0)))
  if (p === 0) return 0
  if (p < 9) return 500 + (p - 1) * 500
  if (p <= 24) return 5000 + (p - 9) * 1000
  if (p <= 39) return 20000 + (p - 24) * 2000
  if (p <= 49) return 50000 + (p - 39) * 5000
  if (p <= 59) return 100000 + (p - 49) * 10000
  if (p <= 63) return 200000 + (p - 59) * 50000
  return 400000 + (p - 63) * 100000
}

/** Fractions for the visible segment boundaries, including automatic at zero. */
export const bitrateSegmentMarks = Object.freeze(SEGMENT_ENDS.map((p) => p / BITRATE_SLIDER_MAX_PROGRESS))

/**
 * The positions of a segmented bitrate slider that is limited to minKbps..maxKbps (a live session's target is never automatic and never under 1 Mbps): { min, max } in slider positions.
 * Pass them as :min / :max of the slider together with bitrateSliderProgress / bitrateFromProgress, so a page with a limited range draws the same scale as the one with automatic.
 */
export function bitrateSliderSpan(minKbps = 0, maxKbps = BITRATE_SLIDER_MAX_MBPS * 1000) {
  return { min: bitrateSliderProgress(minKbps), max: bitrateSliderProgress(maxKbps) }
}

/**
 * Fractions (0..1 of the slider) where the values of the chips stand, so a mark sits exactly under the value a chip writes: presets in Mbps (0 = automatic has no mark, it is the start of the track).
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
