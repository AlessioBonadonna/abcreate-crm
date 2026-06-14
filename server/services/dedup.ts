import type { RawLead } from '~~/shared/types'

/** Lowercase, strip diacritics, collapse whitespace, drop punctuation. */
export function normalizeText(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Keep digits only — for phone comparison (ignores +39, spaces, /, -). */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ''
  let d = phone.replace(/\D/g, '')
  // drop a leading Italian country code so 39055... == 055...
  if (d.startsWith('39') && d.length > 9) d = d.slice(2)
  return d
}

/** Normalize a website to a bare domain: https://www.Foo.it/bar -> foo.it */
export function normalizeDomain(website: string | null | undefined): string {
  if (!website) return ''
  let w = website.trim().toLowerCase()
  w = w.replace(/^https?:\/\//, '').replace(/^www\./, '')
  w = w.split('/')[0] ?? w
  w = w.split('?')[0] ?? w
  return w.trim()
}

/**
 * Build a stable dedup key for a lead. Priority:
 *   1. normalized website domain
 *   2. name + city + phone
 *   3. name + city + address
 * Ported from v1 dedup.py.
 */
export function buildDedupKey(lead: RawLead): string {
  const domain = normalizeDomain(lead.website)
  if (domain) return `web:${domain}`

  const name = normalizeText(lead.businessName)
  const city = normalizeText(lead.city)
  const phone = normalizePhone(lead.phone)
  if (phone) return `np:${name}|${city}|${phone}`

  const address = normalizeText(lead.address)
  return `na:${name}|${city}|${address}`
}
