import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id mancante' })
  await prisma.messageTemplate.delete({ where: { id } })
  return { ok: true }
})
