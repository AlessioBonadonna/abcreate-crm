/**
 * Offline logic verification for milestones 1-3.
 * Runs the pure domain services (no DB, no live network) and asserts behaviour.
 *   npx tsx --tsconfig ./tsconfig.verify.json scripts/verify.ts
 */
import { scoreLead, toPriority } from '../server/services/scoring'
import { buildDedupKey, normalizeDomain, normalizePhone } from '../server/services/dedup'
import { generateMessages } from '../server/services/messaging'
import { analyzeWebsite } from '../server/services/analyzer'
import { buildOverpassQuery } from '../server/services/providers/osm'
import { toCsv, type ExportRow } from '../server/services/exporter'
import type { SiteAnalysis } from '../shared/types'

let pass = 0
let fail = 0
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.error(`  ✗ ${name}`) }
}

function analysis(over: Partial<SiteAnalysis>): SiteAnalysis {
  return {
    httpStatus: 200, hasHttps: true, pageTitle: 'x', metaDescription: 'x',
    hasWhatsapp: true, hasGoogleMaps: true, hasContactForm: true, hasContactPage: true,
    hasEmailOnSite: true, hasPhoneOnSite: true, hasSocialLinks: true, textLength: 1000,
    loadError: null, ...over,
  }
}

console.log('\n[1] Scoring')
{
  const noSite = scoreLead(false, null)
  check('no website → score 9 / HIGH / no_website', noSite.opportunityScore === 9 && noSite.priority === 'HIGH' && noSite.segment === 'no_website')

  const unreachable = scoreLead(true, analysis({ httpStatus: null, loadError: 'Timeout' }))
  check('unreachable → score 8 / HIGH', unreachable.opportunityScore === 8 && unreachable.priority === 'HIGH')

  const perfect = scoreLead(true, analysis({}))
  check('perfect reachable site → score 2 / LOW / decent_website', perfect.opportunityScore === 2 && perfect.priority === 'LOW' && perfect.segment === 'decent_website')

  // everything wrong but reachable (status 200): 2 +1+1+1+2+2+1+1+1+1 = 13 → cap 10
  const worst = scoreLead(true, analysis({
    hasHttps: false, pageTitle: null, metaDescription: null, hasWhatsapp: false,
    hasGoogleMaps: false, hasContactForm: false, hasContactPage: false,
    hasEmailOnSite: false, hasPhoneOnSite: false, textLength: 100,
  }))
  check('worst reachable site → capped at 10 / HIGH / weak_website', worst.opportunityScore === 10 && worst.priority === 'HIGH' && worst.segment === 'weak_website')

  // HTTP>=400 adds +2
  const http500 = scoreLead(true, analysis({ httpStatus: 500 }))
  check('HTTP 500 adds +2 over base (=4)', http500.opportunityScore === 4)

  check('priority boundaries 7/6/4/3', toPriority(7) === 'HIGH' && toPriority(6) === 'MEDIUM' && toPriority(4) === 'MEDIUM' && toPriority(3) === 'LOW')
}

console.log('\n[2] Dedup')
{
  check('domain normalization strips scheme/www/path', normalizeDomain('https://www.Foo.it/contatti?a=1') === 'foo.it')
  check('phone normalization strips +39 & punctuation', normalizePhone('+39 055 / 123-4567') === '0551234567')

  const a = buildDedupKey({ businessName: 'Bar Pippo', category: 'restaurant', city: 'Livorno', website: 'http://www.barpippo.it/' } as never)
  const b = buildDedupKey({ businessName: 'BAR PIPPO srl', category: 'restaurant', city: 'Livorno', website: 'https://barpippo.it/menu' } as never)
  check('same website → same dedup key', a === b && a === 'web:barpippo.it')

  const p1 = buildDedupKey({ businessName: 'Idraulico Rossi', category: 'plumber', city: 'Pisa', phone: '+39 050 12345' } as never)
  const p2 = buildDedupKey({ businessName: 'idraulico rossi', category: 'plumber', city: 'Pisa', phone: '050 12345' } as never)
  check('same name+city+phone (no site) → same key', p1 === p2)

  const adr = buildDedupKey({ businessName: 'X', category: 'plumber', city: 'Pisa', address: 'Via Roma 1' } as never)
  check('falls back to address key', adr.startsWith('na:'))
}

console.log('\n[3] Messaging (correct AB Create prices)')
{
  const settings = {
    senderName: 'AB Create', priceLanding: '400', priceVetrina: '700', priceGestionale: '800',
    deliveryWeeks: '2', portfolioMain: 'abcreate.it', portfolioSite1: 'spaziopresente.it', portfolioSite2: 'progettoservizilivorno.it',
  }
  const noSite = generateMessages({ businessName: 'Bar Pippo', category: 'restaurant', segment: 'no_website' }, { segment: 'no_website', mainProblem: 'non avete ancora un sito web' }, settings)
  check('no_website WhatsApp mentions 400€', noSite.whatsapp.includes('400€'))
  check('signs as AB Create', noSite.whatsapp.includes('AB Create'))
  check('cites portfolio', noSite.whatsapp.includes('spaziopresente.it') && noSite.whatsapp.includes('abcreate.it'))
  check('NO wrong legacy prices (350 / 39)', !noSite.whatsapp.includes('350') && !noSite.whatsapp.includes('39€'))
  check('email has a subject', noSite.email.subject.length > 0)

  const weak = generateMessages({ businessName: 'Officina Bianchi', category: 'mechanic', segment: 'weak_website' }, { segment: 'weak_website', mainProblem: 'manca un contatto WhatsApp' }, settings)
  check('weak_website email mentions 700€ (vetrina)', weak.email.body.includes('700€'))
}

console.log('\n[4] Overpass query builder')
{
  const areaQ = buildOverpassQuery(['craft=plumber'], { areaId: 3600041485 })
  check('area query uses searchArea + tag + out center', areaQ.includes('area(3600041485)->.searchArea') && areaQ.includes('["craft"="plumber"]') && areaQ.includes('out center'))
  const bboxQ = buildOverpassQuery(['shop=hairdresser'], { bbox: [43.5, 10.3, 43.6, 10.4] })
  check('bbox query embeds coordinates', bboxQ.includes('(43.5,10.3,43.6,10.4)') && bboxQ.includes('["shop"="hairdresser"]'))
}

async function analyzerTests() {
  console.log('\n[5] Analyzer (cheerio parsing, fetch stubbed)')
  const realFetch = globalThis.fetch
  const rich = `<!doctype html><html><head><title>Bar Pippo</title>
    <meta name="description" content="Il miglior bar"></head><body>
    <a href="https://wa.me/39055123">WhatsApp</a>
    <a href="mailto:info@barpippo.it">Email</a>
    <a href="tel:+39055123456">Chiama</a>
    <a href="https://instagram.com/barpippo">IG</a>
    <a href="/contatti">Contatti</a>
    <form><input name="nome"><textarea></textarea></form>
    <iframe src="https://www.google.com/maps/embed?pb=x"></iframe>
    <p>${'Lorem ipsum dolor sit amet. '.repeat(60)}</p>
    </body></html>`
  globalThis.fetch = async () => new Response(rich, { status: 200, headers: { 'content-type': 'text/html' } })
  const a = await analyzeWebsite('https://barpippo.it')
  check('detects title + meta', a.pageTitle === 'Bar Pippo' && a.metaDescription === 'Il miglior bar')
  check('detects whatsapp/form/maps/contact/email/phone/social', a.hasWhatsapp && a.hasContactForm && a.hasGoogleMaps && a.hasContactPage && a.hasEmailOnSite && a.hasPhoneOnSite && a.hasSocialLinks)
  check('text length > 800', a.textLength > 800)

  const bare = `<html><head></head><body><p>ciao</p></body></html>`
  globalThis.fetch = async () => new Response(bare, { status: 200, headers: { 'content-type': 'text/html' } })
  const b = await analyzeWebsite('https://vuoto.it')
  check('bare page → no signals, short text', !b.pageTitle && !b.hasWhatsapp && !b.hasContactForm && b.textLength < 800)

  globalThis.fetch = realFetch
}

await analyzerTests()

console.log('\n[6] Exporter (CSV)')
{
  const rows: ExportRow[] = [
    {
      businessName: 'Bar "Pippo", Livorno', category: 'restaurant', city: 'Livorno',
      address: 'Via Roma 1', phone: '055123', email: null, website: 'barpippo.it',
      opportunityScore: 9, priority: 'HIGH', segment: 'no_website', status: 'Da contattare',
      channel: null, source: 'openstreetmap', enrichedVia: null,
      nextFollowUp: new Date('2026-07-01T00:00:00Z'), notes: 'riga1\nriga2',
    },
  ]
  const csv = toCsv(rows)
  const lines = csv.split('\r\n')
  check('CSV has header + 1 row', lines.length === 2)
  check('CSV header starts with Attività', lines[0]!.startsWith('Attività,Categoria'))
  check('CSV escapes quotes/commas', lines[1]!.includes('"Bar ""Pippo"", Livorno"'))
  check('CSV escapes embedded newline in notes', lines[1]!.includes('"riga1\nriga2"'))
  check('CSV formats date as YYYY-MM-DD', lines[1]!.includes('2026-07-01'))
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} passed, ${fail} failed\n`)
process.exit(fail === 0 ? 0 : 1)
