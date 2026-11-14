// 声道测试的音乐：四段本仓库原创的短循环，只由音符表和 Web Audio 振荡器合成，不含任何录音样本，
// 因此没有第三方素材的授权问题。每段 10 到 20 秒，打开声道测试时随第一次按键创建音频上下文。
// Four short original loops for the channel test: note lists played by Web Audio oscillators, with no
// recorded samples. Each is 10 to 20 seconds, and the audio context is created on the first press.
import { LAYOUTS, channelIndex } from './logic.js'

/** Equal-tempered frequency of a MIDI note (A4 = 69 = 440 Hz). */
export const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12)

const PENTA = [0, 2, 4, 7, 9]
const MAJOR = [0, 2, 4, 5, 7, 9, 11]
/** The MIDI note of scale degree `d` above `root`; degrees below zero and above the octave wrap by octaves. */
const degree = (root, scale, d) => {
  const n = scale.length
  return root + 12 * Math.floor(d / n) + scale[((d % n) + n) % n]
}
/** Notes at `step` beats from `start`: `degrees` are scale degrees, `beats` is each note's length. */
const melody = (start, step, degrees, beats, gain, root, scale) =>
  degrees.map((d, i) => ({ beat: start + i * step, midi: degree(root, scale, d), beats, gain }))
/** A chord of absolute MIDI notes at one beat. */
const chord = (beat, midis, beats, gain) => midis.map((midi) => ({ beat, midi, beats, gain }))
const layer = (voice, gain, notes) => ({ voice, gain, notes })

const marimba = melody(0, 0.5, [
  0, 2, 4, 2, 4, 7, 4, 2, 0, 2, 4, 7, 9, 7, 5, 4,
  4, 7, 9, 7, 9, 11, 9, 7, 4, 7, 4, 2, 0, 2, 4, 2,
  7, 9, 11, 9, 11, 12, 11, 9, 7, 9, 11, 14, 12, 11, 9, 7,
  4, 2, 0, 2, 4, 7, 9, 7, 4, 2, 0, -3, 0, 2, 4, 2,
], 0.45, 0.42, 60, PENTA)

const bells = melody(0, 0.5, [
  0, 4, 7, 4, 9, 7, 4, 2, 7, 9, 12, 9, 4, 7, 2, 4,
  4, 7, 9, 7, 12, 9, 7, 4, 9, 12, 14, 12, 9, 7, 4, 2,
  7, 9, 12, 9, 14, 12, 9, 7, 12, 14, 16, 14, 12, 9, 7, 4,
  4, 2, 0, 2, 4, 7, 9, 7, 4, 2, 0, -3, 0, 2, 4, 7,
], 0.5, 0.3, 60, PENTA)

const warmMelody = melody(1, 1.5, [0, 4, 7, 4, 2, 5, 9, 5, 0, 4, 7, 9, 7, 4, 2, 0], 1.1, 0.26, 72, PENTA)
const warmChords = [
  ...chord(0, [48, 52, 55, 59], 5.7, 0.16),
  ...chord(6, [45, 52, 55, 60], 5.7, 0.16),
  ...chord(12, [41, 48, 52, 57], 5.7, 0.16),
  ...chord(18, [43, 50, 55, 59], 5.7, 0.16),
]

const waltzChords = [
  [55, 59, 62], [60, 64, 67], [57, 60, 65], [55, 59, 62],
  [52, 55, 59], [57, 60, 64], [50, 54, 57], [55, 59, 62],
]
const waltzBass = [43, 48, 41, 43, 40, 45, 50, 43]
const waltzMelody = waltzChords.flatMap((notes, bar) => [
  { beat: bar * 3 + 1, midi: notes[0], beats: 0.45, gain: 0.3 },
  { beat: bar * 3 + 1.5, midi: notes[1], beats: 0.45, gain: 0.26 },
  { beat: bar * 3 + 2, midi: notes[2], beats: 0.45, gain: 0.3 },
  { beat: bar * 3 + 2.5, midi: notes[1], beats: 0.45, gain: 0.2 },
])
const waltzBassNotes = waltzBass.map((midi, bar) => ({ beat: bar * 3, midi, beats: 2.2, gain: 0.22 }))

/** The four loops: a marimba tune, a bell arpeggio, warm pad chords and a music-box waltz. */
export const MUSIC_TRACKS = Object.freeze([
  Object.freeze({
    id: 'marimba', bpm: 96, beats: 32,
    layers: Object.freeze([
      layer('pluck', 0.95, marimba),
      layer('pluck', 0.7, [0, 8, 16, 24].map((beat, i) => ({ beat, midi: [48, 45, 41, 43][i], beats: 7.4, gain: 0.2 }))),
    ]),
  }),
  Object.freeze({
    id: 'bells', bpm: 96, beats: 32,
    layers: Object.freeze([
      layer('bell', 0.9, bells),
      layer('bell', 0.55, [0, 8, 16, 24].map((beat, i) => ({ beat, midi: [48, 45, 41, 43][i], beats: 7.4, gain: 0.14 }))),
    ]),
  }),
  Object.freeze({
    id: 'warm', bpm: 72, beats: 24,
    layers: Object.freeze([
      layer('pad', 1, warmChords),
      layer('bell', 0.75, warmMelody),
    ]),
  }),
  Object.freeze({
    id: 'waltz', bpm: 108, beats: 24,
    layers: Object.freeze([
      layer('box', 1, waltzMelody),
      layer('box', 0.8, waltzBassNotes),
    ]),
  }),
])

/** A track by id, or the first track for an unknown id. */
export const trackById = (id) => MUSIC_TRACKS.find((t) => t.id === id) || MUSIC_TRACKS[0]
/** The length of one loop in seconds. */
export const loopSeconds = (track) => (track.beats * 60) / track.bpm
/** Every note of a track, with its voice and layer gain, from the first beat to the last. */
export const trackEvents = (track) => track.layers
  .flatMap((l) => l.notes.map((n) => ({ ...n, voice: l.voice, layerGain: l.gain })))
  .sort((a, b) => a.beat - b.beat || a.midi - b.midi)

// One note: an oscillator stack with the character of the track, a short attack and the decay of its voice.
export function tone(c, kind, hz, at, dur, level, out, sources = []) {
  const env = c.createGain(); env.connect(out)
  const nodes = []
  const add = (type, ratio, amp, detune = 0) => {
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(hz * ratio, at); o.detune.setValueAtTime(detune, at)
    const g = c.createGain(); g.gain.value = amp; o.connect(g).connect(env); nodes.push(o)
  }
  let attack = 0.006, tail = 0.35
  if (kind === 'bell') { add('sine', 1, 0.8); add('sine', 2.01, 0.28); add('sine', 3.01, 0.1); attack = 0.004; tail = 1.3 }
  else if (kind === 'pad') {
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(Math.min(2400, hz * 7), at); f.Q.value = 0.5
    env.disconnect(); env.connect(f); f.connect(out)
    for (const det of [-8, 0, 8]) add('sawtooth', 1, 0.22, det)
    attack = 0.4; tail = 0.9
  } else if (kind === 'box') { add('sine', 1, 0.8); add('triangle', 2, 0.22); attack = 0.004; tail = 0.45 }
  else { add('triangle', 1, 0.85); add('sine', 2, 0.22); attack = 0.005; tail = 0.3 }
  if (kind === 'pad') {
    env.gain.setValueAtTime(0, at)
    env.gain.linearRampToValueAtTime(level, at + attack)
    env.gain.setValueAtTime(level, at + Math.max(attack, dur))
    env.gain.linearRampToValueAtTime(0, at + dur + tail)
  } else {
    env.gain.setValueAtTime(0, at)
    env.gain.linearRampToValueAtTime(level, at + attack)
    env.gain.exponentialRampToValueAtTime(Math.max(1e-4, level * 0.015), at + dur + tail)
    env.gain.exponentialRampToValueAtTime(1e-4, at + dur + tail + 0.05)
  }
  for (const o of nodes) { o.start(at); o.stop(at + dur + tail + 0.1); sources.push(o) }
}

/** Put every note of one loop of `track` into the audio graph `out`, starting at `when`. */
export function scheduleTrack(c, track, out, sources = [], when = c.currentTime) {
  const spb = 60 / track.bpm
  for (const l of track.layers) for (const n of l.notes) tone(c, l.voice, midiToHz(n.midi), when + n.beat * spb, n.beats * spb, Math.min(0.5, n.gain * l.gain), out, sources)
}

/** The channel buttons of a layout: the two channels of stereo plus both/centre, the channels of surround. */
export const channelModes = (layout) => (layout === 'stereo' ? ['L', 'R', 'both'] : [...(LAYOUTS[layout] || [])])
/** Where a mode goes: a channel of a discrete output, or a pan for a two-channel output. */
export function routeOf(layout, mode, maxChannels = 2) {
  if (mode === 'both') return { kind: 'pan', pan: 0 }
  const channels = LAYOUTS[layout] || []
  const index = channelIndex(layout, mode)
  if (index >= 0 && channels.length > 2 && maxChannels >= channels.length) return { kind: 'channel', channel: index, channels: channels.length }
  return { kind: 'pan', pan: mode === 'L' ? -1 : mode === 'R' ? 1 : 0 }
}
/** The pan of the sweep at `at` seconds of a `seconds`-long loop: left to right, clamped. */
export const sweepPan = (at, seconds) => (seconds > 0 ? Math.max(-1, Math.min(1, (2 * at) / seconds - 1)) : 0)
/** The pan changes of the alternating test: one every `everyBeats` beats, left then right. */
export const alternatePans = (track, everyBeats = 2) => {
  const changes = []
  for (let beat = 0; beat < track.beats; beat += everyBeats) changes.push({ beat, pan: changes.length % 2 ? 1 : -1 })
  return changes
}
