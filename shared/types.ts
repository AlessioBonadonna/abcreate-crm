// Shared domain types — usable from both `app/` (Vue) and `server/` (Nitro).

export type LeadSource = 'openstreetmap' | 'google_places'
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'

export type PipelineStatus =
  | 'Da contattare'
  | 'Contattato'
  | 'Follow-up'
  | 'Risposto'
  | 'In trattativa'
  | 'Cliente'
  | 'Scartato'

export type Channel = 'WhatsApp' | 'Email' | 'Telefono' | 'Di persona' | 'Instagram'

/** A category in the discovery taxonomy. */
export interface CategoryDef {
  key: string
  label: string // Italian display label
  /** OSM tags as `key=value` strings; matched with OR semantics in Overpass. */
  osmTags: string[]
  /** Search term used by Google Places Text Search. */
  placesQuery: string
  /** Keywords used to narrow broad tags (e.g. office=company) — ported from v1. */
  keywords?: string[]
  /**
   * Target kind. 'client' = final business that might buy a site (legacy default).
   * 'partner' = web agency / studio / accountant we want to PARTNER with
   * (white-label / overflow / referral). Scoring is inverted for partners.
   */
  kind?: 'client' | 'partner'
}

/** Raw lead as returned by a LeadProvider, before persistence. */
export interface RawLead {
  businessName: string
  category: string
  city: string
  address?: string | null
  website?: string | null
  email?: string | null
  phone?: string | null
  openingHours?: string | null
  latitude?: number | null
  longitude?: number | null
  source: LeadSource
  isChain?: boolean
  /** rating/reviews when available (Google Places) */
  rating?: number | null
  reviews?: number | null
}

/** Result of analyzing a lead's website. */
export interface SiteAnalysis {
  httpStatus: number | null
  hasHttps: boolean
  pageTitle: string | null
  metaDescription: string | null
  hasWhatsapp: boolean
  hasGoogleMaps: boolean
  hasContactForm: boolean
  hasContactPage: boolean
  hasEmailOnSite: boolean
  hasPhoneOnSite: boolean
  hasSocialLinks: boolean
  textLength: number
  loadError: string | null
}

/** Output of the scoring engine. */
export interface ScoreResult {
  opportunityScore: number // 0-10
  priority: Priority
  detectedProblems: string[]
  segment: string
  mainProblem: string
}

/** A generated outreach message set for a lead. */
export interface GeneratedMessages {
  whatsapp: string
  email: { subject: string; body: string }
}
