# Log records, adapters and old encodings

The diagnostics package reads one normalized record shape and the viewer, error
centre, problem summary and diagnostics bundle all work from it. The shape and
the severity numbers follow the Platform design in
alkaidlab-platform/docs/architecture/logging-system.zh.md section 3 and
logging-record-encoding.md, which use the OpenTelemetry log data model
(OTel 1.62.0, stable).

## Record

| field | meaning |
|---|---|
| timeUnixNs | Timestamp, decimal nanoseconds since the Unix epoch (a string so the value is exact in JavaScript) |
| observedNs | ObservedTimestamp, when the adapter read the line |
| severity | SeverityNumber: trace 1, debug 5, info 9, warn 13, error 17, fatal 21, 0 unspecified |
| severityText | short name of the severity |
| domain | platform, ux or audit |
| event | domain.subject.action, for example host.session.connected |
| source | { layer, id }, the InstrumentationScope |
| traceId, spanId | W3C Trace Context ids when the line carries them; empty otherwise |
| outcome | success, degraded, fallback, blocked, error or empty |
| errorCode | stable machine-readable code |
| attributes | key/value facts; session and client ids live here as session.id and client.id |
| body | the short human text |

The host text adapter (host-text) reads lines of the form
[2026-11-02 10:00:00.123]: Warning: text; a line that does not open with a
stamp continues the previous record. It maps the host's labels to the severity
numbers above and marks a connection line as host.session.connected or
host.session.disconnected. A future adapter implements the same
{ id, name, parse(text) -> record[] } interface and is selected with
parseRecords(text, { adapter: id }); the rest of the package does not change.

The control panel's own LogEntry values use the panel adapter (panel): the
entry's timestamp, level, message, target, file and line become the same
record, with source.id panel and domain ux. The viewer reads the host and panel
records together, shows the source next to each line when both are present, and
offers the Host and Panel source chips. The panel export and the diagnostics
bundle use the same records, so the panel log is redacted by the same classes.

## Old files

A host log written before the UTF-8 change may contain the Windows system code
page. decodeLogBytes decodes each physical line separately: a line that is
valid UTF-8 is kept as it is, and a line that is not is decoded as GB18030 (the
WHATWG superset of GBK). createLogByteDecoder does the same across incremental
reads and keeps a split multibyte sequence pending. See the WHATWG Encoding
Standard (Living Standard, 19 October 2026) sections 8 and 10.

## Redaction

classifyKey follows diagnostics-redaction.md: a secret segment removes the
attribute, a sensitive key becomes h: plus 16 hex digits unless the person
chose to include network identity, a public key stays, and an unclassified key
is treated as sensitive. Free text also goes through the existing secret and
network passes. A bundle uses one salt, so the same value has the same
placeholder inside the bundle and cannot be compared with another bundle.

## Sources

- OpenTelemetry Logs Data Model, OTel 1.62.0 (stable), SeverityNumber and
  record fields.
- W3C Trace Context, Recommendation 23 November 2021, sections 3.2.2.3 and
  3.2.2.4 (trace-id and parent-id sizes, all-zero invalid).
- WHATWG Encoding Standard, Living Standard 19 October 2026, sections 8.1 and
  10.2 (UTF-8 and gb18030 decoders).
- Node.js v22 documentation, util.TextDecoder (fatal mode and the full-ICU
  encoding list).
