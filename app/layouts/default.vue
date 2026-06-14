<script setup lang="ts">
const links = [
  { to: '/', label: 'Dashboard', icon: '◧' },
  { to: '/ricerca', label: 'Ricerca', icon: '⌕' },
  { to: '/leads', label: 'Lista lead', icon: '☰' },
  { to: '/pipeline', label: 'Pipeline', icon: '▦' },
  { to: '/templates', label: 'Template', icon: '✎' },
  { to: '/impostazioni', label: 'Impostazioni', icon: '⚙' },
]
</script>

<template>
  <div class="flex min-h-screen">
    <aside class="hidden w-56 shrink-0 border-r border-slate-200 bg-white md:block">
      <div class="px-5 py-5">
        <div class="text-lg font-bold tracking-tight text-indigo-700">AB Create</div>
        <div class="text-xs text-slate-500">CRM outreach</div>
      </div>
      <nav class="space-y-1 px-3">
        <NuxtLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          active-class="bg-indigo-50 text-indigo-700"
        >
          <span class="w-4 text-center">{{ l.icon }}</span>
          {{ l.label }}
        </NuxtLink>
      </nav>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-3 md:hidden">
        <span class="text-base font-bold text-indigo-700">AB Create CRM</span>
      </header>
      <main class="flex-1 p-5 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
