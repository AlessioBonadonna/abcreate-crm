import * as cheerio from 'cheerio'
import type { SiteAnalysis } from '~~/shared/types'

// Realistic browser UA — many sites/WAFs return 403 to non-browser agents.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const TIMEOUT_MS = 12000

function emptyAnalysis(loadError: string | null): SiteAnalysis {
  return {
    httpStatus: null,
    hasHttps: false,
    pageTitle: null,
    metaDescription: null,
    hasWhatsapp: false,
    hasGoogleMaps: false,
    hasContactForm: false,
    hasContactPage: false,
    hasEmailOnSite: false,
    hasPhoneOnSite: false,
    hasSocialLinks: false,
    textLength: 0,
    loadError,
  }
}

function normalizeUrl(raw: string): string {
  let u = raw.trim()
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  return u
}

const SOCIAL_HOSTS = [
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'youtube.com',
  'youtu.be',
]

/**
 * Fetch and analyze a website. Ported from v1 analyzer.py (BeautifulSoup → cheerio).
 * Never throws — failures are captured in `loadError`.
 */
export async function analyzeWebsite(website: string): Promise<SiteAnalysis> {
  const url = normalizeUrl(website)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      },
    })
  } catch (err) {
    clearTimeout(timer)
    const msg = err instanceof Error ? err.message : 'fetch failed'
    // distinguish common cases for nicer messaging
    if (/abort/i.test(msg)) return emptyAnalysis('Timeout')
    if (/certificate|ssl|tls/i.test(msg)) return emptyAnalysis('Errore SSL')
    return emptyAnalysis(msg)
  }
  clearTimeout(timer)

  const httpStatus = res.status
  const finalUrl = res.url || url
  const hasHttps = finalUrl.startsWith('https://')

  // Non-HTML or error pages: keep status but skip parsing details.
  let html = ''
  try {
    html = await res.text()
  } catch {
    return { ...emptyAnalysis('Corpo non leggibile'), httpStatus, hasHttps }
  }

  const $ = cheerio.load(html)
  const lowerHtml = html.toLowerCase()
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim()

  const pageTitle = ($('title').first().text() || '').trim() || null
  const metaDescription =
    ($('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '').trim() || null

  const hrefs: string[] = []
  $('a[href]').each((_, el) => {
    const h = $(el).attr('href')
    if (h) hrefs.push(h.toLowerCase())
  })

  const hasWhatsapp =
    hrefs.some((h) => h.includes('wa.me') || h.includes('api.whatsapp') || h.includes('whatsapp')) ||
    lowerHtml.includes('whatsapp')

  const hasGoogleMaps =
    lowerHtml.includes('google.com/maps') ||
    lowerHtml.includes('maps.google') ||
    lowerHtml.includes('maps.googleapis') ||
    lowerHtml.includes('maps.app.goo.gl') ||
    lowerHtml.includes('goo.gl/maps') ||
    $('iframe[src*="google.com/maps"]').length > 0

  const hasContactForm =
    $('form').filter((_, el) => $(el).find('input, textarea').length > 0).length > 0 ||
    hrefs.some((h) => h.startsWith('mailto:'))

  const hasContactPage =
    hrefs.some((h) => /contat|contact/.test(h)) ||
    /contatt(?:i|aci)/i.test(bodyText)

  const hasEmailOnSite =
    hrefs.some((h) => h.startsWith('mailto:')) ||
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(bodyText)

  const hasPhoneOnSite =
    hrefs.some((h) => h.startsWith('tel:')) ||
    /(?:\+39\s?)?(?:0\d{1,3}[\s.\/-]?\d{5,8}|3\d{2}[\s.\/-]?\d{6,7})/.test(bodyText)

  const hasSocialLinks = hrefs.some((h) => SOCIAL_HOSTS.some((host) => h.includes(host)))

  return {
    httpStatus,
    hasHttps,
    pageTitle,
    metaDescription,
    hasWhatsapp,
    hasGoogleMaps,
    hasContactForm,
    hasContactPage,
    hasEmailOnSite,
    hasPhoneOnSite,
    hasSocialLinks,
    textLength: bodyText.length,
    loadError: httpStatus >= 400 ? `HTTP ${httpStatus}` : null,
  }
}
