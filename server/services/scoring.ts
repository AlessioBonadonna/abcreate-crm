import type { Priority, ScoreResult, SiteAnalysis } from '~~/shared/types'

/**
 * Opportunity scoring (0-10). Ported verbatim from v1 scoring.py.
 *
 *   No website .............. 9
 *   Website unreachable ..... 8
 *   Website present (base) .. 2, then additive signals (capped at 10):
 *     +2 HTTP >= 400
 *     +1 no HTTPS
 *     +1 title missing
 *     +1 meta description missing
 *     +2 no WhatsApp
 *     +2 no contact form
 *     +1 no Google Maps embed
 *     +1 no contact page
 *     +1 text < 800 chars
 *     +1 no email/phone on site
 */
export function scoreLead(
  hasWebsite: boolean,
  analysis: SiteAnalysis | null,
): ScoreResult {
  // 1) No website at all
  if (!hasWebsite) {
    return {
      opportunityScore: 9,
      priority: toPriority(9),
      detectedProblems: ['Nessun sito web'],
      segment: 'no_website',
      mainProblem: 'non avete ancora un sito web',
    }
  }

  // 2) Website present but unreachable (timeout / DNS / SSL / no status)
  const unreachable =
    !analysis || (analysis.loadError != null && analysis.httpStatus == null)
  if (unreachable) {
    return {
      opportunityScore: 8,
      priority: toPriority(8),
      detectedProblems: ['Sito non raggiungibile'],
      segment: 'no_website',
      mainProblem: 'il vostro sito non risulta raggiungibile',
    }
  }

  // 2b) Website up but it blocked our crawler (anti-bot / WAF): we can't judge it.
  //     Don't invent problems or a false 10/10 — flag for manual review.
  const blockedStatuses = [401, 403, 406, 429]
  if (analysis && analysis.httpStatus != null && blockedStatuses.includes(analysis.httpStatus)) {
    return {
      opportunityScore: 0,
      priority: 'LOW',
      detectedProblems: [
        `Analisi automatica bloccata dal sito (HTTP ${analysis.httpStatus}) — controlla a mano`,
      ],
      segment: 'blocked',
      mainProblem: '',
    }
  }

  // 3) Website present & reachable — additive
  const a = analysis as SiteAnalysis
  let score = 2
  const problems: string[] = []

  if (a.httpStatus != null && a.httpStatus >= 400) {
    score += 2
    problems.push(`Il sito risponde con un errore (HTTP ${a.httpStatus})`)
  }
  if (!a.hasHttps) {
    score += 1
    problems.push('Manca HTTPS (sito non sicuro)')
  }
  if (!a.pageTitle || a.pageTitle.trim().length < 5) {
    score += 1
    problems.push('Titolo pagina assente o generico')
  }
  if (!a.metaDescription) {
    score += 1
    problems.push('Manca la meta description')
  }
  if (!a.hasWhatsapp) {
    score += 2
    problems.push('Nessun contatto WhatsApp')
  }
  if (!a.hasContactForm) {
    score += 2
    problems.push('Nessun form di contatto')
  }
  if (!a.hasGoogleMaps) {
    score += 1
    problems.push('Nessuna mappa Google')
  }
  if (!a.hasContactPage) {
    score += 1
    problems.push('Nessuna pagina contatti')
  }
  if (a.textLength < 800) {
    score += 1
    problems.push('Poco contenuto testuale')
  }
  if (!a.hasEmailOnSite && !a.hasPhoneOnSite) {
    score += 1
    problems.push('Nessun recapito (email/telefono) sul sito')
  }

  score = Math.min(score, 10)

  return {
    opportunityScore: score,
    priority: toPriority(score),
    detectedProblems: problems,
    segment: score >= 4 ? 'weak_website' : 'decent_website',
    mainProblem: mainProblemPhrase(problems),
  }
}

/**
 * Scoring for PARTNER targets (web agencies, studios, accountants).
 * Logic is inverted vs. scoreLead: a real, reachable, well-built site is a
 * GOOD signal (a structured studio that likely outsources small jobs).
 * `detectedProblems` is repurposed to hold positive signals for the UI.
 */
export function scorePartnerLead(
  hasWebsite: boolean,
  analysis: SiteAnalysis | null,
): ScoreResult {
  if (!hasWebsite) {
    return {
      opportunityScore: 3,
      priority: toPriority(3),
      detectedProblems: ['Nessun sito — studio poco strutturato o dato mancante'],
      segment: 'partner_weak',
      mainProblem: '',
    }
  }
  const unreachable = !analysis || (analysis.loadError != null && analysis.httpStatus == null)
  if (unreachable) {
    return {
      opportunityScore: 4,
      priority: toPriority(4),
      detectedProblems: ['Sito non raggiungibile durante l’analisi — verifica a mano'],
      segment: 'partner',
      mainProblem: '',
    }
  }
  const a = analysis as SiteAnalysis
  const signals: string[] = ['Agenzia/studio reale con sito attivo']
  let score = 6
  if (a.hasHttps) { score += 1; signals.push('Sito sicuro (HTTPS)') }
  if (a.hasSocialLinks) { score += 1; signals.push('Presenza social attiva') }
  if (a.textLength >= 800) { score += 1; signals.push('Sito strutturato (buon contenuto)') }
  if (a.hasContactForm || a.hasEmailOnSite) { score += 1; signals.push('Contatto diretto disponibile') }
  score = Math.min(score, 10)
  return {
    opportunityScore: score,
    priority: toPriority(score),
    detectedProblems: signals,
    segment: 'partner',
    mainProblem: '',
  }
}

export function toPriority(score: number): Priority {
  if (score >= 7) return 'HIGH'
  if (score >= 4) return 'MEDIUM'
  return 'LOW'
}

/** Pick the most compelling problem to open a message with (v1 _get_main_problem_phrase). */
function mainProblemPhrase(problems: string[]): string {
  // priority order of "hooks" — most damaging first
  const order = [
    ['errore', 'il vostro sito al momento mostra un errore e non si apre ai clienti'],
    ['Nessun form di contatto', 'è difficile per un cliente contattarvi dal sito'],
    ['Nessun contatto WhatsApp', 'manca un contatto WhatsApp, oggi il canale più usato'],
    ['Manca HTTPS', 'il sito non è sicuro (manca HTTPS) e Google lo penalizza'],
    ['Poco contenuto', 'il sito ha pochissimo contenuto'],
    ['Manca la meta', 'il sito è poco ottimizzato per Google'],
    ['Nessuna pagina contatti', 'manca una pagina contatti chiara'],
  ] as const

  for (const [needle, phrase] of order) {
    if (problems.some((p) => p.includes(needle))) return phrase
  }
  return problems[0] ? problems[0].toLowerCase() : 'ci sono dei margini di miglioramento'
}
