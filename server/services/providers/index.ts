import { OsmProvider } from './osm'
import { GooglePlacesProvider } from './places'

export { OsmProvider } from './osm'
export { GooglePlacesProvider } from './places'
export type { PlacesEnrichment } from './places'
export type { LeadProvider, DiscoveryParams } from './types'

/** Read the Google Places key from runtime config / env. */
export function getPlacesApiKey(): string {
  // useRuntimeConfig is auto-imported in Nitro
  try {
    const cfg = useRuntimeConfig()
    return (cfg.googlePlacesApiKey as string) || process.env.GOOGLE_PLACES_API_KEY || ''
  } catch {
    return process.env.GOOGLE_PLACES_API_KEY || ''
  }
}

export function getOsmProvider(): OsmProvider {
  return new OsmProvider()
}

/** Returns a Places provider only when a key is configured, else null. */
export function getPlacesProvider(): GooglePlacesProvider | null {
  const key = getPlacesApiKey()
  return key ? new GooglePlacesProvider(key) : null
}
