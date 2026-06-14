import { prisma } from '~~/server/utils/prisma'
import { PIPELINE_STATUSES } from '~~/shared/constants'

export default defineEventHandler(async () => {
  const leads = await prisma.lead.findMany({
    orderBy: { opportunityScore: 'desc' },
    select: {
      id: true, businessName: true, category: true, city: true,
      opportunityScore: true, priority: true, status: true, phone: true, website: true,
    },
  })

  const columns: Record<string, typeof leads> = {}
  for (const s of PIPELINE_STATUSES) columns[s] = []
  for (const l of leads) (columns[l.status] ??= []).push(l)

  return { statuses: PIPELINE_STATUSES, columns }
})
