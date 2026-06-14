import type { RawLead } from '~~/shared/types'
import { CATEGORY_BY_KEY, KNOWN_CHAINS } from '~~/shared/constants'
import type { DiscoveryParams, LeadProvider } from './types'
import { sleep } from './types'

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const OVERPASS = 'https://overpass-api.de/api/interpreter'
const UA = 'AB-Create-CRM/1.0 (local freelance lead tool; contact: abcreate.it)'

export interface GeoArea {
  /** Overpass area id (3600000000 + relation id) when available */
  areaId?: number
  /** bounding box fallback: [south, west, north, east] */
  bbox?: [number, number, number, number]
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

function isChainName(name: string, tags: Record<string, string>): boolean {
  const n = name.toLowerCase()
  if (KNOWN_CHAINS.some((c) => n.includes(c))) return true
  // a `brand` tag almost always indicates a chain/franchise
  if (tags.brand || tags['brand:wikidata']) return true
  return false
}

function composeAddress(tags: Record<string, string>): string | null {
  const street = tags['addr:street']
  const num = tags['addr:housenumber']
  const city = tags['addr:city']
  const postcode = tags['addr:postcode']
  const parts: string[] = []
  if (street) parts.push(num ? `${street} ${num}` : street)
  if (postcode || city) parts.push([postcode, city].filter(Boolean).join(' '))
  return parts.length ? parts.join(', ') : null
}

/** Geocode an Italian city via Nominatim → Overpass area or bbox. */
async function geocodeCity(city: string): Promise<GeoArea | null> {
  const url = `${NOMINATIM}?q=${encodeURIComponent(city + ', Italia')}&format=json&limit=1&countrycodes=it`
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'it' } })
  if (!res.ok) return null
  const data = (await res.json()) as Array<{
    osm_type: string
    osm_id: number
    boundingbox: [string, string, string, string]
  }>
  const hit = data[0]
  if (!hit) return null

  const area: GeoArea = {}
  if (hit.osm_type === 'relation') {
    area.areaId = 3600000000 + hit.osm_id
  }
  if (hit.boundingbox) {
    const [s, n, w, e] = hit.boundingbox.map(Number)
    if ([s, n, w, e].every((x) => Number.isFinite(x))) {
      area.bbox = [s!, w!, n!, e!]
    }
  }
  return area.areaId || area.bbox ? area : null
}

/** Build an Overpass QL query for a set of `key=value` tags within an area. Exported for tests. */
export function buildOverpassQuery(osmTags: string[], area: GeoArea): string {
  const selectors: string[] = []
  let scope = ''
  let scopeRef = ''

  if (area.areaId) {
    scope = `area(${area.areaId})->.searchArea;`
    scopeRef = '(area.searchArea)'
  } else if (area.bbox) {
    const [s, w, n, e] = area.bbox
    scopeRef = `(${s},${w},${n},${e})`
  }

  for (const tag of osmTags) {
    const [k, v] = tag.split('=')
    const filt = `["${k}"="${v}"]`
    selectors.push(`  node${filt}${scopeRef};`)
    selectors.push(`  way${filt}${scopeRef};`)
    selectors.push(`  relation${filt}${scopeRef};`)
  }

  return `[out:json][timeout:60];
${scope}
(
${selectors.join('\n')}
);
out center tags;`
}

async function queryOverpass(query: string): Promise<OverpassElement[]> {
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
    body: 'data=' + encodeURIComponent(query),
  })
  if (!res.ok) throw new Error(`Overpass ${res.status}`)
  const data = (await res.json()) as { elements?: OverpassElement[] }
  return data.elements ?? []
}

function toRawLead(el: OverpassElement, categoryKey: string, city: string): RawLead | null {
  const tags = el.tags ?? {}
  const name = tags.name
  if (!name) return null

  const lat = el.lat ?? el.center?.lat ?? null
  const lon = el.lon ?? el.center?.lon ?? null

  return {
    businessName: name,
    category: categoryKey,
    city,
    address: composeAddress(tags),
    website: tags.website || tags['contact:website'] || null,
    email: tags.email || tags['contact:email'] || null,
    phone: tags.phone || tags['contact:phone'] || tags['contact:mobile'] || null,
    openingHours: tags.opening_hours || null,
    latitude: lat,
    longitude: lon,
    source: 'openstreetmap',
    isChain: isChainName(name, tags),
  }
}

export class OsmProvider implements LeadProvider {
  readonly name = 'openstreetmap'

  isAvailable(): boolean {
    return true // always available, no key required
  }

  async discover(params: DiscoveryParams): Promise<RawLead[]> {
    const { cities, categories, delayMs, onProgress } = params
    const results: RawLead[] = []
    const seen = new Set<string>() // intra-run dedupe by osm id

    const total = cities.length * categories.length
    let done = 0

    for (const city of cities) {
      await onProgress?.(Math.round((done / total) * 100), `Geocoding ${city}…`)
      let area: GeoArea | null = null
      try {
        area = await geocodeCity(city)
      } catch {
        area = null
      }
      await sleep(delayMs)

      if (!area) {
        done += categories.length
        await onProgress?.(Math.round((done / total) * 100), `Città non trovata: ${city}`)
        continue
      }

      for (const catKey of categories) {
        const cat = CATEGORY_BY_KEY[catKey]
        if (!cat) {
          done++
          continue
        }
        await onProgress?.(
          Math.round((done / total) * 100),
          `${cat.label} a ${city}…`,
        )
        try {
          const query = buildOverpassQuery(cat.osmTags, area)
          const elements = await queryOverpass(query)
          for (const el of elements) {
            const key = `${el.type}/${el.id}`
            if (seen.has(key)) continue
            seen.add(key)
            const lead = toRawLead(el, catKey, city)
            if (lead) results.push(lead)
          }
        } catch (err) {
          await onProgress?.(
            Math.round((done / total) * 100),
            `Errore Overpass (${cat.label} a ${city})`,
          )
        }
        done++
        await sleep(delayMs)
      }
    }

    await onProgress?.(100, `Trovati ${results.length} risultati`)
    return results
  }
}
