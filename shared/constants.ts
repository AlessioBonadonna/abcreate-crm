import type { CategoryDef, PipelineStatus, Channel } from './types'

// ---------------------------------------------------------------------------
// CATEGORY_MAP — ported/reconstructed from v1 config.py.
// OSM tags are matched with OR semantics. Where OSM has no perfect tag for an
// Italian trade, the closest practical tag(s) are used (noted in the README).
// ---------------------------------------------------------------------------
export const CATEGORIES: CategoryDef[] = [
  { key: 'cleaning', label: 'Impresa di pulizie', osmTags: ['office=cleaning', 'shop=cleaning', 'craft=cleaning'], placesQuery: 'impresa di pulizie' },
  { key: 'mechanic', label: 'Officina meccanica', osmTags: ['shop=car_repair', 'craft=mechanic'], placesQuery: 'officina meccanica auto' },
  { key: 'body_shop', label: 'Carrozzeria', osmTags: ['shop=car_repair', 'craft=car_repair'], placesQuery: 'carrozzeria auto' },
  { key: 'plumber', label: 'Idraulico', osmTags: ['craft=plumber'], placesQuery: 'idraulico' },
  { key: 'electrician', label: 'Elettricista', osmTags: ['craft=electrician'], placesQuery: 'elettricista' },
  { key: 'hairdresser', label: 'Parrucchiere', osmTags: ['shop=hairdresser'], placesQuery: 'parrucchiere' },
  { key: 'construction', label: 'Ditta edile', osmTags: ['office=company', 'craft=builder'], keywords: ['construction', 'building', 'edile', 'edilizia', 'costruzioni'], placesQuery: 'impresa edile costruzioni' },
  { key: 'restaurant', label: 'Ristorante', osmTags: ['amenity=restaurant', 'amenity=fast_food'], placesQuery: 'ristorante' },
  { key: 'gym', label: 'Palestra', osmTags: ['leisure=fitness_centre', 'sport=fitness'], placesQuery: 'palestra' },
  { key: 'personal_trainer', label: 'Personal trainer', osmTags: ['leisure=fitness_centre', 'sport=fitness'], keywords: ['personal trainer', 'personal training'], placesQuery: 'personal trainer' },
  { key: 'real_estate', label: 'Agenzia immobiliare', osmTags: ['office=estate_agent'], placesQuery: 'agenzia immobiliare' },
  { key: 'barber', label: 'Barbiere', osmTags: ['shop=barber'], placesQuery: 'barbiere' },
  { key: 'dentist', label: 'Dentista', osmTags: ['amenity=dentist'], placesQuery: 'studio dentistico' },
]

export const CATEGORY_BY_KEY: Record<string, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
)

// ---------------------------------------------------------------------------
// KNOWN_CHAINS — businesses to exclude (franchises / chains), per category plus
// a `_general` list. Ported verbatim from v1 config.py. Lowercased partial match.
// ---------------------------------------------------------------------------
export const KNOWN_CHAINS: Record<string, string[]> = {
  _general: [
    'mcdonald', 'burger king', 'kfc', 'subway', 'pizza hut', 'domino',
    'starbucks', 'ikea', 'h&m', 'zara', 'primark', 'decathlon',
  ],
  gym: [
    'virgin active', 'mcfit', 'fitactive', 'fit active', 'klab',
    'bodytech', 'world class', 'anytime fitness', 'basic-fit', 'basic fit',
    'planet fitness', 'palestra fit', 'i work out',
  ],
  restaurant: [
    "old wild west", 'jeff', 'poke house', 'roadhouse', 'taco bell',
    'five guys', 'nando', 'wagamama', 'spizzico', 'autogrill',
    'chef express', 'brek',
    "all'antico vinaio", 'antico vinaio',
    'american diner', '1950 american diner',
    'fratelli la bufala', 'la piadineria', 'dispensa emilia',
    'be bop', 'sushi daily', 'temakinho', 'unico',
    'alice pizza', 'pizza il mio saporé',
  ],
  real_estate: [
    'tecnocasa', 're/max', 'remax', 'coldwell banker', 'century 21',
    'engel & völkers', 'engel volkers', 'gabetti', 'grimaldi',
    'bluescape',
  ],
  cleaning: [
    'sodexo', 'iss facility', 'dussmann', 'servicemaster',
    'rentokil', 'initial',
  ],
  hairdresser: [
    'supercuts', 'great clips', 'jean louis david',
  ],
  barber: [],
  dentist: [
    'denti più', 'dentalmed', 'dentalpro', 'ortodonzia italiana',
    'odontoiatria italia', 'vitaldent',
  ],
}

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
