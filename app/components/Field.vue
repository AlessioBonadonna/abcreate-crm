<script setup lang="ts">
defineProps<{ label: string; type?: string }>()
const model = defineModel<string>()
</script>

<template>
  <label class="block text-sm">
    <span class="mb-1 block font-medium text-slate-700">{{ label }}</span>
    <input v-model="model" :type="type ?? 'text'" class="input" />
  </label>
</template>
