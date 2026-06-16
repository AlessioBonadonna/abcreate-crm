<script setup lang="ts">
useHead({ title: 'Ricerca · AB Create CRM' })

interface Category { key: string; label: string }

const { data: categories } = await useFetch<Category[]>('/api/categories')

const citiesText = ref('')
const selectedCats = ref<string[]>([])
const analyzeSites = ref(true)
const excludeChains = ref(true)
const onlyWithoutWebsite = ref(false)
const onlyContactable = ref(true)
const usePlaces = ref(false)
const minScore = ref(0)

const running = ref(false)
const progress = ref(0)
const statusMsg = ref('')
const result = ref<{ totalFound: number; newLeads: number } | null>(null)
const error = ref('')

let pollTimer: ReturnType<typeof setInterval> | null = null

function toggleCat(key: string) {
  const i = selectedCats.value.indexOf(key)
  if (i === -1) selectedCats.value.push(key)
  else selectedCats.value.splice(i, 1)
}

function parseCities(): string[] {
  return citiesText.value
    .split(/[\n,;]+/)
    .map((c) => c.trim())
    .filter(Boolean)
}

async function start() {
  error.value = ''
  result.value = null
  const cities = parseCities()
  if (cities.length === 0) { error.value = 'Inserisci almeno una città.'; return }
  if (selectedCats.value.length === 0) { error.value = 'Seleziona almeno una categoria.'; return }

  running.value = true
  progress.value = 0
  statusMsg.value = 'Avvio…'

  try {
    const { runId } = await $fetch<{ runId: string }>('/api/search/start', {
      method: 'POST',
      body: {
        cities,
        categories: selectedCats.value,
        analyzeSites: analyzeSites.value,
        excludeChains: excludeChains.value,
        onlyWithoutWebsite: onlyWithoutWebsite.value,
        onlyContactable: onlyContactable.value,
        minScore: minScore.value,
        usePlaces: usePlaces.value,
      },
    })
    poll(runId)
  } catch (e: unknown) {
    running.value = false
    error.value = errMsg(e)
  }
}

function poll(runId: string) {
  pollTimer = setInterval(async () => {
    try {
      const run = await $fetch<{
        status: string; progress: number; message: string | null
        totalFound: number; newLeads: number
      }>(`/api/search/${runId}`)
      progress.value = run.progress
      statusMsg.value = run.message ?? ''
      if (run.status === 'done') {
        stopPoll()
        running.value = false
        result.value = { totalFound: run.totalFound, newLeads: run.newLeads }
      } else if (run.status === 'error') {
        stopPoll()
        running.value = false
        error.value = run.message ?? 'Errore durante la ricerca.'
      }
    } catch (e: unknown) {
      stopPoll(); running.value = false; error.value = errMsg(e)
    }
  }, 1500)
}

function stopPoll() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}
onBeforeUnmount(stopPoll)

function errMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'statusMessage' in e) return String((e as { statusMessage: unknown }).statusMessage)
  return e instanceof Error ? e.message : 'Errore'
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="text-2xl font-bold text-slate-900">Ricerca nuovi lead</h1>
    <p class="mt-1 text-sm text-slate-500">
      Cerca attività per città e categoria. I lead già presenti mantengono il loro stato.
    </p>

    <div class="card mt-6 space-y-5">
      <div>
        <label class="mb-1 block text-sm font-medium text-slate-700">Città (una per riga o separate da virgola)</label>
        <textarea v-model="citiesText" rows="3" class="input" placeholder="Livorno&#10;Pisa&#10;Pontedera" />
      </div>

      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700">Categorie</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="c in categories" :key="c.key" type="button"
            class="badge cursor-pointer ring-1 ring-inset"
            :class="selectedCats.includes(c.key)
              ? 'bg-indigo-600 text-white ring-indigo-600'
              : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'"
            @click="toggleCat(c.key)"
          >{{ c.label }}</button>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <input v-model="analyzeSites" type="checkbox" class="rounded" /> Analizza i siti web
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <input v-model="excludeChains" type="checkbox" class="rounded" /> Escludi catene
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <input v-model="onlyWithoutWebsite" type="checkbox" class="rounded" /> Solo senza sito
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <input v-model="onlyContactable" type="checkbox" class="rounded" /> Solo contattabili (telefono/email/sito)
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <input v-model="usePlaces" type="checkbox" class="rounded" /> Usa Google Places (se configurato)
        </label>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          Punteggio minimo
          <input v-model.number="minScore" type="number" min="0" max="10" class="input w-20" />
        </label>
      </div>

      <div class="flex items-center gap-3">
        <button class="btn-primary" :disabled="running" @click="start">
          {{ running ? 'Ricerca in corso…' : 'Avvia ricerca' }}
        </button>
        <span v-if="error" class="text-sm text-red-600">{{ error }}</span>
      </div>

      <div v-if="running" class="space-y-1">
        <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div class="h-full bg-indigo-600 transition-all" :style="{ width: progress + '%' }" />
        </div>
        <p class="text-xs text-slate-500">{{ progress }}% · {{ statusMsg }}</p>
      </div>

      <div v-if="result" class="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
        Ricerca completata: <strong>{{ result.newLeads }}</strong> nuovi lead
        ({{ result.totalFound }} trovati in totale, gli altri erano già presenti).
        <NuxtLink to="/leads" class="font-semibold underline">Vai alla lista →</NuxtLink>
      </div>
    </div>
  </div>
</template>
