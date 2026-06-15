import type { RawLead } from '~~/shared/types'
import { CATEGORY_BY_KEY, KNOWN_CHAINS } from '~~/shared/constants'
import type { DiscoveryParams, LeadProvider } from './types'
import { sleep } from './types'

const SEARCH_TEXT = 'https://places.googleapis.com/v1/places:searchText'
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.regularOpeningHours.weekdayDescriptions',
].join(',')

interface PlaceResult {
  id: string
  displayName?: { text: string }
  formattedAddress?: string
  location?: { latitude: number; longitude: number }
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  websiteUri?: string
  rating?: number
  userRatingCount?: number
  regularOpeningHours?: { weekdayDescriptions?: string[] }
}

function isChain(name: string, category: string): boolean {
  const n = name.toLowerCase()
  const list = [...(KNOWN_CHAINS._general ?? []), ...(KNOWN_CHAINS[category] ?? [])]
  return list.some((c) => c && n.includes(c))
}

async function textSearch(query: string, apiKey: string): Promise<PlaceResult[]> {
  const res = await fetch(SEARCH_TEXT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, languageCode: 'it', regionCode: 'IT' }),
  })
  if (!res.ok) throw new Error(`Places ${res.status}`)
  const data = (await res.json()) as { places?: PlaceResult[] }
  return data.places ?? []
}

function toRawLead(p: PlaceResult, categoryKey: string, city: string): RawLead | null {
  const name = p.displayName?.text
  if (!name) return null
  return {
    businessName: name,
    category: categoryKey,
    city,
    address: p.formattedAddress ?? null,
    website: p.websiteUri ?? null,
    email: null, // Places does not expose email
    phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
    openingHours: p.regularOpeningHours?.weekdayDescriptions?.join('; ') ?? null,
    latitude: p.location?.latitude ?? null,
    longitude: p.location?.longitude ?? null,
    source: 'google_places',
    isChain: isChain(name, categoryKey),
    rating: p.rating ?? null,
    reviews: p.userRatingCount ?? null,
  }
}

/** Subset of fields Places can fill in for an existing OSM lead. */
export interface PlacesEnrichment {
  phone?: string | null
  website?: string | null
  address?: string | null
  rating?: number | null
  reviews?: number | null
}

export class GooglePlacesProvider implements LeadProvider {
  readonly name = 'google_places'
  constructor(private apiKey: string) {}

  isAvailable(): boolean {
    return !!this.apiKey
  }

  async discover(params: DiscoveryParams): Promise<RawLead[]> {
    if (!this.isAvailable()) return []
    const { cities, categories, delayMs, onProgress } = params
    const results: RawLead[] = []
    const total = cities.length * categories.length
    let done = 0

    for (const city of cities) {
      for (const catKey of categories) {
        const cat = CATEGORY_BY_KEY[catKey]
        if (!cat) {
          done++
          continue
        }
        await onProgress?.(
          Math.round((done / total) * 100),
          `Places: ${cat.label} a ${city}…`,
        )
        try {
          const places = await textSearch(`${cat.placesQuery} a ${city}`, this.apiKey)
          for (const p of places) {
            const lead = toRawLead(p, catKey, city)
            if (lead) results.push(lead)
          }
        } catch {
          /* ignore per-query errors */
        }
        done++
        await sleep(delayMs)
      }
    }
    return results
  }

  /** Look up a single business to fill missing phone/website. */
  async enrich(name: string, city: string): Promise<PlacesEnrichment | null> {
    if (!this.isAvailable()) return null
    try {
      const places = await textSearch(`${name} ${city}`, this.apiKey)
      const p = places[0]
      if (!p) return null
      return {
        phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
        website: p.websiteUri ?? null,
        address: p.formattedAddress ?? null,
        rating: p.rating ?? null,
        reviews: p.userRatingCount ?? null,
      }
    } catch {
      return null
    }
  }
}
