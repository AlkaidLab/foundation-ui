// A control the keyboard repeats (a slider held on an arrow key) must not post a request for every repeat. One call per key runs at a time; while it
// runs, the newest argument is remembered once and is sent when the running call ends: the first value goes out, the last value always arrives. The
// key is the destination (the same setting, the same slider), so two different sliders never wait for each other, and the read-a-config, change-one-key,
// write-it-all-back save of a setting is never interleaved with itself. A rejecting call is drained quietly: the callers report their own failures.
export function createQueuedCalls(fn, keyOf = () => '') {
  const states = new Map()
  const run = async (key, state, arg) => {
    state.running = true
    try {
      await fn(arg)
    } finally {
      const next = state.next
      state.next = null
      if (next !== null) void run(key, state, next).catch(() => {})
      else { state.running = false; states.delete(key) }
    }
  }
  return (arg) => {
    const key = keyOf(arg)
    let state = states.get(key)
    if (!state) { state = { running: false, next: null }; states.set(key, state) }
    if (state.running) { state.next = arg; return }
    void run(key, state, arg).catch(() => {})
  }
}

// The save of a setting reads the whole configuration and writes it all back, so two saves of different settings that overlap lose one of them: every
// save waits for the one before it, in the order they were asked. A save still waiting takes the newest value of its own setting, and everyone who
// asked gets the same promise, so the callers can chain on it and see a failure.
export function createSerialCalls(fn, keyOf = () => '') {
  const waiting = new Map()
  let tail = Promise.resolve()
  return (arg) => {
    const key = keyOf(arg)
    const queued = waiting.get(key)
    if (queued) { queued.arg = arg; return queued.done }
    const entry = { arg }
    entry.done = tail.then(() => { waiting.delete(key); return fn(entry.arg) })
    waiting.set(key, entry)
    tail = entry.done.catch(() => {})
    return entry.done
  }
}
