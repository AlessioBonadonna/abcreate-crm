import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { runSearch } from '~~/server/services/searchRunner'

const bodySchema = z.object({
  cities: z.array(z.string().trim().min(1)).min(1, 'Inserisci almeno una città'),
  categories: z.array(z.string().min(1)).min(1, 'Seleziona almeno una categoria'),
  analyzeSites: z.boolean().default(true),
  excludeChains: z.boolean().default(true),
  onlyWithoutWebsite: z.boolean().default(false),
  minScore: z.number().int().min(0).max(10).default(0),
  usePlaces: z.boolean().default(false),
})

export default defineEventHandler(async (event) => {
  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: parsed.error.issues[0]?.message ?? 'Input non valido' })
  }
  const opts = parsed.data

  const run = await prisma.searchRun.create({
    data: {
      cities: JSON.stringify(opts.cities),
      categories: JSON.stringify(opts.categories),
      status: 'running',
      progress: 0,
      message: 'Avvio…',
    },
  })

  // Fire-and-forget — progress is polled via /api/search/[id].
  void runSearch(run.id, opts)

  return { runId: run.id }
})
