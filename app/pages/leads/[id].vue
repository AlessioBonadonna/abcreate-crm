<script setup lang="ts">
import { PIPELINE_STATUSES, CHANNELS } from '~~/shared/constants'
const route = useRoute()
const id = route.params.id as string
const { categoryLabel, priorityClass, statusClass, segmentLabel, fmtDate } = useFormat()

interface Activity { id: string; type: string; content: string | null; createdAt: string }
interface Lead {
  id: string; businessName: string; category: string; city: string; address: string | null
  website: string | null; email: string | null; phone: string | null; openingHours: string | null
  source: string; enrichedVia: string | null; opportunityScore: number; priority: string
  segment: string | null; detectedProblems: string[]; status: string; channel: string | null
  nextFollowUp: string | null; notes: string | null; analyzedAt: string | null
  hasHttps: boolean; httpStatus: number | null; loadError: string | null
  activities: Activity[]
}

const { data: lead, refresh } = await useFetch<Lead>(`/api/leads/${id}`)
const { data: msg, refresh: refreshMsg } = await useFetch<{
  messages: { whatsapp: string; email: { subject: string; body: string } }
}>(`/api/leads/${id}/messages`)

useHead({ title: () => `${lead.value?.businessName ?? 'Lead'} · AB Create CRM` })

const channel = ref<'whatsapp' | 'email'>('whatsapp')
const waText = ref('')
const emailSubject = ref('')
const emailBody = ref('')
watchEffect(() => {
  if (msg.value) {
    waText.value = msg.value.messages.whatsapp
    emailSubject.value = msg.value.messages.email.subject
    emailBody.value = msg.value.messages.email.body
  }
})

const notes = ref('')
const followUp = ref('')
watchEffect(() => {
  if (lead.value) {
    notes.value = lead.value.notes ?? ''
    followUp.value = lead.value.nextFollowUp ? lead.value.nextFollowUp.slice(0, 10) : ''
  }
})

async function patch(body: Record<string, unknown>) {
  await $fetch(`/api/leads/${id}`, { method: 'PATCH', body })
  await refresh()
}
async function saveCrm() {
  await patch({
    notes: notes.value,
    nextFollowUp: followUp.value ? new Date(followUp.value).toISOString() : null,
  })
}
async function logActivity(type: string, content?: string) {
  await $fetch(`/api/leads/${id}/activities`, { method: 'POST', body: { type, content } })
  await refresh()
}
async function copy(text: string, markSent = false) {
  await navigator.clipboard.writeText(text)
  if (markSent) await logActivity('messaggio_inviato', channel.value === 'whatsapp' ? 'WhatsApp' : 'Email')
}
async function removeLead() {
  if (!confirm(`Eliminare definitivamente "${lead.value?.businessName}"? L'azione non è reversibile.`)) return
  await $fetch(`/api/leads/${id}`, { method: 'DELETE' })
  await navigateTo('/leads')
}
</script>

<template>
  <div v-if="lead" class="mx-auto max-w-5xl">
    <div class="flex items-center justify-between">
      <NuxtLink to="/leads" class="text-sm text-slate-500 hover:underline">← Lista lead</NuxtLink>
      <button class="btn-ghost text-sm text-red-600 hover:bg-red-50" @click="removeLead">🗑 Elimina lead</button>
    </div>

    <div class="mt-2 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">{{ lead.businessName }}</h1>
        <p class="text-sm text-slate-500">
          {{ categoryLabel(lead.category) }} · {{ lead.city }}
          <span class="ml-2 badge" :class="priorityClass(lead.priority)">
            Score {{ lead.opportunityScore }}/10 · {{ lead.priority }}
          </span>
          <span class="ml-1 badge bg-slate-100 text-slate-600">{{ segmentLabel(lead.segment) }}</span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <select
          :value="lead.channel ?? ''" class="input w-36"
          @change="patch({ channel: ($event.target as HTMLSelectElement).value || null })"
        >
          <option value="">Canale…</option>
          <option v-for="c in CHANNELS" :key="c" :value="c">{{ c }}</option>
        </select>
        <select
          :value="lead.status" class="input w-44" :class="statusClass(lead.status)"
          @change="patch({ status: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="s in PIPELINE_STATUSES" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <!-- left: data + problems -->
      <div class="space-y-6 lg:col-span-1">
        <div class="card space-y-2 text-sm">
          <h2 class="font-semibold text-slate-800">Dati</h2>
          <Row label="Indirizzo" :value="lead.address" />
          <Row label="Telefono" :value="lead.phone" />
          <Row label="Email" :value="lead.email" />
          <Row label="Sito" :value="lead.website" link />
          <Row label="Orari" :value="lead.openingHours" />
          <Row label="Fonte" :value="lead.enrichedVia ? `${lead.source} + ${lead.enrichedVia}` : lead.source" />
        </div>

        <div class="card text-sm">
          <h2 class="font-semibold text-slate-800">Problemi rilevati</h2>
          <ul v-if="lead.detectedProblems.length" class="mt-2 space-y-1">
            <li v-for="p in lead.detectedProblems" :key="p" class="flex gap-2 text-slate-600">
              <span class="text-red-500">•</span>{{ p }}
            </li>
          </ul>
          <p v-else class="mt-2 text-slate-400">Nessun problema rilevato.</p>
          <p v-if="lead.analyzedAt" class="mt-3 text-xs text-slate-400">
            Sito analizzato il {{ fmtDate(lead.analyzedAt) }}
            <span v-if="lead.loadError"> · {{ lead.loadError }}</span>
          </p>
        </div>
      </div>

      <!-- middle: messages -->
      <div class="space-y-4 lg:col-span-2">
        <div class="card">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-semibold text-slate-800">Messaggio suggerito</h2>
            <div class="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
              <button class="rounded px-3 py-1" :class="channel === 'whatsapp' ? 'bg-white shadow-sm' : 'text-slate-500'" @click="channel = 'whatsapp'">WhatsApp</button>
              <button class="rounded px-3 py-1" :class="channel === 'email' ? 'bg-white shadow-sm' : 'text-slate-500'" @click="channel = 'email'">Email</button>
            </div>
          </div>

          <template v-if="channel === 'whatsapp'">
            <textarea v-model="waText" rows="10" class="input font-mono text-sm" />
            <div class="mt-3 flex gap-2">
              <button class="btn-primary" @click="copy(waText, true)">Copia & segna inviato</button>
              <button class="btn-secondary" @click="refreshMsg()">Rigenera</button>
            </div>
          </template>

          <template v-else>
            <input v-model="emailSubject" class="input mb-2" placeholder="Oggetto" />
            <textarea v-model="emailBody" rows="10" class="input font-mono text-sm" />
            <div class="mt-3 flex gap-2">
              <button class="btn-primary" @click="copy(`${emailSubject}\n\n${emailBody}`, true)">Copia & segna inviato</button>
              <button class="btn-secondary" @click="refreshMsg()">Rigenera</button>
            </div>
          </template>
          <p class="mt-2 text-xs text-slate-400">L'invio è sempre manuale — il messaggio viene solo generato e copiato.</p>
        </div>

        <!-- CRM: notes + follow-up -->
        <div class="card grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Note</label>
            <textarea v-model="notes" rows="3" class="input" />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">Prossimo follow-up</label>
            <input v-model="followUp" type="date" class="input" />
            <button class="btn-primary mt-3" @click="saveCrm">Salva</button>
          </div>
        </div>

        <!-- activity history -->
        <div class="card">
          <div class="mb-2 flex items-center justify-between">
            <h2 class="font-semibold text-slate-800">Storico attività</h2>
            <button class="btn-ghost text-xs" @click="logActivity('nota', notes || 'Nota')">+ Registra nota</button>
          </div>
          <ul v-if="lead.activities.length" class="space-y-2 text-sm">
            <li v-for="a in lead.activities" :key="a.id" class="flex gap-3 border-l-2 border-slate-200 pl-3">
              <span class="text-xs text-slate-400">{{ fmtDate(a.createdAt) }}</span>
              <span class="text-slate-600"><strong>{{ a.type }}</strong> {{ a.content }}</span>
            </li>
          </ul>
          <p v-else class="text-sm text-slate-400">Nessuna attività registrata.</p>
        </div>
      </div>
    </div>
  </div>
</template>
