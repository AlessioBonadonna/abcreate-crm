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
  if (!a.pageTitle) {
    score += 1
    problems.push('Manca il titolo della pagina')
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

export function toPriority(score: number): Priority {
  if (score >= 7) return 'HIGH'
  if (score >= 4) return 'MEDIUM'
  return 'LOW'
}

/** Pick the most compelling problem to open a message with (v1 _get_main_problem_phrase). */
function mainProblemPhrase(problems: string[]): string {
  // priority order of "hooks"
  const order = [
    ['Nessun form di contatto', 'è difficile per un cliente contattarvi dal sito'],
    ['Nessun contatto WhatsApp', 'manca un contatto WhatsApp, oggi il canale più usato'],
    ['Manca HTTPS', 'il sito non è sicuro (manca HTTPS) e Google lo penalizza'],
    ['errore', 'il sito mostra un errore a chi lo visita'],
    ['Poco contenuto', 'il sito ha pochissimo contenuto'],
    ['Manca la meta', 'il sito è poco ottimizzato per Google'],
    ['Nessuna pagina contatti', 'manca una pagina contatti chiara'],
  ] as const

  for (const [needle, phrase] of order) {
    if (problems.some((p) => p.includes(needle))) return phrase
  }
  return problems[0] ? problems[0].toLowerCase() : 'ci sono dei margini di miglioramento'
}
