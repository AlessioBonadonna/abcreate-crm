import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async () => {
  return prisma.messageTemplate.findMany({ orderBy: [{ segment: 'asc' }, { name: 'asc' }] })
})
