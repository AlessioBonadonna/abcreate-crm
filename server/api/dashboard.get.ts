import { prisma } from '~~/server/utils/prisma'
import { PIPELINE_STATUSES } from '~~/shared/constants'

export default defineEventHandler(async () => {
  const now = new Date()
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  const [total, grouped, dueToday, highPriority, clienti] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.lead.count({
      where: {
        nextFollowUp: { lte: endOfToday },
        status: { notIn: ['Cliente', 'Scartato'] },
      },
    }),
    prisma.lead.count({ where: { priority: 'HIGH', status: 'Da contattare' } }),
    prisma.lead.count({ where: { status: 'Cliente' } }),
  ])

  const byStatus: Record<string, number> = {}
  for (const s of PIPELINE_STATUSES) byStatus[s] = 0
  for (const g of grouped) byStatus[g.status] = g._count._all

  const conversionRate = total > 0 ? Math.round((clienti / total) * 1000) / 10 : 0

  return {
    total,
    byStatus,
    dueToday,
    highPriorityToContact: highPriority,
    clienti,
    conversionRate, // %
  }
})
