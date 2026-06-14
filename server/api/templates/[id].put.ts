import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'

const schema = z.object({
  name: z.string().trim().min(1).optional(),
  segment: z.string().nullable().optional(),
  channel: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  body: z.string().min(1).optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id mancante' })

  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Input non valido' })
  }
  return prisma.messageTemplate.update({ where: { id }, data: parsed.data })
})
