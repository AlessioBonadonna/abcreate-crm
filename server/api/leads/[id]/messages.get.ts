import type { SiteAnalysis } from '~~/shared/types'
import { prisma } from '~~/server/utils/prisma'
import { scoreLead } from '~~/server/services/scoring'
import { generateMessages } from '~~/server/services/messaging'
import { getMessageSettings } from '~~/server/services/settings'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id mancante' })

  const lead = await prisma.lead.findUnique({ where: { id } })
  if (!lead) throw createError({ statusCode: 404, statusMessage: 'Lead non trovato' })

  const analysis: SiteAnalysis | null = lead.analyzedAt
    ? {
        httpStatus: lead.httpStatus,
        hasHttps: lead.hasHttps,
        pageTitle: lead.pageTitle,
        metaDescription: lead.metaDescription,
        hasWhatsapp: lead.hasWhatsapp,
        hasGoogleMaps: lead.hasGoogleMaps,
        hasContactForm: lead.hasContactForm,
        hasContactPage: lead.hasContactPage,
        hasEmailOnSite: lead.hasEmailOnSite,
        hasPhoneOnSite: lead.hasPhoneOnSite,
        hasSocialLinks: lead.hasSocialLinks,
        textLength: lead.textLength,
        loadError: lead.loadError,
      }
    : null

  const score = scoreLead(!!lead.website, analysis)
  const settings = await getMessageSettings()
  const messages = generateMessages(
    { businessName: lead.businessName, category: lead.category, segment: score.segment, mainProblem: score.mainProblem },
    score,
    settings,
  )

  return { messages, segment: score.segment, mainProblem: score.mainProblem }
})
