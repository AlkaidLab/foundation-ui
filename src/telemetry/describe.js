// What was thrown, whatever it is.
/** The parts of whatever was thrown: an Error, a string, an event of window.onerror, the reason of a rejected promise, anything. */
export function describeError(input) {
  try {
    if (input instanceof Error || (input && typeof input === 'object' && typeof input.message === 'string' && 'stack' in input)) return { name: String(input.name || 'Error'), message: String(input.message || ''), stack: String(input.stack || '') }
    if (input && typeof input === 'object') {
      if (input.error) return describeError(input.error)
      if (typeof input.message === 'string') return { name: 'Error', message: input.message, stack: input.filename ? `at ${input.filename}:${input.lineno || 0}:${input.colno || 0}` : '' }
      if (typeof input.reason !== 'undefined') return describeError(input.reason)
      return { name: 'Error', message: JSON.stringify(input).slice(0, 500), stack: '' }
    }
    return { name: 'Error', message: String(input ?? 'Unknown error'), stack: '' }
  } catch {
    return { name: 'Error', message: 'Unknown error', stack: '' }
  }
}

