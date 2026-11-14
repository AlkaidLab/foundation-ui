# Music of the audio channel test

The four loops in `src/testtools/music.js` are original compositions for this package. They are written as
note tables and played by Web Audio oscillators, so the repository contains no recorded samples and no
third-party music. Nothing here needs a sample clearance: the scores and the synthesis code are covered by the
package licence, MPL-2.0 (`package.json`, `LICENSE`).

| id | title (zh / en) | author | date | licence | length |
|---|---|---|---|---|---|
| `marimba` | 木琴小曲 / Marimba tune | the authors of this package | 2026-11-09 | MPL-2.0, original work | 20.0 s |
| `bells` | 钟琴琶音 / Bell arpeggio | the authors of this package | 2026-11-09 | MPL-2.0, original work | 20.0 s |
| `warm` | 暖色和弦 / Warm chords | the authors of this package | 2026-11-09 | MPL-2.0, original work | 20.0 s |
| `waltz` | 音乐盒圆舞曲 / Music box waltz | the authors of this package | 2026-11-09 | MPL-2.0, original work | 13.3 s |

If a recorded track is added later, record its source URL, author, licence text link, retrieval date and a file
hash in `docs/authority/source-index.tsv` before committing it, and add a row here. A recording whose licence
does not allow redistribution inside this software must not be committed.
