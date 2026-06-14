import type { RawLead } from '~~/shared/types'

export interface DiscoveryParams {
  cities: string[]
  /** category keys from CATEGORIES */
  categories: string[]
  /** delay between external requests, ms (rate limiting) */
  delayMs: number
  /** optional progress callback (0-100 over the whole run) */
  onProgress?: (pct: number, message: string) => void | Promise<void>
}

/**
 * A pluggable source of leads. Discovery must never depend on a single source —
 * see OsmProvider (default) and GooglePlacesProvider (optional enrichment).
 */
export interface LeadProvider {
  readonly name: string
  /** Whether the provider is usable (e.g. API key present). */
  isAvailable(): boolean
  discover(params: DiscoveryParams): Promise<RawLead[]>
}

/** Small promise-based sleep used for rate limiting. */
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
