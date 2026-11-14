# Testing

[Documentation](../../README.md#documentation) · [Getting started](getting-started.md) · [Theming and tokens](theming-and-tokens.md) · [Components](components.md) · **Testing**

Foundation UI ships its own test helpers so the applications that use it can run the same checks. They are plain ES modules under `foundation-ui/testing/*`; none of them needs a browser.

| Import | Purpose |
| --- | --- |
| `foundation-ui/testing/no-network` | Test-run guard: fails the run when a test reaches the real release hosts |
| `foundation-ui/testing/scope-check` | Finds identifiers a Vue `<script>` uses but never declares or imports |
| `foundation-ui/testing/selected-ring` | Finds selected-state styles drawn with a ring wider than 1 px |
| `foundation-ui/testing/copy-lint` | Lints interface text for wording that explains instead of stating |

## Run this package's tests

```sh
npm ci
npm test
```

`npm test` runs `node --test` over `test/*.test.js` with a module resolve hook (`scripts/register.mjs`, needed by the colour library) and the no-network guard preloaded. Some tests are skipped unless `HOST_README` points at the Foundation Sunshine README.

## No-network loader

`scripts/no-network.mjs` replaces `globalThis.fetch` with a guard that rejects requests to the real release-metadata hosts (`alkaidlab.com`, `alkaidlab.cn`) and remembers them. A recorded request fails the run at exit, even if the test swallowed the rejection. Other URLs go through the real `fetch`. Tests inject their own `fetch`; this is the net underneath.

Load it with `--import`:

```sh
node --import foundation-ui/testing/no-network --test "test/*.test.js"
```

## Scope check

`undeclaredIdentifiers(source, { filename })` parses a Vue single-file component and returns the identifiers its script uses that the file declares, imports or receives nowhere: a handler calling a helper that was copied in without its definition. Only the script is checked. A name declared anywhere in the file counts as declared. It needs `@vue/compiler-sfc`, `@babel/parser` and `estree-walker`, which come with Vue's compiler.

```js
import fs from 'node:fs'
import { undeclaredIdentifiers } from 'foundation-ui/testing/scope-check'

const file = 'src/Page.vue'
const missing = undeclaredIdentifiers(fs.readFileSync(file, 'utf8'), { filename: file })
// assert.deepEqual(missing, [])
```

## Selected ring

A selected card, choice, swatch or chip-like control is shown by container colour and a check, never by a border, outline or shadow ring wider than 1 px. `selectedRingsIn(dir)` scans the CSS, Less/SCSS and `<style>` blocks of Vue files below a directory and returns `{ file, line, selector, rings }` for each rule that breaks this; `selectedRings(css, file)` checks one source. Keyboard focus rings (`:focus`, `:focus-visible`, `:focus-within`) are ignored.

```js
import { selectedRingsIn } from 'foundation-ui/testing/selected-ring'

const findings = selectedRingsIn('src')
// assert.equal(findings.length, 0)
```

## Copy lint

`scanText(text)` judges one string, `scanFile(file)` pulls the strings out of a source or JSON file, and `listFiles(root)` lists the files to scan. The rules (`RULES`) cover Chinese and English interface text and the space between a number and its unit; see [`docs/copy-style.zh.md`](../copy-style.zh.md). It also runs from the command line:

```sh
node scripts/copy-lint.mjs src
```
