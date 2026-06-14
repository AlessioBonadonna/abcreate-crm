import { prisma } from '../utils/prisma'
import { DEFAULT_SETTINGS } from '~~/shared/constants'
import type { MessageSettings } from './messaging'

/** Read all settings as a key→value map, with defaults filled in. */
export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany()
  const map: Record<string, string> = { ...DEFAULT_SETTINGS }
  for (const r of rows) map[r.key] = r.value
  return map
}

/** Settings shape needed by the message generator. */
export async function getMessageSettings(): Promise<MessageSettings> {
  const s = await getAllSettings()
  return {
    senderName: s.senderName ?? 'AB Create',
    priceLanding: s.priceLanding ?? '400',
    priceVetrina: s.priceVetrina ?? '700',
    priceGestionale: s.priceGestionale ?? '800',
    deliveryWeeks: s.deliveryWeeks ?? '2',
    portfolioMain: s.portfolioMain ?? 'abcreate.it',
    portfolioSite1: s.portfolioSite1 ?? 'spaziopresente.it',
    portfolioSite2: s.portfolioSite2 ?? 'progettoservizilivorno.it',
  }
}

/** Upsert a batch of settings. */
export async function saveSettings(values: Record<string, string>): Promise<void> {
  await Promise.all(
    Object.entries(values).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } }),
    ),
  )
}
