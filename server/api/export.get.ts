import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { buildLeadWhere, LEAD_SORTS } from '~~/server/utils/leadQuery'
import { toCsv, toXlsx, type ExportRow } from '~~/server/services/exporter'

const querySchema = z.object({
  format: z.enum(['csv', 'xlsx']).default('xlsx'),
  q: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  segment: z.string().optional(),
  sort: z.string().default('score_desc'),
})

export default defineEventHandler(async (event) => {
  const q = querySchema.parse(getQuery(event))
  const rows = (await prisma.lead.findMany({
    where: buildLeadWhere(q),
    orderBy: LEAD_SORTS[q.sort] ?? LEAD_SORTS.score_desc,
  })) as unknown as ExportRow[]

  const stamp = new Date().toISOString().slice(0, 10)

  if (q.format === 'csv') {
    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
    setHeader(event, 'Content-Disposition', `attachment; filename="lead-${stamp}.csv"`)
    return '﻿' + toCsv(rows) // BOM for Excel UTF-8
  }

  const buf = await toXlsx(rows)
  setHeader(event, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  setHeader(event, 'Content-Disposition', `attachment; filename="lead-${stamp}.xlsx"`)
  return buf
})
