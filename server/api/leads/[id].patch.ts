import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { PIPELINE_STATUSES, CHANNELS } from '~~/shared/constants'

const patchSchema = z.object({
  status: z.enum(PIPELINE_STATUSES as [string, ...string[]]).optional(),
  channel: z.enum(CHANNELS as [string, ...string[]]).nullable().optional(),
  nextFollowUp: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id mancante' })

  const parsed = patchSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Input non valido' })
  }
  const data = parsed.data

  const current = await prisma.lead.findUnique({ where: { id } })
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Lead non trovato' })

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.channel !== undefined ? { channel: data.channel } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.nextFollowUp !== undefined
        ? { nextFollowUp: data.nextFollowUp ? new Date(data.nextFollowUp) : null }
        : {}),
    },
  })

  // log a status-change activity
  if (data.status && data.status !== current.status) {
    await prisma.activity.create({
      data: {
        leadId: id,
        type: 'cambio_stato',
        content: `${current.status} → ${data.status}`,
      },
    })
  }

  return updated
})
