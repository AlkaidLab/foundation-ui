// The video format as one choice, written as the two codec modes the host reads. hevc_mode and av1_mode: 0 the host decides, 1 not offered, 2 offered, 3 offered with HDR / 10-bit.
//   自动     both codecs are offered or left to the host (0, 2 or 3 for each): the client chooses
//   H.264    neither is offered
//   HEVC     only HEVC is offered (AV1 is off)
//   AV1      only AV1 is offered (HEVC is off)
// "Allow HDR" is the same pair of keys seen the other way: a codec that is offered carries HDR when its mode is 3. H.264 cannot carry it. Pure: the pages, the first-run guide and the tests share it.
const off = (mode) => Number(mode) === 1
export const FORMATS = Object.freeze(['auto', 'h264', 'hevc', 'av1'])

export function formatOf(config) {
  const h = Number(config?.hevc_mode ?? 0)
  const a = Number(config?.av1_mode ?? 0)
  if (off(h) && off(a)) return 'h264'
  if (off(a)) return 'hevc'
  if (off(h)) return 'av1'
  return 'auto'
}
export const hdrOf = (config) => Number(config?.hevc_mode) === 3 || Number(config?.av1_mode) === 3

/** The modes a format and an HDR flag write: { hevc_mode, av1_mode }. */
export function modesFor(format, hdr) {
  if (format === 'h264') return { hevc_mode: 1, av1_mode: 1 }
  if (format === 'hevc') return { hevc_mode: hdr ? 3 : 2, av1_mode: 1 }
  if (format === 'av1') return { hevc_mode: 1, av1_mode: hdr ? 3 : 2 }
  return hdr ? { hevc_mode: 3, av1_mode: 3 } : { hevc_mode: 0, av1_mode: 0 }
}
