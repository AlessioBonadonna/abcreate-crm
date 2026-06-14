import { CATEGORIES } from '~~/shared/constants'

export default defineEventHandler(() => {
  return CATEGORIES.map((c) => ({ key: c.key, label: c.label }))
})
