// Which devices of the overview count as ready (the green dot of a tile). Only a device that is ready or in use gets the dot; an offline or unknown one never does.

/**
 * The microphone: `online` and `host_streaming` as the Web UI's live state has them (they decide when present: a state of 'idle' with `online: false`
 * is offline, whatever the state says), or `state` alone as the control panel's runtime has it ('active' | 'streaming' | 'capturing' (in use),
 * 'idle' | 'waiting' (ready), anything else (offline, missing, unknown) is not ready).
 */
export function micIsReady(mic) {
  if (!mic || typeof mic !== 'object') return false
  if (typeof mic.online === 'boolean' || typeof mic.host_streaming === 'boolean') return mic.host_streaming === true || mic.online === true
  if (typeof mic.state === 'string') return ['active', 'streaming', 'capturing', 'idle', 'waiting'].includes(mic.state)
  return mic.host_streaming === true || mic.online === true
}

/** The gamepad: ready when the controller driver reports ready or active. */
export const padIsReady = (state) => ['ready', 'active'].includes(state)
