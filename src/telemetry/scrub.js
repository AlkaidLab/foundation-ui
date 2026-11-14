// Scrubbing: what leaves this computer in an error report, a usage event or a model request must not carry a person's name, a path under their home, an address, a token or a key.
// Pure and framework-free. The rules are conservative: when in doubt, text is replaced.
// Addresses: m3e-rfc1918-20261106 section 3 (private IPv4; every IPv4 is masked whole, a version written next to the word version or v is kept), m3e-rfc4291-20261106 sections 2.4 and 2.5.6 (fe80::/10), m3e-rfc4193-20261106 section 3.1 (fc00::/7, L=1 is fd00::/8), m3e-rfc5952-20261106 section 4.2 ("::" compression).
// Homes: m3e-ms-folderid-profile-20261106 (FOLDERID_Profile default %SystemDrive%\Users\%USERNAME%), m3e-fhs-home-20261106 section 3.8 (/home/<account>). Bearer tokens: m3e-rfc6750-20261106 section 2.1. UUID text: m3e-rfc9562-20261106 section 4.

// C0 and C1 controls, the line and paragraph separators, the byte order mark and the bidirectional controls
const CONTROLS = new RegExp('[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029\ufeff\u202a-\u202e\u2066-\u2069]', 'g')

// Eight groups, or a compressed form. A match with no decimal digit is kept, so a C++ scope such as std::vector is not an address.
const IPV6 = /(?<![w:.])((?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}|(?:[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){0,6})?::(?:[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){0,6})?)(?![w:])/gi
const ipv6Of = (match) => (/[0-9]/.test(match) ? '<ipv6>' : match)

import { redactAll } from '../diagnostics/redact.js'

const IPV4 = /\b(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b/g
const ipv4Of = (match, offset, whole) => (/(?:version|ver\.?|v|driver|build)[\s:=/_-]*$/i.test(whole.slice(Math.max(0, offset - 12), offset)) ? match : '<ip>')

const RULES = [
  // the origin of a page or a script (the port and host of the panel or the Web UI)
  [/\bhttps?:\/\/[^\s/"')\]]+/gi, '<origin>'],
  // home folders: the account name is the person
  // the account name may hold spaces ("Sky Hua"): it ends at the next separator when there is one, else at the first space
  [/\b([A-Za-z]):\\Users\\(?:[^\\/"'<>|\r\n]+(?=[\\/])|[^\\/\s"'<>|]+)/g, '$1:\\Users\\<user>'],
  [/\b([A-Za-z]):\/Users\/(?:[^\\/"'<>|\r\n]+(?=[\\/])|[^\\/\s"'<>|]+)/g, '$1:/Users/<user>'],
  [/\/Users\/(?:[^/"'<>|\r\n]+(?=\/)|[^/\s"'<>|]+)/g, '/Users/<user>'],
  [/\/home\/(?:[^/"'<>|\r\n]+(?=\/)|[^/\s"'<>|]+)/g, '/home/<user>'],
  // a network share: the machine and every folder of it
  [/\\\\[^\s\\"'<>|]+(?:\\[^\s"'<>|]*)*/g, '<path>'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '<email>'],
  // an address: the whole of an IPv4, of a MAC and of an IPv6
  [IPV4, ipv4Of],
  [/\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/gi, '<mac>'],
  // link-local fe80::/10 and unique-local fc00::/7, including a trailing "::" with no further digit
  [/(?<![\w:.])(?:fe[89ab][0-9a-f]|f[cd][0-9a-f]{2})(?::[0-9a-f]{0,4}){1,7}(?![\w:])/gi, '<ipv6>'],
  [IPV6, ipv6Of],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '<id>'],
  // a Windows account id (SID), a Steam account id and the name Windows gives a computer nobody renamed
  [/\bS-1-\d+(?:-\d+){2,}\b/g, '<sid>'],
  [/\b7656119\d{10}\b/g, '<id>'],
  [/\b(?:DESKTOP|LAPTOP|WIN)-[A-Z0-9]{6,12}\b/g, '<host>'],
  [/\bsk-[A-Za-z0-9_-]{12,}\b/g, '<hidden>'],
  // a secret named by its key (a scheme and its token first, so the key rule does not take the scheme for the secret)
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/g, '$1 <hidden>'],
  [/\b(token|password|passwd|pwd|secret|api[_-]?key|apikey|auth(?:orization)?|cookie|session|pin|cdk|credential)(["']?\s*[:=]\s*["']?)[^\s&"',;]+/gi, '$1$2<hidden>'],
  // the values of a query string
  [/([?&][A-Za-z0-9_.-]+)=[^&\s#"']*/g, '$1=…'],
  // a long token, a hash or an id
  [/\b[A-Za-z0-9_-]{32,}\b/g, '<id>'],
]

/** Text with names, addresses and secrets removed, cut to `max` characters. Never throws; anything that is not text is the empty string. */
export function scrubText(value, max = 2000) {
  if (value === null || value === undefined) return ''
  let text = typeof value === 'string' ? value : (() => { try { return String(value) } catch { return '' } })()
  if (text.length > max * 4) text = text.slice(0, max * 4)
  for (const [pattern, replacement] of RULES) text = text.replace(pattern, replacement)
  // what the rules above do not know: tokens of a known shape, PEM, cookies, pairing PINs and QR links, serial numbers, host names, the user in a Unix path
  text = redactAll(text, { network: true }).text
  text = text.replace(CONTROLS, '')
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/** A stack: the same, and one line per frame (the file name stays, the place it was served from does not). */
export const scrubStack = (value, max = 8000) => scrubText(value, max)
