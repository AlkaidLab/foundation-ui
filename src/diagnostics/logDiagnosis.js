// One diagnosis path for both products. Local findings come first and do not need a network.
// The only request body is diagnosisRequestBody, and it redacts again, so a caller cannot send the raw log.

import { scrubText } from '../telemetry/scrub.js'

const PATTERNS = [
  { id: 'encoder-failure', severity: 'error', category: 'encoder', pattern: /\b(nvenc|amf|quicksync|video\s*toolbox|encoder|encoding)\b.*\b(fail|failed|error|unavailable|unsupported|unable|could not)\b/i, message: 'Encoder initialization or encoding failure detected', labels: { zh: '检测到编码器初始化或编码失败' } },
  { id: 'display-capture-failure', severity: 'error', category: 'display', pattern: /\b(display|monitor|dxgi|capture|duplication|output)\b.*\b(fail|failed|error|not found|unavailable|unable|could not)\b/i, message: 'Display capture or monitor detection failure detected', labels: { zh: '检测到显示捕获或显示器检测失败' } },
  { id: 'network-timeout', severity: 'warning', category: 'network', pattern: /\b(network|connection|client|pair|handshake|rtsp|udp|tcp|port)\b.*\b(timeout|timed out|refused|unreachable|blocked|failed|error)\b/i, message: 'Network, pairing, or client connection issue detected', labels: { zh: '检测到网络、配对或客户端连接问题' } },
  { id: 'port-bind-failure', severity: 'error', category: 'network', pattern: /\b(address already in use|permission denied|port\b.*\b(bind|listen|failed|error|unable|cannot)|\b(bind|listen)\b.*\b(port|failed|error|unable|cannot))\b/i, message: 'Port binding or listening failure detected', labels: { zh: '检测到端口绑定或监听失败' } },
  { id: 'config-risk', severity: 'warning', category: 'config', pattern: /\b(config|configuration|option|setting)\b.*\b(invalid|missing|conflict|deprecated|failed|error)\b/i, message: 'Configuration warning or invalid setting detected', labels: { zh: '检测到配置警告或无效设置' } },
]

const REMEDIATION = {
  'encoder-failure': { severity: 'error', title: 'Check encoder availability and GPU driver support', labels: { zh: '检查编码器可用性和显卡驱动支持' } },
  'display-capture-failure': { severity: 'error', title: 'Verify display selection and capture availability', labels: { zh: '检查显示器选择和捕获可用性' } },
  'network-timeout': { severity: 'warning', title: 'Check client connectivity, firewall, and network path', labels: { zh: '检查客户端连接、防火墙和网络路径' } },
  'port-bind-failure': { severity: 'error', title: 'Free or change the occupied port', labels: { zh: '释放或修改被占用的端口' } },
  'config-risk': { severity: 'warning', title: 'Review the recently changed configuration', labels: { zh: '检查最近修改过的配置' } },
}

/** The one scrubber. A log is not cut at the telemetry default of 2000 characters. */
export function redactDiagnosisText(value) {
  const text = String(value ?? '')
  return scrubText(text, Math.max(200000, text.length))
}

function evidenceText(line) {
  return redactDiagnosisText(String(line || '').trim().replace(/\s+/g, ' '))
}

export function localLogFindings(logs = '') {
  const byId = new Map()
  String(logs || '').split('\n').forEach((line, index) => {
    const text = evidenceText(line)
    if (!text) return
    for (const pattern of PATTERNS) {
      if (!pattern.pattern.test(text)) continue
      const existing = byId.get(pattern.id)
      if (existing) {
        existing.count += 1
        if (existing.evidence.length < 3) existing.evidence.push({ lineNumber: index + 1, text })
      } else {
        byId.set(pattern.id, {
          id: 'log-pattern:' + pattern.id, type: pattern.id, category: pattern.category, severity: pattern.severity,
          message: pattern.message, labels: pattern.labels, count: 1, evidence: [{ lineNumber: index + 1, text }],
        })
      }
    }
  })
  return Array.from(byId.values())
}

export function localLogSuggestions(findings = []) {
  return findings.map((finding) => {
    const item = REMEDIATION[finding.type]
    if (!item) return null
    return { id: 'fix:' + finding.type, findingType: finding.type, severity: item.severity, title: item.title, labels: item.labels }
  }).filter(Boolean)
}

/** Findings and suggestions, then the only text a later request may carry. No network. */
export function openLogDiagnosis(logs) {
  const text = String(logs || '')
  const findings = localLogFindings(text)
  const suggestions = localLogSuggestions(findings)
  const tail = redactDiagnosisText(text.split('\n').slice(-200).join('\n'))
  const summary = redactDiagnosisText(JSON.stringify({
    findings: findings.map((finding) => ({ type: finding.type, severity: finding.severity, message: finding.message, count: finding.count, evidence: finding.evidence })),
    suggestions: suggestions.map((item) => ({ findingType: item.findingType, title: item.title })),
  }))
  const requestText = ['Local rule-based pre-diagnosis:', '```json', summary, '```', '', 'Please analyze these logs:', '```', tail, '```'].join('\n')
  return { findings, suggestions, requestText }
}

/** The chat body. Redacts again so the raw log cannot be posted by passing it here. */
export function diagnosisRequestBody({ model, requestText, temperature, maxTokens, system }) {
  return {
    model,
    messages: [
      { role: 'system', content: redactDiagnosisText(system || 'You are a game streaming log diagnosis assistant. Reply concisely. Summarise the problem, cite the log, and list fixes.') },
      { role: 'user', content: redactDiagnosisText(requestText) },
    ],
    temperature: Number(temperature) || 0.3,
    max_tokens: Number(maxTokens) || 2048,
  }
}
