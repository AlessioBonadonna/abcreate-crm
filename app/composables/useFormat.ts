import { CATEGORY_BY_KEY } from '~~/shared/constants'

export function useFormat() {
  const categoryLabel = (key: string) => CATEGORY_BY_KEY[key]?.label ?? key

  const priorityClass = (p: string) =>
    p === 'HIGH'
      ? 'bg-red-100 text-red-700'
      : p === 'MEDIUM'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-600'

  const statusClass = (s: string) => {
    switch (s) {
      case 'Cliente': return 'bg-emerald-100 text-emerald-700'
      case 'In trattativa': return 'bg-violet-100 text-violet-700'
      case 'Risposto': return 'bg-sky-100 text-sky-700'
      case 'Follow-up': return 'bg-amber-100 text-amber-700'
      case 'Contattato': return 'bg-indigo-100 text-indigo-700'
      case 'Scartato': return 'bg-slate-200 text-slate-500'
      default: return 'bg-slate-100 text-slate-600' // Da contattare
    }
  }

  const segmentLabel = (s: string | null | undefined) => {
    switch (s) {
      case 'no_website': return 'Senza sito'
      case 'weak_website': return 'Sito debole'
      case 'decent_website': return 'Sito discreto'
      default: return '—'
    }
  }

  const fmtDate = (d: string | Date | null | undefined) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return { categoryLabel, priorityClass, statusClass, segmentLabel, fmtDate }
}
