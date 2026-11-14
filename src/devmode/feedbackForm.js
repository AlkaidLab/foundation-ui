// The body of a report from the feedback flow, written as the repository's own Issue Form (bug_report_zh/en or feature_request_zh/en), so a report made in the app and one made on the web have the same structure:
//   <!-- fs-feedback v1 -->            the first line, hidden on GitHub
//   ### <label of the field>           every field of the form in its order, with the label exactly as the template has it (emoji included), then the value or `_No response_`
//   ### 🔎 诊断信息 / 🔎 Diagnostics   after the last field: what the template has no place for (fingerprint, release, error, environment, log tail, attachments, contact)
// A dropdown value is always one of the options of the template, word for word; what cannot be matched is the closest option for the problem type / category, or `_No response_` for the rest. Nothing is made up.
// Pure; the redaction of every text happens in the caller (feedback.js `take`) before it gets here. The templates are the built-in copy (issueTemplates.js), so this works offline and always in the same order.
import { BUILTIN_TEMPLATES } from './issueTemplates.js'
import { DIAG_LABELS, FEEDBACK_MARKER, labelPlain } from './issueForm.js'

export const NO_RESPONSE = '_No response_'
/** The form every feedback report uses, whatever repository it goes to. */
export const FEEDBACK_REPO = 'fs'
/** The label that marks a report made in the app. It is only added when it exists in the repository (the sender skips labels that do not). */
export const FEEDBACK_LABEL = 'from-app'

/** The template for a kind ('bug' | 'feature') and a language ('zh' | anything else reads English). */
export function feedbackTemplate(kind = 'bug', locale = 'zh') {
  const want = /^zh/i.test(String(locale)) ? 'zh' : 'en'
  const list = BUILTIN_TEMPLATES[FEEDBACK_REPO] || []
  return list.find((t) => t.kind === (kind === 'feature' ? 'feature' : 'bug') && t.lang === want) || list.find((t) => t.kind === (kind === 'feature' ? 'feature' : 'bug')) || null
}

const norm = (s) => labelPlain(String(s ?? '')).toLowerCase().replace(/[\s()（）/\\·、,，.。:：_-]+/g, '')
// which option (by its place in the list: the zh and en templates have the same order) a word stands for; the first rule that matches wins
const CATEGORY = {
  'bug-type': [[/hdr/i, 1], [/virtual ?display|vdd|虚拟显示/i, 2], [/mic|麦克风/i, 3], [/audio|sound|speaker|音频|声音|音量/i, 4], [/network|connect|latency|wifi|网络|连接|延迟|丢包/i, 5], [/gamepad|controller|joystick|手柄|控制器/i, 6], [/crash|freeze|hang|dump|崩溃|卡死|闪退|死机/i, 9], [/perform|encod|fps|bitrate|gpu|性能|编码|码率|帧/i, 10], [/pair|device|配对|设备管理/i, 11], [/web ?(ui|panel)|control ?panel|面板|网页/i, 8], [/setting|config|设置|配置/i, 7], [/video|stream|black ?screen|画面|黑屏|串流|视频/i, 0]],
  'feature-type': [[/ui|interface|界面|体验/i, 0], [/hdr/i, 1], [/virtual ?display|vdd|虚拟显示/i, 2], [/mic|麦克风/i, 3], [/video|encod|stream|视频|编码|串流/i, 4], [/audio|sound|音频|声音/i, 5], [/network|connect|网络|连接/i, 6], [/panel|面板|控制面板/i, 7], [/setting|config|设置|配置/i, 8], [/pair|device|设备|配对/i, 9], [/controller|gamepad|input|手柄|控制器|输入/i, 10], [/perform|性能/i, 11], [/monitor|log|监控|日志/i, 12], [/security|auth|安全|认证/i, 13]],
}
const ENCODER = [[/nvenc|nvidia/i, 0], [/amd|vce|amf/i, 1], [/qsv|quick ?sync|intel/i, 2], [/software|x26[45]|cpu|软件/i, 3], [/auto|unknown|自动|未知/i, 4]]
const VENDOR = [[/nvidia|geforce|\brtx\b|\bgtx\b|quadro/i, 'NVIDIA'], [/\bamd\b|radeon|\brx ?\d/i, 'AMD'], [/intel|\barc\b|iris|\buhd\b/i, 'Intel']]

/**
 * The option of a dropdown that `value` stands for, or null: the same text (case and symbols aside), then the option that contains the word or is contained in it, then `rules` (word -> place in the list).
 * `other` (true): when nothing matches, the last option ("其他" / "Other") is the closest one.
 */
export function pickOption(options, value, { rules = [], other = false } = {}) {
  const v = String(value ?? '').trim()
  if (!options?.length) return null
  if (!v) return other ? options[options.length - 1] : null
  const lower = v.toLowerCase()
  const exact = options.find((o) => o === v) || options.find((o) => o.toLowerCase() === lower)
  if (exact) return exact
  const n = norm(v)
  const same = n && options.find((o) => norm(o) === n)
  if (same) return same
  if (n.length >= 2) {
    const part = options.find((o) => norm(o).includes(n)) || options.find((o) => { const m = norm(o); return m.length >= 3 && n.includes(m) })
    if (part) return part
  }
  for (const [re, at] of rules) if (re.test(v) && options[at]) return options[at]
  return other ? options[options.length - 1] : null
}

const clean = (s) => String(s ?? '').replace(/\r\n?/g, '\n').trim()
// a heading of the person's own text must not split the body into more fields
const quiet = (s) => clean(s).replace(/^(\s{0,3})#{1,3}(?=\s)/gm, '$1####')
/** A fence longer than any run of backticks in the text. */
export const fenceFor = (text) => '`'.repeat(Math.max(3, ...[...String(text).matchAll(/`+/g)].map((m) => m[0].length + 1)))
const fenced = (text, lang = '') => { const f = fenceFor(text); return `${f}${lang}\n${String(text).replace(/\n+$/, '')}\n${f}` }

/** The lines of the environment text (`key: value`) as an object; the first value of a key wins. */
export function envMap(envText = '') {
  const o = {}
  for (const line of String(envText).split(/\r?\n/)) { const m = /^([A-Za-z][\w .-]*?):\s*(.*\S)\s*$/.exec(line); if (m && !(m[1].toLowerCase() in o)) o[m[1].toLowerCase()] = m[2] }
  return o
}

/**
 * What the application knows about the machine, as the fields of the form want it, from the environment text (developer/envInfo.js) and from what the product gives separately.
 * -> { hostOs, osVersion, sunshineVersion, gpuVendor, gpuModel, encoder, clientDevice } (strings; '' when unknown). `known` wins over the environment text.
 */
export function autoFields(envText = '', known = {}) {
  const e = envMap(envText)
  const os = clean(known.osVersion ?? (/windows/i.test(e.os || '') ? e.os : ''))
  const host = clean(known.sunshineVersion ?? (e.host ? (/(?:sunshine\s+)?v?(\d[\w.+-]*)/i.exec(e.host)?.[1] || e.host) : ''))
  const gpu = clean(known.gpuModel ?? e.gpu ?? '')
  return {
    hostOs: clean(known.hostOs ?? (/windows ?11/i.test(os) ? 'Windows 11' : /windows ?10/i.test(os) ? 'Windows 10' : '')),
    osVersion: os,
    sunshineVersion: host,
    gpuVendor: clean(known.gpuVendor ?? (VENDOR.find(([re]) => re.test(gpu))?.[1] || '')),
    gpuModel: gpu,
    encoder: clean(known.encoder ?? ''),
    clientDevice: clean(known.clientDevice ?? ''),
  }
}

/**
 * The value of each field of the template for this report. `v`: { category, description, steps, answers: { <field id>: text } , auto }.
 * @returns {Map<string, string>} field id -> the text that follows its heading (already `_No response_` when empty)
 */
function valuesOf(template, v, limit) {
  const out = new Map()
  const answers = v.answers || {}
  const text = (raw, max = limit) => { const t = quiet(raw); return t.length > max ? `${t.slice(0, max - 1)}…` : t }
  const auto = v.auto || {}
  for (const f of template.fields) {
    let value = ''
    const given = answers[f.id]
    if (f.type === 'dropdown') {
      const kindField = f.id === 'bug-type' || f.id === 'feature-type'
      // the type of the problem is required by the bug form: unknown is 其他; the category of a request is optional: unknown is left empty
      if (given) value = pickOption(f.options, given, { other: kindField, rules: CATEGORY[f.id] || [] }) || ''
      else if (kindField) value = pickOption(f.options, v.category, { other: !!clean(v.category) || f.required, rules: CATEGORY[f.id] }) || ''
      else if (f.id === 'host-os') value = pickOption(f.options, auto.hostOs) || ''
      else if (f.id === 'gpu-vendor') value = pickOption(f.options, auto.gpuVendor, { other: !!auto.gpuModel }) || ''
      else if (f.id === 'encoder') value = pickOption(f.options, auto.encoder, { rules: ENCODER }) || ''
    } else if (f.type === 'input') {
      value = given ? text(given, 300) : ({ 'os-version': auto.osVersion, 'sunshine-version': auto.sunshineVersion, 'gpu-model': auto.gpuModel, 'client-device': auto.clientDevice }[f.id] || '')
      value = text(value, 300).replace(/\n+/g, ' ')
    } else if (f.type === 'textarea') {
      const t = given ?? ({ 'describe-bug': v.description, problem: v.description, 'steps-reproduce': v.steps, solution: v.steps }[f.id] || '')
      const body = text(t)
      value = body && f.render ? fenced(body, f.render) : body
    }
    out.set(f.id, value || NO_RESPONSE)
  }
  return out
}

/**
 * The diagnostics section: the facts the form has no field for. Every part is optional.
 * `d`: { fingerprint, release, rows: [[key, value]], error, environment, log, attachments: [{ name, size, url? }], contact }, with every text already redacted.
 */
export function diagnosticsSection(d = {}, locale = 'zh') {
  const label = /^zh/i.test(String(locale)) ? DIAG_LABELS.zh : DIAG_LABELS.en
  const parts = []
  const facts = []
  if (d.fingerprint) facts.push(`- fingerprint: \`${clean(d.fingerprint)}\``)
  if (d.release) facts.push(`- release: ${clean(d.release).replace(/\n+/g, ' ')}`)
  for (const [k, val] of d.rows || []) if (val) facts.push(`- ${k}: ${clean(val).replace(/\n+/g, ' ')}`)
  if (facts.length) parts.push(facts.join('\n'))
  if (d.error) parts.push(`#### Error\n\n${fenced(clean(d.error))}`)
  if (d.environment) parts.push(`#### Environment\n\n${fenced(clean(d.environment))}`)
  if (d.log) parts.push(`#### Log\n\n${fenced(clean(d.log))}`)
  if (d.attachments?.length) parts.push(`#### Attachments\n\n${d.attachments.map((a) => (a.url ? `- ${/\.(png|jpe?g|gif|webp)$/i.test(a.name) ? '!' : ''}[${a.name}](${a.url})${a.size ? ` (${a.size})` : ''}` : `- ${a.name}${a.size ? ` (${a.size})` : ''}`)).join('\n')}`)
  if (d.contact) parts.push(`#### Contact\n\n${clean(d.contact)}`)
  return parts.length ? `### ${label}\n\n${parts.join('\n\n')}` : ''
}

/**
 * The whole body.
 * @param {object} p
 * @param {'bug'|'feature'} [p.form]
 * @param {string} [p.locale] the language of the interface: Chinese reads the zh form, anything else the English one
 * @param {{ category?: string, description?: string, steps?: string, answers?: object, auto?: object }} p.values
 * @param {object} [p.diagnostics] see diagnosticsSection
 * @param {number} [p.limit] the longest text of one field
 * @returns {{ body: string, template: object, labels: string[], values: Map<string,string> }}
 */
export function composeFormBody({ form = 'bug', locale = 'zh', values = {}, diagnostics = {}, limit = 4000 } = {}) {
  const template = feedbackTemplate(form, locale)
  if (!template) return { body: '', template: null, labels: [FEEDBACK_LABEL], values: new Map() }
  const filled = valuesOf(template, values, limit)
  const sections = template.fields.map((f) => `### ${f.label}\n\n${filled.get(f.id)}`)
  const diag = diagnosticsSection(diagnostics, locale)
  const body = [FEEDBACK_MARKER, ...sections, ...(diag ? [diag] : [])].join('\n\n')
  return { body, template, labels: [...(template.labels || []).slice(0, 1), FEEDBACK_LABEL], values: filled }
}
