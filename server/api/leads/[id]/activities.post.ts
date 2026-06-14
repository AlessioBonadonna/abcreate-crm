import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'

const schema = z.object({
  type: z.enum(['messaggio_inviato', 'risposta', 'nota', 'cambio_stato']),
  content: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id mancante' })

  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Input non valido' })
  }

  const lead = await prisma.lead.findUnique({ where: { id } })
  if (!lead) throw createError({ statusCode: 404, statusMessage: 'Lead non trovato' })

  return prisma.activity.create({
    data: { leadId: id, type: parsed.data.type, content: parsed.data.content ?? null },
  })
})
