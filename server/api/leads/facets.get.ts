import { prisma } from '~~/server/utils/prisma'
import { CATEGORIES, PIPELINE_STATUSES } from '~~/shared/constants'

export default defineEventHandler(async () => {
  const cityRows = await prisma.lead.findMany({
    distinct: ['city'],
    select: { city: true },
    orderBy: { city: 'asc' },
  })
  return {
    cities: cityRows.map((r) => r.city),
    categories: CATEGORIES.map((c) => ({ key: c.key, label: c.label })),
    statuses: PIPELINE_STATUSES,
    priorities: ['HIGH', 'MEDIUM', 'LOW'],
    segments: ['no_website', 'weak_website', 'decent_website', 'blocked'],
  }
})
