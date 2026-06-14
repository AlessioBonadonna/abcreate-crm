<script setup lang="ts">
useHead({ title: 'Lista lead · AB Create CRM' })
const { categoryLabel, priorityClass, statusClass } = useFormat()

interface Lead {
  id: string; businessName: string; category: string; city: string
  phone: string | null; website: string | null; opportunityScore: number
  priority: string; status: string; segment: string | null
}
interface Facets {
  cities: string[]
  categories: { key: string; label: string }[]
  statuses: string[]; priorities: string[]; segments: string[]
}

const { data: facets } = await useFetch<Facets>('/api/leads/facets')

const route = useRoute()
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const filters = reactive({
  q: str(route.query.q), city: str(route.query.city), category: str(route.query.category),
  status: str(route.query.status), priority: str(route.query.priority), segment: str(route.query.segment),
  sort: 'score_desc', page: 1, pageSize: 25,
})

function exportUrl(format: 'csv' | 'xlsx') {
  const p = new URLSearchParams()
  p.set('format', format)
  for (const k of ['q', 'city', 'category', 'status', 'priority', 'segment', 'sort'] as const) {
    if (filters[k]) p.set(k, filters[k])
  }
  return `/api/export?${p.toString()}`
}

const query = computed(() => ({ ...filters }))
const { data, pending, refresh } = await useFetch<{
  total: number; page: number; pages: number; leads: Lead[]
}>('/api/leads', { query })

watch(
  () => [filters.q, filters.city, filters.category, filters.status, filters.priority, filters.segment, filters.sort],
  () => { filters.page = 1 },
)

async function setStatus(lead: Lead, status: string) {
  await $fetch(`/api/leads/${lead.id}`, { method: 'PATCH', body: { status } })
  refresh()
}
async function copyMessage(lead: Lead) {
  const res = await $fetch<{ messages: { whatsapp: string } }>(`/api/leads/${lead.id}/messages`)
  await navigator.clipboard.writeText(res.messages.whatsapp)
}
async function remove(lead: Lead) {
  if (!confirm(`Eliminare definitivamente "${lead.businessName}"?`)) return
  await $fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
  refresh()
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-slate-900">Lista lead</h1>
      <div class="flex gap-2">
        <a :href="exportUrl('xlsx')" class="btn-secondary">Export XLSX</a>
        <a :href="exportUrl('csv')" class="btn-secondary">CSV</a>
        <NuxtLink to="/ricerca" class="btn-primary">+ Nuova ricerca</NuxtLink>
      </div>
    </div>

    <!-- filters -->
    <div class="card mt-5 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
      <input v-model="filters.q" class="input md:col-span-2 lg:col-span-2" placeholder="Cerca nome / sito…" />
      <select v-model="filters.city" class="input">
        <option value="">Tutte le città</option>
        <option v-for="c in facets?.cities" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="filters.category" class="input">
        <option value="">Tutte le categorie</option>
        <option v-for="c in facets?.categories" :key="c.key" :value="c.key">{{ c.label }}</option>
      </select>
      <select v-model="filters.status" class="input">
        <option value="">Tutti gli stati</option>
        <option v-for="s in facets?.statuses" :key="s" :value="s">{{ s }}</option>
      </select>
      <select v-model="filters.priority" class="input">
        <option value="">Tutte le priorità</option>
        <option v-for="p in facets?.priorities" :key="p" :value="p">{{ p }}</option>
      </select>
    </div>

    <div class="mt-3 flex items-center justify-between text-sm text-slate-500">
      <span>{{ data?.total ?? 0 }} lead</span>
      <label class="flex items-center gap-2">
        Ordina
        <select v-model="filters.sort" class="input w-44">
          <option value="score_desc">Punteggio ↓</option>
          <option value="score_asc">Punteggio ↑</option>
          <option value="created_desc">Più recenti</option>
          <option value="name_asc">Nome A-Z</option>
          <option value="followup_asc">Follow-up vicino</option>
        </select>
      </label>
    </div>

    <!-- table -->
    <div class="card mt-3 overflow-x-auto p-0">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3">Attività</th>
            <th class="px-4 py-3">Categoria</th>
            <th class="px-4 py-3">Città</th>
            <th class="px-4 py-3">Score</th>
            <th class="px-4 py-3">Stato</th>
            <th class="px-4 py-3 text-right">Azioni</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="lead in data?.leads" :key="lead.id" class="hover:bg-slate-50">
            <td class="px-4 py-3">
              <NuxtLink :to="`/leads/${lead.id}`" class="font-medium text-indigo-700 hover:underline">
                {{ lead.businessName }}
              </NuxtLink>
              <div class="text-xs text-slate-400">
                {{ lead.website || 'nessun sito' }}<span v-if="lead.phone"> · {{ lead.phone }}</span>
              </div>
            </td>
            <td class="px-4 py-3 text-slate-600">{{ categoryLabel(lead.category) }}</td>
            <td class="px-4 py-3 text-slate-600">{{ lead.city }}</td>
            <td class="px-4 py-3">
              <span class="badge" :class="priorityClass(lead.priority)">{{ lead.opportunityScore }}/10</span>
            </td>
            <td class="px-4 py-3">
              <select
                :value="lead.status" class="input !py-1 text-xs"
                :class="statusClass(lead.status)"
                @change="setStatus(lead, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="s in facets?.statuses" :key="s" :value="s">{{ s }}</option>
              </select>
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button class="btn-ghost text-xs" title="Copia messaggio WhatsApp" @click="copyMessage(lead)">
                Copia msg
              </button>
              <button class="btn-ghost text-xs text-red-600 hover:bg-red-50" title="Elimina lead" @click="remove(lead)">
                🗑
              </button>
            </td>
          </tr>
          <tr v-if="!pending && (data?.leads?.length ?? 0) === 0">
            <td colspan="6" class="px-4 py-10 text-center text-slate-400">
              Nessun lead. <NuxtLink to="/ricerca" class="text-indigo-600 underline">Avvia una ricerca →</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- pagination -->
    <div v-if="(data?.pages ?? 1) > 1" class="mt-4 flex items-center justify-center gap-2">
      <button class="btn-secondary" :disabled="filters.page <= 1" @click="filters.page--">←</button>
      <span class="text-sm text-slate-500">Pagina {{ data?.page }} di {{ data?.pages }}</span>
      <button class="btn-secondary" :disabled="filters.page >= (data?.pages ?? 1)" @click="filters.page++">→</button>
    </div>
  </div>
</template>
