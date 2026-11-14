/**
 * Material 3 Expressive motion physics for the web.
 *
 * The spring values are the ones Google publishes in the Compose Material 3 source
 * (androidx compose/material3 tokens/ExpressiveMotionTokens.kt): spatial springs
 * (position, size, shape) are under-damped and overshoot a little; effects springs
 * (opacity, colour) are critically damped and never overshoot. A spring has no
 * fixed duration, so it is sampled once and handed to CSS as a linear() easing
 * together with the time it needs to settle.
 */
export const SPRINGS = Object.freeze({
  fastSpatial: { damping: 0.6, stiffness: 800 },
  defaultSpatial: { damping: 0.8, stiffness: 380 },
  slowSpatial: { damping: 0.8, stiffness: 200 },
  fastEffects: { damping: 1, stiffness: 3800 },
  defaultEffects: { damping: 1, stiffness: 1600 },
  slowEffects: { damping: 1, stiffness: 800 },
})

/** Position of a unit-mass spring released at 0 towards 1, damping given as a ratio. */
export function springValue({ damping, stiffness }, t) {
  const w0 = Math.sqrt(stiffness)
  if (damping < 1) {
    const wd = w0 * Math.sqrt(1 - damping * damping)
    const decay = Math.exp(-damping * w0 * t)
    return 1 - decay * (Math.cos(wd * t) + ((damping * w0) / wd) * Math.sin(wd * t))
  }
  if (damping === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t)
  const root = w0 * Math.sqrt(damping * damping - 1)
  const a = -damping * w0 + root
  const b = -damping * w0 - root
  return 1 - (b * Math.exp(a * t) - a * Math.exp(b * t)) / (b - a)
}

/** Seconds until the spring stays within `epsilon` of its target. */
export function settleSeconds(spring, epsilon = 0.002, limit = 4) {
  let last = 0
  for (let t = 0; t <= limit; t += 0.002) {
    if (Math.abs(1 - springValue(spring, t)) > epsilon) last = t
  }
  return last + 0.002
}

/** CSS linear() easing and duration (ms) that reproduce the spring. */
export function springEasing(spring, points = 48) {
  const seconds = settleSeconds(spring)
  const values = []
  for (let i = 0; i < points; i++) values.push(springValue(spring, (seconds * i) / points))
  values.push(1)
  return {
    duration: Math.round(seconds * 1000),
    easing: `linear(${values.map((v) => +v.toFixed(4)).join(', ')})`,
  }
}

/** Custom properties for every spring token: --m-spring-<name> and --m-spring-<name>-duration. */
export function motionCss() {
  const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
  const lines = []
  for (const [name, spring] of Object.entries(SPRINGS)) {
    const { duration, easing } = springEasing(spring)
    lines.push(`  --m-spring-${kebab(name)}: ${easing};`)
    lines.push(`  --m-spring-${kebab(name)}-duration: ${duration}ms;`)
  }
  return lines.join('\n')
}

/**
 * cubic-bezier() stand-ins for engines without CSS linear() (Safari before 17.2, so WKWebView before macOS 14.2): each one fitted to its
 * spring for the least largest error over the settle time (spatial: 0.051 fast, 0.021 default and slow; effects: 0.026, never above 1).
 * Same durations; only the shape of the curve is approximate.
 */
export const SPRING_FALLBACKS = Object.freeze({
  fastSpatial: 'cubic-bezier(0.356, 0.994, 0.001, 1.181)',
  defaultSpatial: 'cubic-bezier(0.245, 0.261, 0.071, 1.216)',
  slowSpatial: 'cubic-bezier(0.245, 0.261, 0.071, 1.216)',
  fastEffects: 'cubic-bezier(0.35, 0.603, 0.048, 0.931)',
  defaultEffects: 'cubic-bezier(0.35, 0.6, 0.05, 0.934)',
  slowEffects: 'cubic-bezier(0.35, 0.6, 0.05, 0.936)',
})

/** The fallback block: where linear() is not understood, --m-spring-<name> is the fitted cubic-bezier(). */
export function motionFallbackCss() {
  const kebab = (s) => s.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())
  const lines = Object.entries(SPRING_FALLBACKS).map(([name, curve]) => `    --m-spring-${kebab(name)}: ${curve};`)
  return `@supports not (transition-timing-function: linear(0, 1)) {\n  :root {\n${lines.join('\n')}\n  }\n}`
}

/** Easing and duration tokens of the pre-expressive curve system (Material Components for Android, Motion.md). */
export const CURVES = Object.freeze({
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  standardDecelerate: 'cubic-bezier(0, 0, 0, 1)',
  standardAccelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  emphasizedDecelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
  emphasizedAccelerate: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
})
