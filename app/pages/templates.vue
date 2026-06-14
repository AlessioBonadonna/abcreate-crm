<script setup lang="ts">
useHead({ title: 'Template · AB Create CRM' })

interface Template {
  id: string; name: string; segment: string | null; channel: string | null
  subject: string | null; body: string
}

const { data: templates, refresh } = await useFetch<Template[]>('/api/templates')

const blank = (): Template => ({ id: '', name: '', segment: 'no_website', channel: 'WhatsApp', subject: '', body: '' })
const draft = ref<Template>(blank())
const isNew = computed(() => draft.value.id === '')

const PLACEHOLDER_HELP =
  '{{business}} {{sender}} {{problem}} {{portfolio}} {{priceLanding}} {{priceVetrina}} {{deliveryWeeks}}'

const SEGMENTS = [
  { v: 'no_website', l: 'Senza sito' },
  { v: 'weak_website', l: 'Sito debole' },
  { v: 'decent_website', l: 'Sito discreto' },
]
const CHANNELS = ['WhatsApp', 'Email']

function edit(t: Template) { draft.value = { ...t } }
function newTemplate() { draft.value = blank() }

async function save() {
  const body = {
    name: draft.value.name,
    segment: draft.value.segment || null,
    channel: draft.value.channel || null,
    subject: draft.value.subject || null,
    body: draft.value.body,
  }
  if (isNew.value) {
    await $fetch('/api/templates', { method: 'POST', body })
  } else {
    await $fetch(`/api/templates/${draft.value.id}`, { method: 'PUT', body })
  }
  await refresh()
  newTemplate()
}
async function remove(id: string) {
  await $fetch(`/api/templates/${id}`, { method: 'DELETE' })
  if (draft.value.id === id) newTemplate()
  await refresh()
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-slate-900">Template messaggi</h1>
    <p class="mt-1 text-sm text-slate-500">
      Modelli riutilizzabili per segmento e canale. Placeholder disponibili:
      <code class="text-xs">{{ PLACEHOLDER_HELP }}</code>
    </p>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <!-- list -->
      <div class="space-y-2 lg:col-span-1">
        <button class="btn-primary w-full" @click="newTemplate">+ Nuovo template</button>
        <div
          v-for="t in templates" :key="t.id"
          class="card cursor-pointer p-3 transition hover:shadow-md"
          :class="draft.id === t.id ? 'ring-2 ring-indigo-400' : ''"
          @click="edit(t)"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-slate-800">{{ t.name }}</span>
            <button class="text-xs text-red-500 hover:underline" @click.stop="remove(t.id)">elimina</button>
          </div>
          <div class="mt-1 flex gap-1">
            <span v-if="t.channel" class="badge bg-slate-100 text-slate-600">{{ t.channel }}</span>
            <span v-if="t.segment" class="badge bg-indigo-50 text-indigo-700">{{ t.segment }}</span>
          </div>
        </div>
        <p v-if="(templates?.length ?? 0) === 0" class="text-sm text-slate-400">Nessun template.</p>
      </div>

      <!-- editor -->
      <div class="card space-y-4 lg:col-span-2">
        <h2 class="font-semibold text-slate-800">{{ isNew ? 'Nuovo template' : 'Modifica template' }}</h2>
        <div class="grid gap-3 sm:grid-cols-3">
          <label class="text-sm sm:col-span-3">
            <span class="mb-1 block font-medium text-slate-700">Nome</span>
            <input v-model="draft.name" class="input" placeholder="es. WhatsApp — Senza sito" />
          </label>
          <label class="text-sm">
            <span class="mb-1 block font-medium text-slate-700">Canale</span>
            <select v-model="draft.channel" class="input">
              <option v-for="c in CHANNELS" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <label class="text-sm sm:col-span-2">
            <span class="mb-1 block font-medium text-slate-700">Segmento</span>
            <select v-model="draft.segment" class="input">
              <option v-for="s in SEGMENTS" :key="s.v" :value="s.v">{{ s.l }}</option>
            </select>
          </label>
        </div>
        <label v-if="draft.channel === 'Email'" class="block text-sm">
          <span class="mb-1 block font-medium text-slate-700">Oggetto (email)</span>
          <input v-model="draft.subject" class="input" />
        </label>
        <label class="block text-sm">
          <span class="mb-1 block font-medium text-slate-700">Corpo</span>
          <textarea v-model="draft.body" rows="10" class="input font-mono text-sm" />
        </label>
        <div class="flex gap-2">
          <button class="btn-primary" :disabled="!draft.name || !draft.body" @click="save">
            {{ isNew ? 'Crea' : 'Salva' }}
          </button>
          <button class="btn-ghost" @click="newTemplate">Annulla</button>
        </div>
      </div>
    </div>
  </div>
</template>
