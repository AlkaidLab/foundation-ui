# brand marks drawn inline

- `MBilibiliMark.vue` (src/vue): the Bilibili mark of the 关注 B 站 button of the overview. A community mark, not Bilibili's own logo file (the official logo has no icon-font or Material Symbols form).
  - Source: MingCute icon library, `bilibili` (filled), https://github.com/Richard9394/MingCute, file `assets/svg/core/filled/brands/bilibili.svg`, repository HEAD 9dc7d3ad074fb16477096a6a8109a6467d0e2fe3 (retrieved 2026-11-10, sha256 647f9c81d87f5e2841104d87a9c653adaf6d29a9f737a23f1eb36092351b0497, 727 bytes).
  - Licence: Apache-2.0 (the repository's LICENSE, sha256 cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30). The path is used as it is, set to `currentColor`; no change of the drawing.
  - Why this one: the rounded 24 px grid, the filled form and the stroke-free geometry match Material Symbols Rounded (the filled heart of 赞助) and the GitHub mark at 18 px. The alternative, Tabler `brand-bilibili` (MIT, github.com/tabler/tabler-icons, outline only), is a 2 px stroke that reads lighter next to the two filled glyphs.
  - The name Bilibili and its logo remain the property of their owner; the mark here only points to the project's channel.
- `MGithubMark.vue`: Octicons mark-github (MIT), unchanged.
