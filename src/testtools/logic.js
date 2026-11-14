// The streaming test tools (ui-toolbox-expand): what each one computes, as plain functions, so the pages only draw. Nothing here reads a host: a tool runs in the window it is opened in
// (the panel, or the Web UI in the browser of the client) and judges what that window and its display and speakers do.

/* ---- 画面测试图 ---- */
export const PATTERNS = Object.freeze(['bars', 'ramp', 'black', 'white', 'sharp', 'chroma', 'hdr'])
/** The eight bars of a colour-bar test: white, yellow, cyan, green, magenta, red, blue, black (full range 8-bit). */
export const BARS = Object.freeze([[255, 255, 255], [255, 255, 0], [0, 255, 255], [0, 255, 0], [255, 0, 255], [255, 0, 0], [0, 0, 255], [0, 0, 0]])
/** The code values of a gray ramp with `steps` bands from black to white at `bits` per channel: [{ level (0..1), code }]. A band that looks like its neighbour is banding. */
export const rampSteps = (steps = 64, bits = 8) => Array.from({ length: steps }, (_, i) => { const max = 2 ** bits - 1; const code = Math.round((i / (steps - 1)) * max); return { level: code / max, code } })
/** The squares of the near-black test: the 8-bit codes 0 to 24 (16 = black of video range). A person sees where the squares start to differ from black. */
export const nearBlack = () => Array.from({ length: 25 }, (_, code) => ({ code, video: code === 16 }))
/** The squares of the near-white test: codes 230 to 255 (235 = white of video range). */
export const nearWhite = () => Array.from({ length: 26 }, (_, i) => ({ code: 230 + i, video: 230 + i === 235 }))
/** The steps of the HDR test: each patch as a share of the peak and as the PQ code of that luminance at a 1000-cd/m² peak (SMPTE ST 2084). */
export function hdrSteps(peak = 1000, shares = [0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 1]) {
  const m1 = 2610 / 16384, m2 = 2523 / 4096 * 128, c1 = 3424 / 4096, c2 = 2413 / 4096 * 32, c3 = 2392 / 4096 * 32
  return shares.map((s) => { const y = (s * peak) / 10000; const p = ((c1 + c2 * y ** m1) / (1 + c3 * y ** m1)) ** m2; return { share: s, nits: Math.round(s * peak), pq: Math.round(p * 1023) } })
}

/* ---- 帧率与卡顿测试 ---- */
const median = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0 }
/** From the times of the frames (ms, as requestAnimationFrame gives them): the rate the window ran at, the 1 % low, the frames that took 1.5 times the usual or more, and the longest gap. */
export function paceStats(times) {
  if (!Array.isArray(times) || times.length < 3) return null
  const gaps = times.slice(1).map((t, i) => t - times[i])
  const usual = median(gaps)
  const sorted = [...gaps].sort((a, b) => b - a)
  const worst = sorted.slice(0, Math.max(1, Math.floor(gaps.length * 0.01)))
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
  return { frames: times.length, usualMs: usual, refreshHz: usual > 0 ? 1000 / usual : 0, avgFps: avg > 0 ? 1000 / avg : 0, lowFps: 1000 / (worst.reduce((a, b) => a + b, 0) / worst.length), janks: gaps.filter((g) => g >= usual * 1.5).length, longestMs: sorted[0] }
}

/* ---- 音画同步测试 ---- */
/** The seconds of the beeps: one a second, each flash at the same time. `from` is the audio clock's time now; the first one is a little later so that it can be scheduled. */
export const syncTicks = (from, count = 10, lead = 0.3) => Array.from({ length: count }, (_, i) => from + lead + i)

/* ---- 声道测试 ---- */
export const LAYOUTS = Object.freeze({ stereo: ['L', 'R'], 'surround5.1': ['L', 'R', 'C', 'LFE', 'SL', 'SR'], 'surround7.1': ['L', 'R', 'C', 'LFE', 'BL', 'BR', 'SL', 'SR'] })
/** The index of an output channel of a layout in the order Windows and Web Audio use (L R C LFE BL BR SL SR; 5.1: L R C LFE SL SR), or -1. */
export const channelIndex = (layout, name) => (LAYOUTS[layout] || []).indexOf(name)
/** Whether the output can play a layout: the destination has at least as many channels. */
export const canPlayLayout = (layout, maxChannels) => (LAYOUTS[layout] || []).length <= (maxChannels || 2)
/** The pan of a channel when the output has two channels only (stereo test): -1 left, 1 right. */
export const panOf = (name) => (name === 'L' ? -1 : name === 'R' ? 1 : 0)

/* ---- 键盘、鼠标、触控 ---- */
/** The keys that are down now and the most there were at once (rollover): a keyboard that reports fewer than the fingers on it ghosts. */
export function createKeyTracker() {
  const down = new Set(); let max = 0
  return {
    down: (code) => { down.add(code); max = Math.max(max, down.size); return down.size },
    up: (code) => { down.delete(code); return down.size },
    clear: () => down.clear(),
    keys: () => [...down],
    get max() { return max },
    reset: () => { down.clear(); max = 0 },
  }
}
/**
 * The keyboard drawn by the keyboard test: rows of [KeyboardEvent.code, label, width in key units]; a number alone is a gap. Codes, not characters, so the layout of the
 * person's keyboard (AZERTY, Dvorak) does not move the drawing. The main block is 15 units wide; the arrows sit apart on the right.
 */
export const KEYBOARD_ROWS = Object.freeze([
  [['Escape', 'Esc', 1], 1, ['F1', 'F1', 1], ['F2', 'F2', 1], ['F3', 'F3', 1], ['F4', 'F4', 1], 0.5, ['F5', 'F5', 1], ['F6', 'F6', 1], ['F7', 'F7', 1], ['F8', 'F8', 1], 0.5, ['F9', 'F9', 1], ['F10', 'F10', 1], ['F11', 'F11', 1], ['F12', 'F12', 1]],
  [['Backquote', '`', 1], ['Digit1', '1', 1], ['Digit2', '2', 1], ['Digit3', '3', 1], ['Digit4', '4', 1], ['Digit5', '5', 1], ['Digit6', '6', 1], ['Digit7', '7', 1], ['Digit8', '8', 1], ['Digit9', '9', 1], ['Digit0', '0', 1], ['Minus', '-', 1], ['Equal', '=', 1], ['Backspace', '⌫', 2]],
  [['Tab', 'Tab', 1.5], ['KeyQ', 'Q', 1], ['KeyW', 'W', 1], ['KeyE', 'E', 1], ['KeyR', 'R', 1], ['KeyT', 'T', 1], ['KeyY', 'Y', 1], ['KeyU', 'U', 1], ['KeyI', 'I', 1], ['KeyO', 'O', 1], ['KeyP', 'P', 1], ['BracketLeft', '[', 1], ['BracketRight', ']', 1], ['Backslash', '\\', 1.5]],
  [['CapsLock', 'Caps', 1.75], ['KeyA', 'A', 1], ['KeyS', 'S', 1], ['KeyD', 'D', 1], ['KeyF', 'F', 1], ['KeyG', 'G', 1], ['KeyH', 'H', 1], ['KeyJ', 'J', 1], ['KeyK', 'K', 1], ['KeyL', 'L', 1], ['Semicolon', ';', 1], ['Quote', "'", 1], ['Enter', 'Enter', 2.25]],
  [['ShiftLeft', 'Shift', 2.25], ['KeyZ', 'Z', 1], ['KeyX', 'X', 1], ['KeyC', 'C', 1], ['KeyV', 'V', 1], ['KeyB', 'B', 1], ['KeyN', 'N', 1], ['KeyM', 'M', 1], ['Comma', ',', 1], ['Period', '.', 1], ['Slash', '/', 1], ['ShiftRight', 'Shift', 2.75]],
  [['ControlLeft', 'Ctrl', 1.25], ['MetaLeft', 'Win', 1.25], ['AltLeft', 'Alt', 1.25], ['Space', '', 6.25], ['AltRight', 'Alt', 1.25], ['MetaRight', 'Win', 1.25], ['ContextMenu', 'Menu', 1.25], ['ControlRight', 'Ctrl', 1.25]],
])
export const KEYBOARD_ARROWS = Object.freeze([[null, ['ArrowUp', '↑'], null], [['ArrowLeft', '←'], ['ArrowDown', '↓'], ['ArrowRight', '→']]])
/** Every code the drawing has. */
export const KEYBOARD_CODES = Object.freeze(new Set([...KEYBOARD_ROWS.flat().filter(Array.isArray).map((k) => k[0]), ...KEYBOARD_ARROWS.flat().filter(Boolean).map((k) => k[0])]))
/** The name shown for a key that is not in the drawing (a numpad key, a media key): KeyboardEvent.code written for a person. */
export const codeLabel = (code) => String(code || '').replace(/^Key|^Digit/, '').replace(/([a-z])([A-Z0-9])/g, '$1 $2')
/** MouseEvent.buttons (a bit mask) as the five buttons of a mouse. */
export const mouseButtons = (mask = 0) => ({ left: !!(mask & 1), right: !!(mask & 2), middle: !!(mask & 4), back: !!(mask & 8), forward: !!(mask & 16) })
/** MouseEvent.button (the one that changed) as the same names. */
export const MOUSE_BUTTON_NAMES = Object.freeze(['left', 'middle', 'right', 'back', 'forward'])
/** The wheel zone's gauge: the last tick as a fraction of the gauge's half height (-1 up .. 1 down), clamped, so a hard flick does not leave the gauge. */
export const wheelGauge = (delta, full = 240) => Math.max(-1, Math.min(1, (Number(delta) || 0) / full))
/** The rate of a mouse from the times of its move events (ms): events arrive at its polling rate while it moves; the median gap is the estimate. */
export function pollingRate(times) {
  if (!Array.isArray(times) || times.length < 5) return 0
  const gaps = times.slice(1).map((t, i) => t - times[i]).filter((g) => g > 0 && g < 50)
  const m = median(gaps)
  return m > 0 ? Math.round(1000 / m) : 0
}

/* ---- 防休眠 ---- */
export const AWAKE_OPTIONS = Object.freeze([{ id: '30', minutes: 30 }, { id: '60', minutes: 60 }, { id: '180', minutes: 180 }, { id: 'open', minutes: 0 }])
/** Seconds left of a hold that started at `startedAt` for `minutes` (0: until it is switched off, null), never below zero. */
export const awakeLeft = (startedAt, minutes, now = Date.now()) => (minutes > 0 ? Math.max(0, Math.round((startedAt + minutes * 60000 - now) / 1000)) : null)

/* ---- 输入延迟 ---- */
/** From the delays (ms) of the presses so far: the last, the mean, the best, the worst and the spread (worst minus best). Nothing before the first press. */
export function delayStats(samples) {
  if (!Array.isArray(samples) || !samples.length) return null
  const sum = samples.reduce((a, b) => a + b, 0)
  return { count: samples.length, last: samples.at(-1), mean: sum / samples.length, best: Math.min(...samples), worst: Math.max(...samples), spread: Math.max(...samples) - Math.min(...samples) }
}
/** How long to wait before the next cue of the reaction test (ms): never sooner than `min`, spread over `span` by a draw in [0, 1). */
export const cueDelay = (draw, min = 800, span = 2200) => Math.round(min + Math.min(0.999999, Math.max(0, draw)) * span)

/* ---- 麦克风电平 ---- */
/** The level of a block of samples (-1..1) as dB relative to full scale: the root mean square; silence is -Infinity, clamped to `floor`. */
export function levelDb(block, floor = -90) {
  if (!block || !block.length) return floor
  let sum = 0
  for (let i = 0; i < block.length; i++) sum += block[i] * block[i]
  const db = 20 * Math.log10(Math.sqrt(sum / block.length) || 1e-9)
  return Math.max(floor, db)
}
/** The highest absolute sample of a block as dB relative to full scale, clamped to `floor`; 0 dB or more is clipping. */
export function peakDb(block, floor = -90) {
  if (!block || !block.length) return floor
  let peak = 0
  for (let i = 0; i < block.length; i++) { const a = Math.abs(block[i]); if (a > peak) peak = a }
  return Math.max(floor, 20 * Math.log10(peak || 1e-9))
}
/** The place of a level on the meter, 0..1, over the span from `floor` to 0 dB. */
export const meterShare = (db, floor = -60) => Math.min(1, Math.max(0, (db - floor) / -floor))
/** A peak marker that holds the highest value for `hold` ms and then falls by `fall` dB per second. */
export function createPeakHold(hold = 1200, fall = 24, floor = -90) {
  let value = floor, at = 0
  return {
    push(db, now) {
      if (db >= value) { value = db; at = now } else if (now - at > hold) { value = Math.max(floor, value - (fall * (now - at - hold)) / 1000); at = now - hold }
      return value
    },
    get value() { return value },
    reset() { value = floor; at = 0 },
  }
}

/* ---- 手柄 ---- */
/** The names of the buttons of a pad with the standard mapping (W3C Gamepad), by index. */
export const PAD_BUTTONS = Object.freeze(['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'L3', 'R3', '↑', '↓', '←', '→', 'Guide'])
export const padButtonName = (i, standard = true) => (standard && PAD_BUTTONS[i]) || `#${i}`
/** A stick axis with a dead zone: inside it the value is 0, outside it the range is stretched so that it starts at 0. */
export const withDeadzone = (v, zone = 0.08) => { const a = Math.abs(v); return a <= zone ? 0 : Math.sign(v) * Math.min(1, (a - zone) / (1 - zone)) }
/** The two sticks of a pad as { x, y, r } (r: the length, 0..1 after the dead zone), from its axes. */
export function stickOf(axes, pair, zone = 0.08) {
  const x = axes?.[pair * 2] ?? 0, y = axes?.[pair * 2 + 1] ?? 0
  const r = Math.hypot(x, y)
  const k = r > 1 ? 1 / r : 1
  return { x: x * k, y: y * k, r: Math.min(1, withDeadzone(r, zone)) }
}
/** The report rate of a pad (Hz) from the timestamps of its state (ms) at every frame: only changes of the timestamp are reports; 0 until there are enough of them. */
export function padRate(stamps) {
  if (!Array.isArray(stamps) || stamps.length < 6) return 0
  const reports = stamps.filter((t, i) => i === 0 || t !== stamps[i - 1])
  if (reports.length < 6) return 0
  const gaps = reports.slice(1).map((t, i) => t - reports[i]).filter((g) => g > 0 && g < 100).sort((a, b) => a - b)
  return gaps.length ? Math.round(1000 / gaps[Math.floor(gaps.length / 2)]) : 0
}
/** The vendor and product ids out of the id string a browser gives a pad ("Xbox 360 Controller (STANDARD GAMEPAD Vendor: 045e Product: 028e)"), or null. */
export function padIds(id) {
  const m = /Vendor:\s*([0-9a-f]{4}).*Product:\s*([0-9a-f]{4})/i.exec(String(id || '')) || /([0-9a-f]{4})-([0-9a-f]{4})/i.exec(String(id || ''))
  return m ? { vendor: m[1].toLowerCase(), product: m[2].toLowerCase() } : null
}

/**
 * What a rumble test says on the screen, from what was tried: `host` the answer of the host (POST /api/dualsense/rumble-test), `hostError` why asking the host failed ({ status, message }),
 * `browser` what the pad's own actuator did ('complete', 'preempted', 'error' with `message`, or 'none' when the pad lists no actuator). Every line is { tone: 'ok' | 'warn' | 'err', key, ...fields }:
 * a pulse that left the host is "sent" and never "felt" (the host cannot know), a missing pad or a refusal says why.
 */
export function rumbleLines({ host = null, hostError = null, browser = null } = {}) {
  const lines = []
  if (host) {
    const ms = Number(host.duration_ms) || 0, n = Number(host.pads) || 0
    if (host.result === 'sent') lines.push({ tone: 'ok', key: 'hostSent', n, ms })
    else if (host.result === 'no_pad') lines.push({ tone: 'warn', key: 'hostNoPad' })
    else if (host.result === 'busy') lines.push({ tone: 'warn', key: 'hostBusy' })
    else if (host.result === 'unsupported') lines.push({ tone: 'warn', key: 'hostUnsupported' })
    else lines.push({ tone: 'err', key: 'hostFailed', why: String(host.error || host.result || '') })
  } else if (hostError) {
    // 404 / 405: a host from before the route; 401 / 403: not signed in or not allowed; anything else: the reason it gave or the network's
    if (hostError.status === 404 || hostError.status === 405) lines.push({ tone: 'warn', key: 'hostOld' })
    else lines.push({ tone: 'err', key: 'hostFailed', why: String(hostError.message || hostError.status || '') })
  }
  if (browser) {
    if (browser.state === 'complete') lines.push({ tone: 'ok', key: 'browserDone' })
    else if (browser.state === 'preempted') lines.push({ tone: 'warn', key: 'browserPreempted' })
    else if (browser.state === 'error') lines.push({ tone: 'err', key: 'browserError', why: String(browser.message || '') })
    else lines.push({ tone: 'warn', key: 'browserNone' })
  }
  return lines
}

/* ---- 显示器信息 ---- */
/** The pixels a display really has: the size in CSS pixels times the pixel ratio, rounded. */
export const physicalSize = (w, h, ratio = 1) => ({ width: Math.round(w * ratio), height: Math.round(h * ratio) })
/** The widest colour space a display reports, from the media queries `(color-gamut: …)`: 'rec2020', 'p3', 'srgb' or ''. */
export const widestGamut = (has) => (has('rec2020') ? 'rec2020' : has('p3') ? 'p3' : has('srgb') ? 'srgb' : '')
/** The greatest common divisor, for the ratio below. */
const gcd = (a, b) => (b ? gcd(b, a % b) : a)
/** The aspect ratio of a size, in the common names (16:9, 16:10, 21:9, 4:3) when it is within 2.5 % of one (3440 × 1440 is sold as 21:9), otherwise reduced (w:h). */
export function aspectOf(w, h) {
  if (!(w > 0 && h > 0)) return ''
  const NAMED = [[16, 9], [16, 10], [21, 9], [32, 9], [4, 3], [3, 2], [5, 4], [1, 1]]
  const hit = NAMED.find(([a, b]) => Math.abs(w / h - a / b) / (a / b) < 0.025)
  if (hit) return `${hit[0]}:${hit[1]}`
  const g = gcd(w, h)
  return `${w / g}:${h / g}`
}
