<script setup lang="ts">
useHead({ title: 'Impostazioni · AB Create CRM' })

const { data: settings, refresh } = await useFetch<Record<string, string>>('/api/settings')
const form = reactive<Record<string, string>>({})
watchEffect(() => { if (settings.value) Object.assign(form, settings.value) })

const saved = ref(false)
async function save() {
  await $fetch('/api/settings', { method: 'PUT', body: { ...form } })
  await refresh()
  saved.value = true
  setTimeout(() => (saved.value = false), 2000)
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="text-2xl font-bold text-slate-900">Impostazioni</h1>
    <p class="mt-1 text-sm text-slate-500">Sender, prezzi, portfolio e provider. Usati nei messaggi generati.</p>

    <div class="mt-6 space-y-6">
      <div class="card space-y-4">
        <h2 class="font-semibold text-slate-800">Mittente &amp; consegna</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <Field v-model="form.senderName" label="Nome mittente (firma)" />
          <Field v-model="form.deliveryWeeks" label="Settimane di consegna" type="number" />
        </div>
      </div>

      <div class="card space-y-4">
        <h2 class="font-semibold text-slate-800">Prezzi (€)</h2>
        <div class="grid gap-3 sm:grid-cols-3">
          <Field v-model="form.priceLanding" label="Landing" type="number" />
          <Field v-model="form.priceVetrina" label="Sito vetrina" type="number" />
          <Field v-model="form.priceGestionale" label="Gestionale" type="number" />
        </div>
      </div>

      <div class="card space-y-4">
        <h2 class="font-semibold text-slate-800">Portfolio</h2>
        <div class="grid gap-3 sm:grid-cols-3">
          <Field v-model="form.portfolioMain" label="Sito principale" />
          <Field v-model="form.portfolioSite1" label="Lavoro 1" />
          <Field v-model="form.portfolioSite2" label="Lavoro 2" />
        </div>
      </div>

      <div class="card space-y-4">
        <h2 class="font-semibold text-slate-800">Provider &amp; rate limiting</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <Field v-model="form.providerDelayMs" label="Delay tra chiamate (ms)" type="number" />
          <label class="flex items-end gap-2 text-sm text-slate-700">
            <input
              type="checkbox" class="mb-2 rounded"
              :checked="form.googlePlacesEnabled === 'true'"
              @change="form.googlePlacesEnabled = ($event.target as HTMLInputElement).checked ? 'true' : 'false'"
            />
            Google Places attivo (richiede la key in <code class="text-xs">.env</code>)
          </label>
        </div>
        <p class="text-xs text-slate-400">
          La chiave Google Places si imposta in <code>.env</code> (<code>GOOGLE_PLACES_API_KEY</code>), non da qui.
          Senza chiave la ricerca usa solo OpenStreetMap.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button class="btn-primary" @click="save">Salva impostazioni</button>
        <span v-if="saved" class="text-sm text-emerald-600">Salvato ✓</span>
      </div>
    </div>
  </div>
</template>
