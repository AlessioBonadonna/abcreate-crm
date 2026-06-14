import ExcelJS from 'exceljs'

export interface ExportRow {
  businessName: string
  category: string
  city: string
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  opportunityScore: number
  priority: string
  segment: string | null
  status: string
  channel: string | null
  source: string
  enrichedVia: string | null
  nextFollowUp: Date | null
  notes: string | null
}

export const EXPORT_COLUMNS: { key: keyof ExportRow; header: string }[] = [
  { key: 'businessName', header: 'Attività' },
  { key: 'category', header: 'Categoria' },
  { key: 'city', header: 'Città' },
  { key: 'address', header: 'Indirizzo' },
  { key: 'phone', header: 'Telefono' },
  { key: 'email', header: 'Email' },
  { key: 'website', header: 'Sito' },
  { key: 'opportunityScore', header: 'Score' },
  { key: 'priority', header: 'Priorità' },
  { key: 'segment', header: 'Segmento' },
  { key: 'status', header: 'Stato' },
  { key: 'channel', header: 'Canale' },
  { key: 'source', header: 'Fonte' },
  { key: 'enrichedVia', header: 'Arricchito via' },
  { key: 'nextFollowUp', header: 'Prossimo follow-up' },
  { key: 'notes', header: 'Note' },
]

function cell(row: ExportRow, key: keyof ExportRow): string {
  const v = row[key]
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v)
}

/** RFC-4180-ish CSV escaping. */
function csvEscape(s: string): string {
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(rows: ExportRow[]): string {
  const head = EXPORT_COLUMNS.map((c) => c.header).join(',')
  const lines = rows.map((r) => EXPORT_COLUMNS.map((c) => csvEscape(cell(r, c.key))).join(','))
  return [head, ...lines].join('\r\n')
}

export async function toXlsx(rows: ExportRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'AB Create CRM'
  const ws = wb.addWorksheet('Lead')
  ws.columns = EXPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key as string, width: 22 }))
  ws.getRow(1).font = { bold: true }
  for (const r of rows) {
    const obj: Record<string, string> = {}
    for (const c of EXPORT_COLUMNS) obj[c.key as string] = cell(r, c.key)
    ws.addRow(obj)
  }
  const out = await wb.xlsx.writeBuffer()
  return Buffer.from(out)
}
