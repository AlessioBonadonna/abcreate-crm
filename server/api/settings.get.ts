import { getAllSettings } from '~~/server/services/settings'

export default defineEventHandler(async () => {
  return getAllSettings()
})
