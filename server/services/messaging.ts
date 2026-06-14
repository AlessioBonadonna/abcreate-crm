import type { GeneratedMessages, ScoreResult } from '~~/shared/types'
import { CATEGORY_BY_KEY } from '~~/shared/constants'

export interface MessageSettings {
  senderName: string
  priceLanding: string
  priceVetrina: string
  priceGestionale: string
  deliveryWeeks: string
  portfolioMain: string
  portfolioSite1: string
  portfolioSite2: string
}

export interface MessageLead {
  businessName: string
  category: string
  segment: string | null
  mainProblem?: string
}

/** Per-category value hook — why a good web presence matters for that trade. */
const CATEGORY_HOOKS: Record<string, string> = {
  cleaning: 'chi cerca un’impresa di pulizie affidabile parte sempre da una ricerca online',
  mechanic: 'chi ha bisogno di un’officina di fiducia oggi la cerca prima su Google',
  body_shop: 'dopo un incidente la gente cerca una carrozzeria su Google e chiama la prima che convince',
  plumber: 'quando c’è un guasto si cerca un idraulico al volo su Google e si chiama il primo che ispira fiducia',
  electrician: 'chi ha bisogno di un elettricista lo cerca su Google e guarda chi sembra più professionale',
  hairdresser: 'oggi le clienti scelgono e prenotano il parrucchiere online e dai social',
  construction: 'chi deve ristrutturare valuta le imprese edili partendo dal loro sito e dai lavori mostrati',
  restaurant: 'chi cerca dove mangiare guarda prima Google, le foto e il menù online',
  gym: 'chi cerca una palestra confronta orari, prezzi e recensioni online prima di entrare',
  personal_trainer: 'i clienti cercano un personal trainer online e scelgono chi comunica meglio',
  real_estate: 'chi compra o vende casa parte dagli annunci e dal sito dell’agenzia',
  barber: 'i clienti scelgono e prenotano il barbiere online e dai social',
  dentist: 'chi cerca un dentista nuovo si informa prima online e valuta il sito',
}

function portfolioPhrase(s: MessageSettings): string {
  const sites = [s.portfolioSite1, s.portfolioSite2].filter(Boolean)
  if (sites.length === 2) return `${s.portfolioMain}, ${sites[0]} e ${sites[1]}`
  if (sites.length === 1) return `${s.portfolioMain} e ${sites[0]}`
  return s.portfolioMain
}

/**
 * Generate value-first outreach in two channels. Ported from v1 generate_message,
 * with corrected AB Create pricing (Landing €400 · Vetrina €700 · Gestionale €800+)
 * and a soft, problem-first opening (price arrives last).
 */
export function generateMessages(
  lead: MessageLead,
  score: Pick<ScoreResult, 'segment' | 'mainProblem'>,
  settings: MessageSettings,
): GeneratedMessages {
  const cat = CATEGORY_BY_KEY[lead.category]
  const catLabel = cat?.label ?? 'attività'
  const hook = CATEGORY_HOOKS[lead.category] ?? 'oggi i clienti cercano i servizi locali prima di tutto online'
  const portfolio = portfolioPhrase(settings)
  const segment = score.segment ?? lead.segment ?? 'weak_website'
  const problem = score.mainProblem ?? lead.mainProblem ?? 'ci sono margini di miglioramento sul sito'
  const weeks = settings.deliveryWeeks

  // --- soft price line, depends on segment ---
  const priceLine =
    segment === 'no_website'
      ? `Una landing fatta bene parte da ${settings.priceLanding}€ e si fa in circa ${weeks} settimane.`
      : `Un restyling o un sito nuovo parte da ${settings.priceVetrina}€, pronto in circa ${weeks} settimane.`

  // --- problem line ---
  const problemLine =
    segment === 'no_website'
      ? `Ho cercato ${lead.businessName} e non ho trovato un sito: vi cercano e trovano i concorrenti.`
      : `Ho dato un’occhiata al vostro sito e ho notato una cosa: ${problem}.`

  // ---------- WhatsApp / DM (short, informal) ----------
  const whatsapp = [
    `Ciao ${lead.businessName}, ${hook}.`,
    problemLine,
    `Mi occupo di siti e mini-gestionali per attività come la vostra — esempi: ${portfolio}.`,
    priceLine,
    `Se vi va vi mando due idee su misura, senza impegno.`,
    `— ${settings.senderName}`,
  ].join('\n\n')

  // ---------- Email (longer, formal "Lei") ----------
  const subject =
    segment === 'no_website'
      ? `Un sito per ${lead.businessName} (proposta veloce)`
      : `Qualche miglioria per il sito di ${lead.businessName}`

  const emailProblem =
    segment === 'no_website'
      ? `ho provato a cercare ${lead.businessName} online e non ho trovato un sito. Per un’attività come la vostra è un peccato: ${hook}.`
      : `ho dato un’occhiata al sito di ${lead.businessName} e ho notato che ${problem}. Sono dettagli che, senza accorgersene, fanno perdere contatti.`

  const emailPrice =
    segment === 'no_website'
      ? `Una landing parte da ${settings.priceLanding}€, un sito vetrina da ${settings.priceVetrina}€ e un mini-gestionale su misura da ${settings.priceGestionale}€. Consegna in circa ${weeks} settimane.`
      : `Posso proporvi un restyling o un sito nuovo (da ${settings.priceVetrina}€), oppure un mini-gestionale su misura (da ${settings.priceGestionale}€). Consegna in circa ${weeks} settimane.`

  const body = [
    `Salve,`,
    emailProblem,
    `Sviluppo siti e piccoli gestionali per attività locali: cose semplici, veloci e curate. Qualche lavoro: ${portfolio}.`,
    emailPrice,
    `Se le fa piacere preparo due proposte concrete senza impegno — mi basta un suo cenno.`,
    `Un saluto,\n${settings.senderName}`,
  ].join('\n\n')

  return { whatsapp, email: { subject, body } }
}
