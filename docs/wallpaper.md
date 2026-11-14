# Wallpaper on every page

The wallpaper (or the solid colour the person chose) is the window's background everywhere, in both products: home, settings and their
sub-pages, sheets and dialogs, the guide, downloads, clients, applications, logs, component status, toolbox, virtual display, picture
enhancement, panel settings and the rest. Solid chosen means solid everywhere: no layer paints a picture.

## How it is built

- `applyAppearance` puts two picture layers (`.m-wp`) behind the window and sets `html.m-has-wallpaper`. The frosted layer (blur, the tint
  whose strength is computed from the picture by `scrimFor`, the grain) is a `::after` of the picture layer, so a page that is its own
  stacking context (the shell's fixed body) cannot bury it. The rail, the list pane and the content are regions of one translucent
  material (`appearance.css`, `layout.css`); cards over a picture are 96 % opaque.
- Text that sits on the page itself (footers, guide lines, text buttons in a section head, the guide brand) gets a card-coloured backing, so
  it holds 4.5:1 on any picture instead of relying on the scrim alone.
- Pages inside the control panel's frame (clients, applications, downloads, settings, ...) paint nothing of their own (`.m-web-embedded` and
  its document are transparent); the panel paints the wallpaper behind them.
- Every Web UI page starts the shared appearance from `init.js` (`utils/appearanceBoot.js`), so a picture chosen once is on the pages that
  were not the shell before (clients, applications, downloads, password, troubleshooting, welcome).

## The check

A browser check (kept outside this repository) visits every route of the control panel and the Web
UI, light and dark, one browser at a time, and fails where

1. a page paints an opaque full-page background over the wallpaper (an element covering a third of the window with an opaque colour or
   gradient that is not the rail, the list pane, a card, a sheet or a dialog; frames too);
2. a text is under 4.5:1 (3:1 for large text) against what is really painted behind it: the page is screenshotted with every glyph made
   transparent and the pixels under each text box are compared with the text colour (worst 5 % of the pixels, text opacity composed in);
   under an open sheet or dialog only that layer is judged;
3. the wallpaper is not on, or (picture `solid`) it is on somewhere; or a page throws.

```
node wallpaper-check.mjs <outDir> [panel|web|both] [light,dark] [bright|dark|default|solid] [name filter]
```

`bright` and `dark` are generated, busy test pictures (the worst cases for dark and for light text), `default` is the built-in Auto
wallpaper, `solid` is the solid choice. Rows that open a sub-page or a sheet are visited too (`subs` in the routes file).
