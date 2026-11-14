// The report sheet's report as the document of a user_report event (telemetry/report.js reportToEvent): the type the person picked is the category, an error brings its name, message, code, page and stack (summarised
// in the message), feedback without an error brings nothing but the words. Nothing public is created: the sheet sends the event to the host, which sends it to the developers' own server.
import { REPORT_TYPES, buildReport, reportToDocument } from '../telemetry/index.js'

/** The categories of the sheet's type choice, in the order the person sees them: 问题/崩溃, 功能建议, 体验改进, 其他. */
export const SHEET_TYPES = Object.freeze(['bug', 'suggestion', 'performance', 'other'])
/** @returns the document for reportToEvent, or null while the title or the description is empty */
export function userReportDocument({ error = null, title = '', description = '', type = '', product = 'web' } = {}) {
  const e = error ? { name: String(error.name || 'Error'), message: String(error.message || ''), stack: String(error.stack || '') } : { name: 'Feedback', message: '', stack: '' }
  const report = buildReport(e, { kind: error ? 'error' : 'manual', fatal: false, context: { product, page: error?.page || '', code: error?.code || '', category: error?.code ? 'ui' : '' } })
  return reportToDocument(report, { title, description, type: REPORT_TYPES.includes(type) ? type : '' })
}
