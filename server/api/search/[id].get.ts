import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id mancante' })

  const run = await prisma.searchRun.findUnique({ where: { id } })
  if (!run) throw createError({ statusCode: 404, statusMessage: 'Ricerca non trovata' })

  return {
    id: run.id,
    status: run.status,
    progress: run.progress,
    message: run.message,
    totalFound: run.totalFound,
    newLeads: run.newLeads,
    cities: JSON.parse(run.cities) as string[],
    categories: JSON.parse(run.categories) as string[],
    createdAt: run.createdAt,
  }
})
