<script setup lang="ts">
const props = defineProps<{ label: string; value?: string | null; link?: boolean }>()
const href = computed(() => {
  if (!props.link || !props.value) return undefined
  return /^https?:\/\//.test(props.value) ? props.value : `https://${props.value}`
})
</script>

<template>
  <div class="flex justify-between gap-3">
    <span class="shrink-0 text-slate-400">{{ label }}</span>
    <a v-if="link && value" :href="href" target="_blank" rel="noopener"
       class="truncate text-right text-indigo-600 hover:underline">{{ value }}</a>
    <span v-else class="truncate text-right text-slate-700">{{ value || '—' }}</span>
  </div>
</template>
