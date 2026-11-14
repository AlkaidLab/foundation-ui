# Announcements

Announcements let the maintainers publish news in the Sunshine control panel and the Web UI without
shipping a new build: release notes, guides, announcements. An announcement is content, not an alert:
it has a picture, a kind, a date and a Markdown text, and only an item explicitly typed `warning` is
drawn as a warning. The news comes from one JSON file published beside the release metadata. The code lives in `src/announcements/` (import `foundation-ui/announcements`)
and has no framework dependency; the panel and the Web UI share it.

## Where the file lives

| Host | URL |
| --- | --- |
| Primary | `https://www.alkaidlab.com/release-metadata/foundation-sunshine-announcements.json` |
| Mirror | `https://www.alkaidlab.cn/release-metadata/foundation-sunshine-announcements.json` |

Publish the same file on both hosts, next to `foundation-sunshine.json`. Both answer with
`Access-Control-Allow-Origin: *`, which the Web UI needs. A client requests both hosts at once and
uses the first usable answer; a host that is slow, offline or answers anything unusable is ignored.

Until the file is published the hosts answer 404. That is the normal state: a missing file, a 404,
a body that is not JSON, a document that does not validate and an unreachable network all mean
"no announcements" and show nothing, never an error.

## File format

```json
{
  "schema": 1,
  "items": [
    {
      "id": "2026-11-driver-update",
      "severity": "warn",
      "type": "warning",
      "category": "announce",
      "importance": "normal",
      "title": { "en": "...", "zh": "..." },
      "body": { "en": "Markdown **text**", "zh": "..." },
      "banner": "https://example.org/banner.webp",
      "url": "https://example.org/page",
      "published": "2026-11-01",
      "revision": "1",
      "starts": "2026-11-01T00:00:00Z",
      "ends": "2026-12-01T00:00:00Z",
      "minVersion": "2026.900.0",
      "maxVersion": "2026.1100.0",
      "pinned": true
    }
  ]
}
```

A complete example (a popup with an image, release notes, a guide, a warning, a must-read, plain notices) is in `announcements.sample.json`; the tests check that every item of it survives validation.

| Field | Required | Rules |
| --- | --- | --- |
| `schema` | yes | The number `1`. Any other value makes the whole file be ignored. |
| `items` | yes | Array. At most 50 items are kept: the first 50 valid ones, scanning at most the first 500 entries. |
| `id` | yes | 1 to 64 characters from `A-Z a-z 0-9 . _ -`. Unique; a repeated id is dropped. The read state is stored by id, so never reuse an id for a different notice. |
| `severity` | yes | `info`, `warn` or `critical`. It orders the list; an item that has no `type` is a warning when it is `warn` or `critical`. |
| `title` | yes | Object from locale to text, at least one valid entry. Up to 120 characters per entry. |
| `body` | no | Object from locale to text, written as Markdown (see below). Up to 8000 characters per entry. Newlines are allowed; a single line break stays a line break. |
| `url` | no | `https:` only, at most 500 characters, no user name or password. |
| `starts` | no | ISO-8601. Not shown before this moment. |
| `ends` | no | ISO-8601. Not shown from this moment on. Must be after `starts`. |
| `minVersion` | no | Shown only on versions greater than or equal to this. |
| `maxVersion` | no | Shown only on versions less than or equal to this. |
| `pinned` | no | Boolean. Sorts first within its severity. |
| `type` | no | `notice` (default for `info`) or `warning`. Only `warning` is drawn with the warning colours (a small icon in the list, the strip on the overview). |
| `category` | no | `announce` (default), `update` or `guide`: the tabs of the home tile (公告, 更新, 教程) and the filter of the page. |
| `importance` | no | `normal` (a notice in the list, the tile and the page), `popup` (a content dialog, shown once) or `must-read` (a content dialog that stays until it is confirmed). The older field `mode` (`notice`, `modal`, `must-read`) means the same and is still read; `importance` wins when both are present. |
| `banner` | no | A picture, 3:2, `https:` only, at most 500 characters: the carousel of the home tile, the thumbnail in the list and the top of the dialog and the announcement. Without it the first image of the text is used on the home tile. |
| `published` | no | ISO-8601. The date shown in the list and the tile; `starts` is the fallback. It does not hide anything before it. |
| `revision` | no | 1 to 32 characters from `A-Z a-z 0-9 . _ -`, or a non-negative integer (default `"1"`). Change it when the content changes: 下次公告更新前不再显示, dismissed, shown and acknowledged all count for one revision, so a new revision comes back. |
| `countdown` | no | Accepted for older files and ignored: a must-read has no countdown. |

Unknown fields are ignored, so newer files stay readable by older clients.

### Validation

Every item is checked on its own. An item that breaks a rule is dropped and the others are kept.
The rules that drop a whole item: a bad or duplicate `id`, an unknown `severity`, no valid
`title`, a `url` that is not a plain `https:` URL within 500 characters (`javascript:`, `http:`,
`data:` and the like are all rejected), a date that does not parse, `ends` not after `starts`, an
unparsable version, or a field of the wrong type (for example `pinned: "yes"`). A single locale
entry that is too long or not a string is dropped and the item keeps its other entries.

Titles are plain text. Bodies are Markdown, read by a small safe reader (`announcements/markdown.js`):
headings, paragraphs, bullet and numbered lists, quotes, fenced code, rules, `**bold**`, `*italic*`,
`~~strike~~`, `` `code` ``, `[links](https://…)` and `![images](https://…)`. Links and images must be
`https:`; anything else (and every HTML tag) stays as the text it was written as. The page is built
from real elements, never from inserted HTML. Control characters, line and
paragraph separators, byte order marks and the bidirectional override controls are removed;
in titles newlines are removed as well, in bodies they are kept. Whitespace at both ends is
trimmed and nothing inside the text is collapsed. Lengths are counted in characters
(code points), not UTF-16 units.

A file larger than 256 KB is ignored.

### Dates

`starts` and `ends` accept `YYYY-MM-DD` (midnight UTC) or `YYYY-MM-DDThh:mm[:ss[.fff]]` followed by
`Z` or an offset such as `+08:00`. A date-time without an offset is rejected because it would
mean a different moment in every time zone. An impossible date such as `2026-02-31` is rejected.
An item is active from `starts` (inclusive) until `ends` (exclusive).

### Versions

Versions are dotted numbers compared segment by segment, missing segments counting as 0. A leading
`v` and everything after the numeric part are ignored: `v2026.925.152547.suffix` is
`2026.925.152547` and `1.2.3-beta.1` is `1.2.3`. Both bounds are inclusive. If the running version
is unknown, an item that has a version bound is not shown.

### Locales

`title` and `body` are keyed by locale (`zh`, `en`, `zh_TW`, `zh-CN` and so on; `_` and `-` are the
same and case is ignored). The text for the user's locale is chosen in this order: the exact
locale; the same locale with trailing parts removed (`zh_TW` then `zh`); any other key of the same
language; `en`; the first key in the file. Title and body are resolved separately.

## Behaviour in the client

Order: `critical`, then `warn`, then `info`; inside a severity pinned items first, then the newest
`published` (or `starts`) first, then by `id`.

One announcement is not in the file: **the open-source notice** (`builtin-open-source`, in `announcements/builtin.js`) ships with the product, in Chinese and English. It says that the software is free and open source (GPL-3.0), that no one is authorised to sell it and that a purchase should be refunded, with the GitHub link, in the standard wording of MAA and ZZZ OneDragon. It is a pinned notice of the kind 公告 that is there offline too, never a popup or a warning, cannot be dismissed, does not count as unread, and a file cannot replace it (an item with that id is ignored). 关于 has a short row for it beside the licence rows.

Where an announcement shows:

* **Home, tile 资讯**: a banner carousel (3:2, the next banner every 5 seconds, pips on hover, a click opens the
  announcement) beside the list of posts in tabs by `category` with their dates. At M the banner is on the
  left, at L on top, at XL they are side by side. There is no tile when there is nothing to show.
* **公告 page** (the bell of the caption bar, or a click in the tile): a list of cards (banner or a small icon,
  the title, the kind and the date, the first words); a click opens the announcement in place with its
  Markdown. Opening an announcement reads it.
* **Bell**: the number of announcements that are neither read nor hidden, nothing else.
* **Strip on the overview**: only an unread notice of type `warning`.
* **Dialog** (`importance` `popup` or `must-read`): a content dialog in the way of MAA's announcement: the
  banner, the Markdown text with its images, the choice 下次公告更新前不再显示 and the confirm button.
  A popup comes once and closes with the button, the scrim or Esc. A must-read stays until it is confirmed:
  the confirm button works once the text has been scrolled to the end (a text that fits needs no scroll),
  with the plain hint 读到最后即可确认 while it does not. There is no countdown and nothing else to wait for.

Reading is recorded in `localStorage`, always with the `revision` it was recorded for
(`foundation-ui.announcements.revisions`): dismissed ids (`…dismissed`, a JSON array, oldest first, at most
200), popups shown (`…shown`), must-reads acknowledged (`…acked`) and the hidden choice (`…hidden`, id to
revision). A new `revision` of the same id counts as unread again and shows its dialog again. A missing or
corrupted value counts as "nothing recorded".

Critical items cannot be dismissed. A critical item is dismissible only once its `ends` has passed
and by then it is no longer active, so while it is shown it stays; without `ends` it never goes
away until the file changes. Use critical sparingly and always set `ends`.

The client never sends cookies, custom headers, a referrer or a query string, and uses no
identifier or analytics. The request is a plain `GET` with `credentials: 'omit'`,
`referrerPolicy: 'no-referrer'` and `cache: 'no-store'` (the client keeps its own cache).

## Publishing

1. Edit the file and validate it by running it through `parseAnnouncements` (a mistake only drops
   the affected item, so check that every item you wrote survives).
2. Upload the identical file to `release-metadata/` on `alkaidlab.com` and `alkaidlab.cn`.
3. Clients cache the file for 30 minutes (in memory and in `localStorage` under
   `foundation-ui.announcements.cache`), and ask the server without using the browser HTTP cache.
   A change therefore reaches running clients within about 30 minutes plus whatever a CDN
   in front of the hosts holds (the release metadata uses `max-age=600`); newly started
   clients see it as soon as their cache expires.
4. A client that cannot reach either host keeps showing its last good copy for up to 24 hours,
   then nothing. A 404 from both hosts (file removed) clears it at the next refresh.
5. To retire an item, set `ends` to the current time (or any past time) and leave it in the file for
   a while, or delete it. Setting `ends` ahead of time is best: it also covers clients that
   still hold a cached copy, because the window is checked on every display, not only on fetch.
6. Never reuse an `id` for a different announcement. To change the content of one, keep the `id` and change
   its `revision`: it comes back for everyone, also for those who chose 下次公告更新前不再显示. Put the date or a
   counter in ids.
7. Pictures are plain files on a host you control (`https:`, 3:2, about 900 x 600 pixels is enough); the client
   fetches them without cookies or a referrer.
