import { z } from 'zod'
import { saveSettings, getAllSettings } from '~~/server/services/settings'

// Accept a flat map of string settings.
const schema = z.record(z.string(), z.string())

export default defineEventHandler(async (event) => {
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Impostazioni non valide' })
  }
  await saveSettings(parsed.data)
  return getAllSettings()
})
