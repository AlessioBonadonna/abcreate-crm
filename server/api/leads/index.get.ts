import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { buildLeadWhere, LEAD_SORTS } from '~~/server/utils/leadQuery'

const querySchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  segment: z.string().optional(),
  sort: z.string().default('score_desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
})

export default defineEventHandler(async (event) => {
  const q = querySchema.parse(getQuery(event))

  const where = buildLeadWhere(q)
  const orderBy = LEAD_SORTS[q.sort] ?? LEAD_SORTS.score_desc

  const [total, rows] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy,
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ])

  return {
    total,
    page: q.page,
    pageSize: q.pageSize,
    pages: Math.ceil(total / q.pageSize),
    leads: rows.map((l) => ({
      ...l,
      detectedProblems: l.detectedProblems ? (JSON.parse(l.detectedProblems) as string[]) : [],
    })),
  }
})
