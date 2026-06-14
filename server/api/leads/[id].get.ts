import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id mancante' })

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { activities: { orderBy: { createdAt: 'desc' } } },
  })
  if (!lead) throw createError({ statusCode: 404, statusMessage: 'Lead non trovato' })

  return {
    ...lead,
    detectedProblems: lead.detectedProblems ? (JSON.parse(lead.detectedProblems) as string[]) : [],
  }
})
