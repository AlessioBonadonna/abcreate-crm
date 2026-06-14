import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id mancante' })
  // activities cascade on delete (see schema relation)
  await prisma.lead.delete({ where: { id } })
  return { ok: true }
})
