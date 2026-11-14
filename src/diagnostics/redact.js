// Redaction in code, never by eye. Two passes: secrets (always) and network identity (on by default, the person may include it).
// Both return { text, counts } so the preview can say how much was taken out. Nothing here touches the network.

export const REDACTED = '[redacted]'
// Names of configuration keys and fields that hold a secret or a person's identity.
const SECRET_KEY = /(pass(?:word|wd|phrase)?|salt|token|secret|api[_-]?key|apikey|access[_-]?key|private|credential|auth|cookie|signature|\bsig\b|\bpin\b|uniqueid|unique_id|cert|pkey|pairing|webhook[_-]?(?:url|secret)|user(?:name)?|e-?mail)/i

// Field classes of docs/architecture/diagnostics-redaction.md. The class comes
// from the declared key, never from the value. Anything nobody classified is
// sensitive, so a new key is not trusted by default.
export const FIELD_CLASS = Object.freeze({ PUBLIC: 'public', SENSITIVE: 'sensitive', SECRET: 'secret' })
const SECRET_SEGMENTS = new Set(['token', 'cookie', 'password', 'passwd', 'passphrase', 'secret', 'credential', 'credentials', 'psk', 'pin', 'private', 'cert', 'hmac', 'pairing', 'signing'])
const PRIVATE_BEFORE_KEY = new Set(['private', 'secret', 'encryption', 'aes', 'signing', 'master', 'api', 'shared', 'auth', 'pairing', 'access', 'refresh', 'hmac', 'noise'])
const SENSITIVE_SEGMENTS = new Set(['address', 'ip', 'mac', 'url', 'endpoint', 'hostname', 'ssid', 'email', 'fingerprint', 'path', 'peer', 'remote', 'participant', 'connect', 'data', 'session', 'client', 'device', 'user', 'account', 'serial', 'uuid', 'guid', 'channel', 'scope'])
const SENSITIVE_KEYS = new Set([
  'peer.id', 'security.scope', 'transport.peer_id', 'transport.remote', 'transport.path_id',
  'session.control.logical_session_key', 'participant_key', 'connect_data', 'effective_connect_data',
  'event_data', 'media.peer', 'sdk.peer', 'posX', 'posY',
])
const PUBLIC_NAMESPACES = new Set([
  'runtime', 'module', 'provider', 'adapter', 'capability', 'contract', 'field', 'host', 'display',
  'video', 'audio', 'input', 'performance', 'resource', 'configuration', 'lifecycle', 'negotiation',
  'routing', 'io', 'control', 'compatibility', 'product', 'diagnostics', 'log', 'time', 'count',
  'duration', 'bytes', 'packets', 'fps', 'width', 'height', 'codec', 'encoder', 'decoder', 'port',
  'protocol', 'version', 'build', 'pid', 'thread', 'cpu', 'memory', 'gpu', 'driver', 'hdr', 'color',
  'luminance', 'resolution', 'outcome', 'severity', 'domain', 'event', 'source', 'trace', 'span',
])
const UNIT = /_(?:ns|us|ms|s|bytes|b|kbps|mbps|gbps|packets|ppm|hz|khz|mhz|fps|nits|percent|ratio)$/i
const segmentsOf = (key) => String(key || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean).map((part) => part.toLowerCase())

/** public, sensitive or secret for a record attribute key. */
export function classifyKey(key) {
  const text = String(key || '')
  if (SENSITIVE_KEYS.has(text)) return FIELD_CLASS.SENSITIVE
  const segments = segmentsOf(text)
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    if (PRIVATE_BEFORE_KEY.has(segment) && segments[i + 1] === 'key') return FIELD_CLASS.SECRET
    if (SECRET_SEGMENTS.has(segment)) return FIELD_CLASS.SECRET
  }
  if (segments.some((segment) => SENSITIVE_SEGMENTS.has(segment))) return FIELD_CLASS.SENSITIVE
  if (segments.some((segment, i) => (segment === 'device' && segments[i + 1] === 'name') || (segment === 'file' && segments[i + 1] === 'path') || (segment === 'local' && segments[i + 1] === 'path'))) return FIELD_CLASS.SENSITIVE
  if (segments[0] && PUBLIC_NAMESPACES.has(segments[0])) return FIELD_CLASS.PUBLIC
  if (UNIT.test(text)) return FIELD_CLASS.PUBLIC
  return FIELD_CLASS.SENSITIVE
}

const PEM = /-----BEGIN [A-Z0-9 ]+-----[\s\S]*?-----END [A-Z0-9 ]+-----/g
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\b/g
const PEM_OPEN = /-----BEGIN [A-Z0-9 ]+-----[\s\S]*$/
const TOKEN_PREFIXED = /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[0-9A-Za-z_-]{30,}|AKIA[0-9A-Z]{16}|xox[abprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9_-]{12,})\b/g
const DATA_URI = /data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]{16,}/gi
const BASE64_RUN = /(?<![A-Za-z0-9+/])(?=[A-Za-z0-9+/]*[A-Z])(?=[A-Za-z0-9+/]*[a-z])(?=[A-Za-z0-9+/]*\d)[A-Za-z0-9+/]{64,}={0,2}/g
// a QR code's text is a link the other side opens: it carries the pairing secret (otpauth, moonlight, sunshine and the product's own schemes)
const QR_PAYLOAD = /\b(?:otpauth|moonlight|sunshine|foundation|ds5|wc)(?:-[a-z]+)?:\/\/[^\s"'<>]+/gi
// a pairing PIN said in words: "PIN 1234", "pairing code: 482913", "配对码：1234"
const PIN_WORDS = /((?:pairing[ _-]?|pair[ _-]?)?(?:pin|passcode|code)(?:[ _-]?code)?|配对码|配对\s*PIN|PIN\s*码|验证码)(\s*(?:is\b|are\b|为|是)?\s*[:：=]?\s*)(\d{3,8})(?!\d)/gi
const LONG_HEX = /\b[0-9a-fA-F]{32,}\b/g
const BEARER = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/g
const URL_USERINFO = /(\b[a-z][a-z0-9+.-]*:\/\/)([^\s/@:]+):([^\s/@]+)@/gi
const URL_QUERY = /([?&](?:token|access_token|key|api_key|apikey|secret|password|passwd|sig|signature|auth|code|pin|uniqueid)=)[^&\s"']+/gi
const WEBHOOK = /(https?:\/\/[^\s/]*(?:discord(?:app)?\.com|slack\.com|feishu\.cn|larksuite\.com|dingtalk\.com|qyapi\.weixin\.qq\.com)\/[^\s"']*)/gi
// key = value (config file, command line, log) and "key": "value" (JSON)
const KV_LINE = /^(\s*)([A-Za-z0-9_.-]+)(\s*[=:]\s*)(.*)$/gm
// inline "pin = 1234", "token=abc", "password: x" inside a sentence
const INLINE_KV = /(?<![A-Za-z0-9])((?:[a-z0-9]+[_.-])*(?:pass(?:word|wd|phrase)?|salt|token|secret|api[_-]?key|pin|uniqueid|auth(?:orization)?)(?:[_.-][a-z0-9]+)*)(\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s,;"'&]+)/gi
const JSON_KV = /("([A-Za-z0-9_.-]+)"\s*:\s*)("(?:[^"\\]|\\.)*"|\d+|true|false)/g

/** @param {string} text @returns {{ text: string, counts: Record<string, number> }} */
export function redactSecrets(text) {
  const counts = { secrets: 0 }
  const hit = (replacement) => () => { counts.secrets++; return replacement }
  let out = String(text ?? '')
  out = out.replace(PEM, hit('[certificate removed]'))
  out = out.replace(PEM_OPEN, hit('[certificate removed]'))
  out = out.replace(DATA_URI, hit('[embedded data removed]'))
  out = out.replace(QR_PAYLOAD, hit('[QR payload removed]'))
  out = out.replace(JWT, hit(REDACTED))
  out = out.replace(TOKEN_PREFIXED, hit(REDACTED))
  out = out.replace(BEARER, (_, kind) => { counts.secrets++; return `${kind} ${REDACTED}` })
  out = out.replace(URL_USERINFO, (_, scheme) => { counts.secrets++; return `${scheme}${REDACTED}@` })
  out = out.replace(URL_QUERY, (_, head) => { counts.secrets++; return `${head}${REDACTED}` })
  out = out.replace(WEBHOOK, (url) => { counts.secrets++; try { const u = new URL(url); return `${u.origin}/${REDACTED}` } catch { return REDACTED } })
  out = out.replace(JSON_KV, (all, head, key) => { if (!SECRET_KEY.test(key)) return all; counts.secrets++; return `${head}"${REDACTED}"` })
  out = out.replace(KV_LINE, (all, lead, key, sep, value) => { if (!SECRET_KEY.test(key) || !value.trim() || value.trim() === REDACTED) return all; counts.secrets++; return `${lead}${key}${sep}${REDACTED}` })
  out = out.replace(INLINE_KV, (all, key, sep, value) => { if (value === REDACTED || value.startsWith('[redacted') || /^(?:Bearer|Basic)$/i.test(value)) return all; counts.secrets++; return `${key}${sep}${REDACTED}` })
  out = out.replace(PIN_WORDS, (all, word, sep) => { counts.secrets++; return `${word}${sep}${REDACTED}` })
  out = out.replace(LONG_HEX, hit(REDACTED))
  out = out.replace(BASE64_RUN, hit(REDACTED))
  return { text: out, counts }
}

/** A configuration object with every secret key replaced and every string value passed through the text redaction. */
export function redactConfig(value, counts = { secrets: 0 }) {
  if (Array.isArray(value)) return value.map((v) => redactConfig(v, counts))
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEY.test(k) && v !== '' && v !== null && v !== undefined && typeof v !== 'object') { out[k] = REDACTED; counts.secrets++ }
      else out[k] = redactConfig(v, counts)
    }
    return out
  }
  if (typeof value === 'string') { const r = redactSecrets(value); counts.secrets += r.counts.secrets; return r.text }
  return value
}

const IPV4 = /(?<![\d.])((?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3})(?![\d.]*\d)(?!\.\d)/g
// full form (eight groups) or compressed with "::"; a time like 10:15:30 has neither
const IPV6 = /(?<![\w:.])((?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}(?::[0-9a-fA-F]{1,4}){0,6})?::(?:[0-9a-fA-F]{1,4}(?::[0-9a-fA-F]{1,4}){0,6})?)(?![\w:])/g
const MAC = /\b[0-9a-fA-F]{2}(?:[:-][0-9a-fA-F]{2}){5}\b/g
const WIN_USER = /([A-Za-z]:\\Users\\)([^\\/\s"']+)/gi
const UNC = /(\\\\)([A-Za-z0-9_-]{2,})(?=\\)/g
const KEEP_IPV4 = new Set(['127.0.0.1', '0.0.0.0', '255.255.255.255', '255.255.255.0', '255.255.0.0', '255.0.0.0'])
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const PRODUCT_WORDS = new Set(['sunshine', 'foundation sunshine', 'moonlight', 'gamestream', 'apollo', 'windows', 'desktop', 'steam', 'xbox', 'nvidia', 'amd', 'intel'])

/**
 * Masks what identifies a machine or a network: IPv4 and IPv6 addresses and MAC addresses (the same address always becomes the same
 * placeholder, so a reader can still follow one peer), the Windows user name in paths, UNC machine names, and the names the product gives
 * (host name, client names). A version written like an address ("version 0.9.8.1") is kept.
 */
export function maskNetwork(text, { hostNames = [], clientNames = [] } = {}) {
  const counts = { ips: 0, names: 0, paths: 0 }
  const seen = { ip: new Map(), ip6: new Map(), mac: new Map(), user: new Map(), client: new Map() }
  const tag = (map, label, key) => { const k = key.toLowerCase(); if (!map.has(k)) map.set(k, `<${label}-${map.size + 1}>`); return map.get(k) }
  let out = String(text ?? '')
  // a name that is also a product or platform word (the default host name is "Sunshine") is not masked: it would mask the product's own name in the report
  const names = (list) => [...new Set(list.map((n) => String(n || '').trim()).filter((n) => n.length >= 3 && !PRODUCT_WORDS.has(n.toLowerCase())))].sort((a, b) => b.length - a.length)
  // whole names only: "Sky" must not eat "Skyward"
  const whole = (n) => new RegExp(`(?<![A-Za-z0-9_-])${escapeRe(n)}(?![A-Za-z0-9_-])`, 'giu')
  for (const n of names(hostNames)) out = out.replace(whole(n), () => { counts.names++; return '<host>' })
  for (const n of names(clientNames)) out = out.replace(whole(n), () => { counts.names++; return tag(seen.client, 'client', n) })
  out = out.replace(WIN_USER, (_, head, user) => { counts.names++; counts.paths++; return `${head}${user.startsWith('<') ? user : '<user>'}` })
  out = out.replace(UNC, (_, head, name) => { counts.names++; return `${head}<host>` })
  out = out.replace(MAC, (m) => { counts.ips++; return tag(seen.mac, 'mac', m) })
  out = out.replace(IPV6, (m) => { if (m === '::' || m === '::1') return m; counts.ips++; return tag(seen.ip6, 'ip6', m) })
  out = out.replace(IPV4, (m, _ip, offset, whole) => {
    if (KEEP_IPV4.has(m)) return m
    const before = whole.slice(Math.max(0, offset - 12), offset)
    if (/(?:version|ver\.?|v|driver|build)[\s:=/_-]*$/i.test(before)) return m
    counts.ips++
    return tag(seen.ip, 'ip', m)
  })
  return { text: out, counts }
}


// ---- identity of the machine and the person that is not an address: user names in paths, host names, serial numbers, device instance ids, hex dumps (EDID)
const WIN_HOME_ANY = /([A-Za-z]:[\\/](?:Users|Documents and Settings)[\\/])([^\\/\s"'<>|:;,)]+)/gi
const UNIX_HOME = /(\/(?:home|Users)\/)([^/\s"'<>|:;,)]+)/g
const HOST_KEY = /\b(host[ _-]?name|computer[ _-]?name|machine[ _-]?name|node[ _-]?name|netbios[ _-]?name|device[ _-]?name|主机名|计算机名|设备名|電腦名稱)(["']?\s*[:=：]\s*["']?)([^\s,;"'<>]+)/gi
const HOST_HEADER = /^(\s*Host\s*:\s*)([^\s:]+)/gim
const LAN_NAME = /\b[A-Za-z0-9](?:[A-Za-z0-9-]{0,62})(?:\.[A-Za-z0-9-]+)*\.(?:local|lan|home\.arpa|ts\.net|internal|localdomain)\b/gi
const SERIAL_KEY = /(?<![A-Za-z0-9])((?:(?:disk|drive|monitor|display|edid|panel|board|motherboard|bios|system|chassis|device|hardware|volume|usb|gpu|cpu|product|baseboard|machine)[ _-])?(?:serial(?:[ _-]?(?:number|no\.?|num|id))?|s\/n|sn)|序列号|序號|产品序列号|seriennummer)(\s*[:=：#]\s*|\s+is\s+)(["']?)([A-Za-z0-9][A-Za-z0-9._-]{3,})/gi
const NO_SERIAL = /^(?:unknown|none|null|n\/a|default|not|to|0+|empty|undefined|true|false)$/i
const DEVICE_INSTANCE = /\b(DISPLAY|MONITOR|USB|PCI|HID|ACPI|ROOT|SWD|BTHENUM|SCSI|STORAGE|HDAUDIO)\\([A-Za-z0-9_&.-]+)\\((?=[A-Za-z0-9_&.-]*\d)[A-Za-z0-9_&.-]{4,})/gi
const HEX_DUMP = /(?:\b[0-9a-fA-F]{2}[ :-]){31,}[0-9a-fA-F]{2}\b/g
const MAC_DOTTED = /\b[0-9a-fA-F]{4}\.[0-9a-fA-F]{4}\.[0-9a-fA-F]{4}\b/g
const MAC_KEY = /\b(mac(?:[ _-]?address)?|physical address)(\s*[:=：]\s*)([0-9a-fA-F]{12})\b/gi

/** Masks the names and ids that say whose machine this is. -> { text, counts: { names, paths, serials, ips } } */
export function maskIdentity(text) {
  const counts = { names: 0, paths: 0, serials: 0, ips: 0 }
  let out = String(text ?? '')
  out = out.replace(WIN_HOME_ANY, (all, head, user) => (user.startsWith('<') ? all : (counts.paths++, `${head}<user>`)))
  out = out.replace(UNIX_HOME, (all, head, user) => (user.startsWith('<') ? all : (counts.paths++, `${head}<user>`)))
  out = out.replace(HOST_KEY, (all, key, sep, value) => (value.startsWith('<') ? all : (counts.names++, `${key}${sep}<host>`)))
  out = out.replace(HOST_HEADER, (all, head, value) => (value.startsWith('<') ? all : (counts.names++, `${head}<host>`)))
  out = out.replace(LAN_NAME, () => { counts.names++; return '<host>' })
  out = out.replace(SERIAL_KEY, (all, key, sep, quote, value) => (NO_SERIAL.test(value) || value.startsWith('[') ? all : (counts.serials++, `${key}${sep}${quote}<serial>`)))
  out = out.replace(DEVICE_INSTANCE, (all, bus, hardware) => { counts.serials++; return `${bus}\\${hardware}\\<instance>` })
  out = out.replace(HEX_DUMP, (all) => (/\d/.test(all) ? (counts.serials++, '[hex dump removed]') : all))
  out = out.replace(MAC_DOTTED, () => { counts.ips++; return '<mac>' })
  out = out.replace(MAC_KEY, (all, key, sep) => { counts.ips++; return `${key}${sep}<mac>` })
  return { text: out, counts }
}

// ---- paths outside the home folder and what the log says about the person's windows and games
// A directory outside the user's own folder (D:\Games\X\, /mnt/data/Y/, /opt/…) says what is installed where: the directories are masked and only a file name of ours is kept.
const OURS_FILE = /^(?:sunshine|foundation|sunshine[-_]gui|zako[-_]vdd|vdd|moonlight)[\w.-]*\.(?:log|json|conf|txt|dmp|zip|exe|dll|sys|inf)$/i
const WIN_PATH = /(?<![A-Za-z0-9])([A-Za-z]):[\\/](?:[^\\/:*?"|\r\n;,]+[\\/])*([^\\/:*?"|\s\r\n;,)]*)/g
const UNIX_PATH = /(?<![\w.:/<-])\/(?:mnt|media|opt|srv|data|var|Volumes|storage|sdcard|run|tmp|snap)\/(?:[^/\s"'<>|:;,)]+\/)*([^/\s"'<>|:;,)]*)/g
const PATH_KEPT = /^(?:<user>|<path>)$/
const WINDOW_KEY = /\b(window[ _-]?title|foreground[ _-]?window|active[ _-]?window|app(?:lication)?[ _-]?name|game[ _-]?name|process[ _-]?name|process|game|exe(?:cutable)?(?:[ _-]?name)?|image[ _-]?name)(["']?\s*[:=]\s*)("[^"\r\n]*"|'[^'\r\n]*'|\[[^\]\r\n]*\]|[^\r\n]*)/gi
const LAUNCH = /\b(Executing|Launching(?: app(?:lication)?)?|Starting(?: app(?:lication)?| game)?|Closing(?: app(?:lication)?)?|Terminating(?: app(?:lication)?)?|Found process|Attaching to process)(\s*:?\s*)\[([^\]\r\n]*)\]/g
const PROCESS_QUOTED = /\b(process(?:es)?)(\s+)(["'])([^"'\r\n]+)\3/gi

/** Directory components of paths outside the home folder, window titles, game and process names. -> { text, counts: { paths, names } } */
export function maskLogContent(text) {
  const counts = { paths: 0, names: 0 }
  let out = String(text ?? '')
  const fileOf = (file) => (file && OURS_FILE.test(file) ? file : file ? '<file>' : '')
  out = out.replace(WIN_PATH, (all, drive, file) => {
    const rest = all.slice(2)
    // a path that stops at the user's folder was handled by the user rule; a bare drive root says nothing
    if (!/[\\/]/.test(rest.slice(1)) && !file) return all
    if (/^[\\/]Users[\\/]<user>/i.test(rest) || /^[\\/]Documents and Settings[\\/]<user>/i.test(rest)) return all
    counts.paths++
    return `${drive}:\\<path>${file ? `\\${fileOf(file)}` : ''}`
  })
  out = out.replace(UNIX_PATH, (all, file) => { counts.paths++; return `/<path>${file ? `/${fileOf(file)}` : ''}` })
  out = out.replace(WINDOW_KEY, (all, key, sep, value) => {
    if (/^["'\[]?<(?:app|title)>/.test(value) || !value.trim()) return all
    counts.names++
    const quote = /^["'\[]/.test(value) ? value[0] : ''
    const close = quote === '[' ? ']' : quote
    return `${key}${sep}${quote}<title>${close}`
  })
  out = out.replace(LAUNCH, (all, verb, sep, value) => (value.startsWith('<') ? all : (counts.names++, `${verb}${sep}[<app>]`)))
  out = out.replace(PROCESS_QUOTED, (all, word, sp, q, value) => (value.startsWith('<') ? all : (counts.names++, `${word}${sp}${q}<app>${q}`)))
  return { text: out, counts }
}

/** The passes in the order the bundle uses; `network` false keeps addresses and names (the person ticked "include"). */
export function redactAll(text, { network = true, hostNames = [], clientNames = [] } = {}) {
  const a = redactSecrets(text)
  if (!network) return { text: a.text, counts: { secrets: a.counts.secrets, ips: 0, names: 0, paths: 0, serials: 0 } }
  const b = maskNetwork(a.text, { hostNames, clientNames })
  const c0 = maskIdentity(b.text)
  const l = maskLogContent(c0.text)
  const c = { text: l.text, counts: { names: c0.counts.names + l.counts.names, paths: c0.counts.paths + l.counts.paths, serials: c0.counts.serials, ips: c0.counts.ips } }
  return { text: c.text, counts: { secrets: a.counts.secrets, ips: b.counts.ips + c.counts.ips, names: b.counts.names - b.counts.paths + c.counts.names, paths: b.counts.paths + c.counts.paths, serials: c.counts.serials } }
}

const hash32 = (text, seed) => {
  let hash = seed >>> 0
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}
const randomSalt = () => {
  try {
    const values = new Uint32Array(2)
    globalThis.crypto?.getRandomValues?.(values)
    return [values[0] || 0x9e3779b9, values[1] || 0x85ebca6b]
  } catch {
    return [(Date.now() ^ 0x9e3779b9) >>> 0, (Math.random() * 0xffffffff) >>> 0]
  }
}
const placeholder = (value, salt) => 'h:' + hash32(String(value), salt[0]).toString(16).padStart(8, '0') + hash32(String(value), salt[1]).toString(16).padStart(8, '0')

/**
 * Redact one record by the classes in diagnostics-redaction.md: a secret
 * attribute is removed, a sensitive value becomes h: plus 16 hex digits unless
 * the person chose to include network identity, and free text is scanned for
 * the shapes redactAll already knows. The salt is per export, so hashes agree
 * inside one bundle and cannot be compared across bundles.
 */
export function redactRecord(record, { network = true, hostNames = [], clientNames = [], salt = randomSalt(), counts = { secrets: 0, ips: 0, names: 0, sensitive: 0 } } = {}) {
  const out = { ...record, attributes: { ...(record.attributes || {}) } }
  const body = redactAll(out.body, { network, hostNames, clientNames })
  out.body = body.text
  counts.secrets += body.counts.secrets
  counts.ips += body.counts.ips
  counts.names += body.counts.names
  const code = redactSecrets(out.errorCode)
  out.errorCode = code.text
  counts.secrets += code.counts.secrets
  for (const [key, value] of Object.entries(out.attributes)) {
    const fieldClass = classifyKey(key)
    if (fieldClass === FIELD_CLASS.SECRET) {
      if (value !== undefined && value !== null && value !== '') counts.secrets++
      delete out.attributes[key]
      continue
    }
    if (fieldClass === FIELD_CLASS.SENSITIVE && network) {
      out.attributes[key] = placeholder(value, salt)
      counts.sensitive++
      continue
    }
    if (typeof value === 'string') {
      const clean = redactAll(value, { network, hostNames, clientNames })
      out.attributes[key] = clean.text
      counts.secrets += clean.counts.secrets
      counts.ips += clean.counts.ips
      counts.names += clean.counts.names
    }
  }
  return { record: out, counts }
}

/** Redact a record list with one salt for the whole export. */
export function redactRecords(records, options = {}) {
  const salt = options.salt || randomSalt()
  const counts = { secrets: 0, ips: 0, names: 0, sensitive: 0 }
  return { records: (records || []).map((record) => redactRecord(record, { ...options, salt, counts }).record), counts }
}
