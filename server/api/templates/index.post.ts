import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'

const schema = z.object({
  name: z.string().trim().min(1, 'Nome obbligatorio'),
  segment: z.string().nullable().optional(),
  channel: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  body: z.string().min(1, 'Corpo obbligatorio'),
})

export default defineEventHandler(async (event) => {
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Input non valido' })
  }
  return prisma.messageTemplate.create({ data: parsed.data })
})
