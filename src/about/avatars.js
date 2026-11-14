// Avatar files bundled at build time (copied by scripts/build-about.mjs), so the page needs no network.
import { avatarSources } from './avatarset.js'

const files = import.meta.glob('./avatars/*', { eager: true, query: '?url', import: 'default' })

/** The bundled address of an avatar by its file name ("2795904.jpg"); '' when the file is not there. */
export const avatarUrl = (name) => (name ? files[`./avatars/${name}`] || '' : '')
/** { src, srcset } of an avatar: the 96 px file, and the 256 px one where the team has it (see avatarset.js). */
export const avatarImage = (name) => avatarSources(name, avatarUrl)
