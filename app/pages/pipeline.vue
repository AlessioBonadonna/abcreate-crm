<script setup lang="ts">
useHead({ title: 'Pipeline · AB Create CRM' })
const { categoryLabel, priorityClass, statusClass } = useFormat()

interface Card {
  id: string; businessName: string; category: string; city: string
  opportunityScore: number; priority: string; status: string
}
interface Pipeline { statuses: string[]; columns: Record<string, Card[]> }

const { data, refresh } = await useFetch<Pipeline>('/api/pipeline')
const dragId = ref<string | null>(null)
const overCol = ref<string | null>(null)

function onDragStart(id: string) { dragId.value = id }
function onDragEnd() { dragId.value = null; overCol.value = null }

async function onDrop(status: string) {
  const id = dragId.value
  overCol.value = null
  if (!id || !data.value) return

  // find current card/column
  let card: Card | undefined
  for (const col of Object.values(data.value.columns)) {
    const found = col.find((c) => c.id === id)
    if (found) { card = found; break }
  }
  if (!card || card.status === status) return

  // optimistic move
  data.value.columns[card.status] = data.value.columns[card.status]!.filter((c) => c.id !== id)
  card.status = status
  ;(data.value.columns[status] ??= []).unshift(card)

  try {
    await $fetch(`/api/leads/${id}`, { method: 'PATCH', body: { status } })
  } catch {
    refresh() // revert from server on failure
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-slate-900">Pipeline</h1>
      <NuxtLink to="/leads" class="btn-secondary">Vista lista</NuxtLink>
    </div>
    <p class="mt-1 text-sm text-slate-500">Trascina i lead tra le colonne per cambiarne lo stato.</p>

    <div class="mt-5 flex gap-3 overflow-x-auto pb-4">
      <div
        v-for="status in data?.statuses" :key="status"
        class="flex w-72 shrink-0 flex-col rounded-xl bg-slate-100/70 p-2"
        :class="overCol === status ? 'ring-2 ring-indigo-400' : ''"
        @dragover.prevent="overCol = status"
        @dragleave="overCol = null"
        @drop="onDrop(status)"
      >
        <div class="flex items-center justify-between px-2 py-1.5">
          <span class="badge" :class="statusClass(status)">{{ status }}</span>
          <span class="text-xs text-slate-400">{{ data?.columns[status]?.length ?? 0 }}</span>
        </div>

        <div class="space-y-2">
          <div
            v-for="card in data?.columns[status]" :key="card.id"
            draggable="true"
            class="cursor-grab rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200 active:cursor-grabbing"
            :class="dragId === card.id ? 'opacity-50' : ''"
            @dragstart="onDragStart(card.id)"
            @dragend="onDragEnd"
          >
            <NuxtLink :to="`/leads/${card.id}`" class="text-sm font-medium text-slate-800 hover:text-indigo-700">
              {{ card.businessName }}
            </NuxtLink>
            <div class="mt-1 flex items-center justify-between text-xs text-slate-400">
              <span>{{ categoryLabel(card.category) }} · {{ card.city }}</span>
              <span class="badge" :class="priorityClass(card.priority)">{{ card.opportunityScore }}</span>
            </div>
          </div>
          <p v-if="(data?.columns[status]?.length ?? 0) === 0" class="px-2 py-3 text-center text-xs text-slate-400">
            —
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
