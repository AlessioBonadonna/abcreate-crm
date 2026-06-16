import { prisma } from '~~/server/utils/prisma'
import { analyzeWebsite } from '~~/server/services/analyzer'
import { scoreLead } from '~~/server/services/scoring'
import { generateMessages } from '~~/server/services/messaging'
import { getMessageSettings } from '~~/server/services/settings'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id mancante' })

  const lead = await prisma.lead.findUnique({ where: { id } })
  if (!lead) throw createError({ statusCode: 404, statusMessage: 'Lead non trovato' })

  const analysis = lead.website ? await analyzeWebsite(lead.website) : null
  const score = scoreLead(!!lead.website, analysis)
  const settings = await getMessageSettings()
  const templates = await prisma.messageTemplate.findMany()
  const msgs = generateMessages(
    { businessName: lead.businessName, category: lead.category, segment: score.segment, mainProblem: score.mainProblem },
    score,
    settings,
    templates,
  )

  const updated = await prisma.lead.update({
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
      analyzedAt: lead.website ? new Date() : null,
      opportunityScore: score.opportunityScore,
      priority: score.priority,
      detectedProblems: JSON.stringify(score.detectedProblems),
      segment: score.segment,
      suggestedMessage: msgs.whatsapp,
    },
  })

  return { ...updated, detectedProblems: score.detectedProblems }
})
