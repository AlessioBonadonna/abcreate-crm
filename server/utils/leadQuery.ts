import type { Prisma } from '@prisma/client'

export interface LeadFilter {
  q?: string
  city?: string
  category?: string
  status?: string
  priority?: string
  segment?: string
}

export function buildLeadWhere(f: LeadFilter): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {}
  if (f.city) where.city = f.city
  if (f.category) where.category = f.category
  if (f.status) where.status = f.status
  if (f.priority) where.priority = f.priority
  if (f.segment) where.segment = f.segment
  if (f.q) {
    where.OR = [
      { businessName: { contains: f.q } },
      { address: { contains: f.q } },
      { website: { contains: f.q } },
    ]
  }
  return where
}

export const LEAD_SORTS: Record<string, Prisma.LeadOrderByWithRelationInput> = {
  score_desc: { opportunityScore: 'desc' },
  score_asc: { opportunityScore: 'asc' },
  created_desc: { createdAt: 'desc' },
  created_asc: { createdAt: 'asc' },
  name_asc: { businessName: 'asc' },
  followup_asc: { nextFollowUp: 'asc' },
}
