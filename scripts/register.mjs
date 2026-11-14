// Node cannot resolve the extensionless relative imports inside @material/material-color-utilities 0.4.0
// (bundlers can). This hook retries them with ".js"; it is only used by the build script and the tests.
import { register } from 'node:module'
register('./resolve-hook.mjs', import.meta.url)
