import type { RawLead } from '~~/shared/types'
import { prisma } from '../utils/prisma'
import { buildDedupKey } from './dedup'
import { analyzeWebsite } from './analyzer'
import { scoreLead } from './scoring'
import { generateMessages } from './messaging'
import { getMessageSettings } from './settings'
import { getOsmProvider, getPlacesProvider } from './providers'
import { sleep } from './providers/types'

export interface SearchOptions {
  cities: string[]
  categories: string[]
  analyzeSites: boolean
  excludeChains: boolean
  onlyWithoutWebsite: boolean
  onlyContactable: boolean
  minScore: number
  usePlaces: boolean
}

/**
 * Runs a full discovery → dedup → persist → (optional) analyze/score pass.
 * Progress is written to the SearchRun row so the UI can poll it.
 * Runs detached from the HTTP request (fire-and-forget).
 */
export async function runSearch(runId: string, opts: SearchOptions): Promise<void> {
  const settings = await getMessageSettings()
  const templates = await prisma.messageTemplate.findMany()
  const delayMs = await getDelayMs()

  const setProgress = async (progress: number, message: string) => {
    await prisma.searchRun.update({
      where: { id: runId },
      data: { progress, message },
    })
  }

  try {
    // ---- 1. discovery (OSM, then optional Places) ----
    const osm = getOsmProvider()
    let raw: RawLead[] = await osm.discover({
      cities: opts.cities,
      categories: opts.categories,
      delayMs,
      onProgress: (pct, msg) => setProgress(Math.round(pct * 0.5), msg),
    })

    const places = opts.usePlaces ? getPlacesProvider() : null
    if (places?.isAvailable()) {
      const placesLeads = await places.discover({
        cities: opts.cities,
        categories: opts.categories,
        delayMs,
        onProgress: (pct, msg) => setProgress(50 + Math.round(pct * 0.2), msg),
      })
      raw = raw.concat(placesLeads)
    }

    // ---- 2. filter + dedup within the batch ----
    if (opts.excludeChains) raw = raw.filter((l) => !l.isChain)
    if (opts.onlyWithoutWebsite) raw = raw.filter((l) => !l.website)

    const byKey = new Map<string, RawLead>()
    for (const lead of raw) {
      const key = buildDedupKey(lead)
      const existing = byKey.get(key)
      // prefer the record with the most contact info
      if (!existing || contactScore(lead) > contactScore(existing)) {
        byKey.set(key, lead)
      }
    }
    const unique = [...byKey.entries()]

    // ---- 3. persist (skip leads already in DB, by dedupKey) ----
    await setProgress(72, `Salvataggio di ${unique.length} risultati…`)
    let newCount = 0
    let toProcess: { id: string; lead: RawLead }[] = []

    for (const [dedupKey, lead] of unique) {
      const existing = await prisma.lead.findUnique({ where: { dedupKey } })
      if (existing) continue // keep its CRM state untouched
      const created = await prisma.lead.create({
        data: {
          businessName: lead.businessName,
          category: lead.category,
          city: lead.city,
          address: lead.address ?? null,
          website: lead.website ?? null,
          email: lead.email ?? null,
          phone: lead.phone ?? null,
          openingHours: lead.openingHours ?? null,
          latitude: lead.latitude ?? null,
          longitude: lead.longitude ?? null,
          source: lead.source,
          isChain: lead.isChain ?? false,
          dedupKey,
        },
      })
      newCount++
      toProcess.push({ id: created.id, lead })
    }

    // ---- 4. (optional) enrich OSM leads missing phone/website via Places ----
    if (places?.isAvailable()) {
      let e = 0
      for (const { id, lead } of toProcess) {
        e++
        if (lead.source !== 'openstreetmap' || (lead.phone && lead.website)) continue
        await setProgress(72, `Arricchimento ${e}/${toProcess.length}…`)
        const found = await places.enrich(lead.businessName, lead.city)
        await sleep(delayMs)
        if (!found) continue
        const phone = lead.phone ?? found.phone ?? null
        const website = lead.website ?? found.website ?? null
        const address = lead.address ?? found.address ?? null
        if (phone === lead.phone && website === lead.website && address === lead.address) continue
        lead.phone = phone
        lead.website = website
        lead.address = address
        await prisma.lead.update({
          where: { id },
          data: { phone, website, address, enrichedVia: 'google_places' },
        })
      }
    }

    // ---- 4b. drop leads with no contact channel (after enrichment) ----
    if (opts.onlyContactable) {
      const reachable = ({ lead }: { lead: RawLead }) =>
        !!(lead.phone || lead.email || lead.website)
      const unreachable = toProcess.filter((t) => !reachable(t))
      if (unreachable.length > 0) {
        await setProgress(73, `Scarto ${unreachable.length} lead senza recapito…`)
        await prisma.lead.deleteMany({ where: { id: { in: unreachable.map((u) => u.id) } } })
        toProcess = toProcess.filter(reachable)
        newCount -= unreachable.length
      }
    }

    // ---- 5. analyze + score + generate message (new leads only) ----
    let i = 0
    for (const { id, lead } of toProcess) {
      i++
      if (opts.analyzeSites) {
        await setProgress(
          74 + Math.round((i / Math.max(toProcess.length, 1)) * 24),
          `Analisi siti ${i}/${toProcess.length}…`,
        )
      }
      const analysis = opts.analyzeSites && lead.website ? await analyzeWebsite(lead.website) : null
      const score = scoreLead(!!lead.website, analysis)
      const msgs = generateMessages(
        { businessName: lead.businessName, category: lead.category, segment: score.segment, mainProblem: score.mainProblem },
        score,
        settings,
        templates,
      )

      await prisma.lead.update({
        where: { id },
        data: {
          httpStatus: analysis?.httpStatus ?? null,
          hasHttps: analysis?.hasHttps ?? false,
          pageTitle: analysis?.pageTitle ?? null,
          metaDescription: analysis?.metaDescription ?? null,
          hasWhatsapp: analysis?.hasWhatsapp ?? false,
          hasGoogleMaps: analysis?.hasGoogleMaps ?? false,
          hasContactForm: analysis?.hasContactForm ?? false,
          hasContactPage: analysis?.hasContactPage ?? false,
          hasEmailOnSite: analysis?.hasEmailOnSite ?? false,
          hasPhoneOnSite: analysis?.hasPhoneOnSite ?? false,
          hasSocialLinks: analysis?.hasSocialLinks ?? false,
          textLength: analysis?.textLength ?? 0,
          loadError: analysis?.loadError ?? null,
          analyzedAt: opts.analyzeSites ? new Date() : null,
          opportunityScore: score.opportunityScore,
          priority: score.priority,
          detectedProblems: JSON.stringify(score.detectedProblems),
          segment: score.segment,
          suggestedMessage: msgs.whatsapp,
        },
      })
    }

    // ---- 6. optional min-score pruning of freshly added leads ----
    if (opts.minScore > 0) {
      await prisma.lead.deleteMany({
        where: {
          id: { in: toProcess.map((t) => t.id) },
          opportunityScore: { lt: opts.minScore },
        },
      })
    }

    const totalFound = unique.length
    await prisma.searchRun.update({
      where: { id: runId },
      data: { status: 'done', progress: 100, message: 'Completato', totalFound, newLeads: newCount },
    })
  } catch (err) {
    await prisma.searchRun.update({
      where: { id: runId },
      data: { status: 'error', message: err instanceof Error ? err.message : 'Errore sconosciuto' },
    })
  }
}

function contactScore(l: RawLead): number {
  return (l.website ? 2 : 0) + (l.phone ? 1 : 0) + (l.email ? 1 : 0)
}

async function getDelayMs(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: 'providerDelayMs' } })
  const n = row ? Number(row.value) : 1100
  return Number.isFinite(n) && n >= 0 ? n : 1100
}
