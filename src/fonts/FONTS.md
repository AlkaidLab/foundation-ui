# Fonts

Open fonts only. Every font here is under the SIL Open Font License 1.1 (embedding in a web page or an application is allowed; the licence texts sit beside the files).

| File | Family | Licence | Source | Used for |
| --- | --- | --- | --- | --- |
| roboto-flex-*.woff2 | Roboto Flex | OFL-1.1, Copyright 2017 The Roboto Flex Project Authors | @fontsource-variable/roboto-flex 5.3.0 | the interface (variable weight) |
| display-google-sans-flex-digits.woff2, display-google-sans-flex-latin.woff2 | Google Sans Flex 3.007 | OFL-1.1, Copyright 2015 Google LLC (released under the OFL on Google Fonts) | GoogleSansFlex-VariableFont_GRAD,ROND,opsz,slnt,wdth,wght.ttf (Google Fonts) | the display face of the tiles, family `M3E Display` (token `--m-font-display`): numerals (20.7 KB: opsz 144, wdth 25-125, wght 300-800, ROND 0-100) and Latin (44.3 KB: opsz 18-144, wght 400-700); slnt and GRAD pinned at 0 |
| clock-google-sans-flex.woff2 | Google Sans Flex | OFL-1.1, Copyright 2015 Google LLC (released under the OFL on Google Fonts) | @fontsource-variable/google-sans-flex 5.3.2 | dock clock: Default, Inflate, Minimal, Outline, Flip (axes wght, wdth, ROND) |
| clock-roboto-flex.woff2 | Roboto Flex | OFL-1.1 | @fontsource-variable/roboto-flex 5.3.0 | dock clock: Metro, Growth, Numoverlap, Flex, Tall (axes wght, wdth) |
| clock-fraunces-italic.woff2 | Fraunces Italic | OFL-1.1, Copyright 2020 The Fraunces Project Authors | @fontsource-variable/fraunces 5.3.0 | dock clock: Calligraphy (axes wght, SOFT) |
| clock-caveat.woff2 | Caveat | OFL-1.1, Copyright 2014 The Caveat Project Authors | @fontsource-variable/caveat 5.3.0 | dock clock: Handwritten (axis wght) |
| clock-mashanzheng.woff2 | Ma Shan Zheng | OFL-1.1, Copyright 2018 The Ma Shan Zheng Project Authors (LICENSE-MaShanZheng.txt) | github.com/google/fonts ofl/mashanzheng, MaShanZheng-Regular.ttf, version 2.003 | dock clock: 文字 (the time in Chinese words) |

The clock files hold the digits, the colon, the full stop and the space only (pyftsubset; Ma Shan Zheng: the sixteen characters 零一二两三四五六七八九十点分整秒 and the space, 5 KB), and the axes the faces do not use are pinned (fontTools varLib.instancer: opsz at 144, GRAD, slnt and the Roboto Flex parametric axes at their defaults). The OFL permits modified versions under the same licence; the reserved font names (none are declared reserved in these five) are not an issue.

The Dot matrix face draws no font: its digits are a 5 × 7 grid of circles defined in src/appearance/clockFaces.js. The Analog face is SVG.
