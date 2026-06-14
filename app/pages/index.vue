<script setup lang="ts">
useHead({ title: 'Dashboard · AB Create CRM' })
const { statusClass } = useFormat()

interface Dashboard {
  total: number
  byStatus: Record<string, number>
  dueToday: number
  highPriorityToContact: number
  clienti: number
  conversionRate: number
}
const { data } = await useFetch<Dashboard>('/api/dashboard')
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-slate-900">Dashboard</h1>
      <NuxtLink to="/ricerca" class="btn-primary">+ Nuova ricerca</NuxtLink>
    </div>

    <!-- KPI cards -->
    <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="card">
        <div class="text-3xl font-bold text-slate-900">{{ data?.total ?? 0 }}</div>
        <div class="text-sm text-slate-500">Lead totali</div>
      </div>
      <div class="card">
        <div class="text-3xl font-bold" :class="(data?.dueToday ?? 0) > 0 ? 'text-amber-600' : 'text-slate-900'">
          {{ data?.dueToday ?? 0 }}
        </div>
        <div class="text-sm text-slate-500">Follow-up in scadenza oggi</div>
      </div>
      <div class="card">
        <div class="text-3xl font-bold text-red-600">{{ data?.highPriorityToContact ?? 0 }}</div>
        <div class="text-sm text-slate-500">HIGH da contattare</div>
      </div>
      <div class="card">
        <div class="text-3xl font-bold text-emerald-600">{{ data?.conversionRate ?? 0 }}%</div>
        <div class="text-sm text-slate-500">Tasso di conversione ({{ data?.clienti ?? 0 }} clienti)</div>
      </div>
    </div>

    <!-- pipeline counts -->
    <h2 class="mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Pipeline</h2>
    <div class="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
      <NuxtLink
        v-for="(count, status) in data?.byStatus" :key="status"
        :to="`/leads?status=${encodeURIComponent(status)}`"
        class="card text-center transition hover:shadow-md"
      >
        <div class="text-2xl font-bold text-slate-900">{{ count }}</div>
        <span class="badge mt-1" :class="statusClass(String(status))">{{ status }}</span>
      </NuxtLink>
    </div>

    <div class="mt-8 flex flex-wrap gap-3">
      <NuxtLink to="/leads" class="btn-secondary">☰ Lista lead</NuxtLink>
      <NuxtLink to="/pipeline" class="btn-secondary">▦ Pipeline Kanban</NuxtLink>
      <NuxtLink to="/templates" class="btn-secondary">✎ Template</NuxtLink>
      <NuxtLink to="/impostazioni" class="btn-secondary">⚙ Impostazioni</NuxtLink>
    </div>
  </div>
</template>
