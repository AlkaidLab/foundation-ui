// The setup of the home overview is split into parts (src/vue/MHomeDash.vue and src/vue/dash/*.js): the source tests read them as one text.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
export function readDash() {
  const dir = path.join(root, 'src/vue/dash')
  const parts = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort().map((f) => fs.readFileSync(path.join(dir, f), 'utf8')) : []
  return fs.readFileSync(path.join(root, 'src/vue/MHomeDash.vue'), 'utf8') + '\n' + parts.join('\n')
}
