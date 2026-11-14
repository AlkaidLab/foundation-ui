// Every tile design of this folder (registry.js): a component with `export const tileIds = [...]` in its plain <script> draws those tiles.
// Adding a design is adding a file; nothing here changes.
import { markRaw } from 'vue'
import { registerTile } from './registry.js'

const files = import.meta.glob('./Tile*.vue', { eager: true })
for (const m of Object.values(files)) if (m.default && m.tileIds) registerTile(m.tileIds, markRaw(m.default))

export { boldOn, tileVariants, setBold, setTileVariant, variantOf, designOf } from './registry.js'
