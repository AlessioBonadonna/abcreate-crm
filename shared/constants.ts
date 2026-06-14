import type { CategoryDef, PipelineStatus, Channel } from './types'

// ---------------------------------------------------------------------------
// CATEGORY_MAP — ported/reconstructed from v1 config.py.
// OSM tags are matched with OR semantics. Where OSM has no perfect tag for an
// Italian trade, the closest practical tag(s) are used (noted in the README).
// ---------------------------------------------------------------------------
export const CATEGORIES: CategoryDef[] = [
  { key: 'cleaning', label: 'Impresa di pulizie', osmTags: ['craft=cleaning', 'office=cleaning'], placesQuery: 'impresa di pulizie' },
  { key: 'mechanic', label: 'Officina meccanica', osmTags: ['shop=car_repair'], placesQuery: 'officina meccanica auto' },
  { key: 'body_shop', label: 'Carrozzeria', osmTags: ['shop=car_repair', 'craft=car_repair'], placesQuery: 'carrozzeria auto' },
  { key: 'plumber', label: 'Idraulico', osmTags: ['craft=plumber'], placesQuery: 'idraulico' },
  { key: 'electrician', label: 'Elettricista', osmTags: ['craft=electrician'], placesQuery: 'elettricista' },
  { key: 'hairdresser', label: 'Parrucchiere', osmTags: ['shop=hairdresser'], placesQuery: 'parrucchiere' },
  { key: 'construction', label: 'Impresa edile', osmTags: ['craft=builder', 'office=construction_company', 'craft=construction'], placesQuery: 'impresa edile costruzioni' },
  { key: 'restaurant', label: 'Ristorante', osmTags: ['amenity=restaurant'], placesQuery: 'ristorante' },
  { key: 'gym', label: 'Palestra', osmTags: ['leisure=fitness_centre', 'leisure=sports_centre'], placesQuery: 'palestra' },
  { key: 'personal_trainer', label: 'Personal trainer', osmTags: ['leisure=fitness_centre', 'office=personal_trainer'], placesQuery: 'personal trainer' },
  { key: 'real_estate', label: 'Agenzia immobiliare', osmTags: ['office=estate_agent'], placesQuery: 'agenzia immobiliare' },
  { key: 'barber', label: 'Barbiere', osmTags: ['shop=hairdresser', 'shop=barber'], placesQuery: 'barbiere' },
  { key: 'dentist', label: 'Dentista', osmTags: ['amenity=dentist', 'healthcare=dentist'], placesQuery: 'studio dentistico' },
]

export const CATEGORY_BY_KEY: Record<string, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
)

// ---------------------------------------------------------------------------
// KNOWN_CHAINS — businesses to exclude (franchises / chains). Lowercased match.
// ---------------------------------------------------------------------------
export const KNOWN_CHAINS: string[] = [
  // food
  "mcdonald", 'burger king', 'kfc', 'old wild west', 'roadhouse', 'autogrill',
  'spizzico', 'rossopomodoro', "domino", 'pizza hut', 'subway', 'starbucks',
  'la piadineria', 'temakinho', 'wagamama', "chef express",
  // supermarkets / retail
  'conad', 'coop', 'esselunga', 'carrefour', 'lidl', 'eurospin', 'penny',
  'pam ', 'despar', 'sigma', 'crai', 'md discount', 'tigros', 'bennet',
  // gyms
  'mcfit', 'virgin active', 'anytime fitness', 'get fit', 'fit express',
  'fit924', 'mc fit',
  // real estate
  'tecnocasa', 'gabetti', 're/max', 'remax', 'toscano', 'grimaldi', 'professionecasa',
  // hair / beauty
  'jean louis david', 'compagnia della bellezza', 'toni&guy', 'franchising',
  // auto
  'euromaster', 'norauto', 'bosch car service', 'midas', 'carglass', 'speedy',
  'first stop', 'pneusmarket',
]

// ---------------------------------------------------------------------------
// CRM pipeline & channels
// ---------------------------------------------------------------------------
export const PIPELINE_STATUSES: PipelineStatus[] = [
  'Da contattare',
  'Contattato',
  'Follow-up',
  'Risposto',
  'In trattativa',
  'Cliente',
  'Scartato',
]

export const CHANNELS: Channel[] = ['WhatsApp', 'Email', 'Telefono', 'Di persona', 'Instagram']

export const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const

// ---------------------------------------------------------------------------
// Default settings (seeded into the Setting table; editable from the UI).
// Real AB Create pricing — corrected from the v1's wrong 350€/39€.
// ---------------------------------------------------------------------------
export const DEFAULT_SETTINGS: Record<string, string> = {
  senderName: 'AB Create',
  priceLanding: '400',
  priceVetrina: '700',
  priceGestionale: '800',
  deliveryWeeks: '2',
  portfolioMain: 'abcreate.it',
  portfolioSite1: 'spaziopresente.it',
  portfolioSite2: 'progettoservizilivorno.it',
  providerDelayMs: '1100', // rate-limit delay between external API calls
  googlePlacesEnabled: 'false',
}
