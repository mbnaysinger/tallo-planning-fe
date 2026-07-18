<script setup lang="ts">
// Skeleton por raia: mantém a estrutura visual do board durante a carga
defineProps<{ lanes?: number }>()
</script>

<template>
  <div class="space-y-4">
    <section
      v-for="i in lanes ?? 2"
      :key="i"
      class="animate-pulse rounded-xl border border-border bg-card/50 p-3"
    >
      <div class="mb-3 flex items-center justify-between px-1 py-2">
        <div class="h-5 w-48 rounded bg-muted"></div>
        <div class="h-7 w-32 rounded bg-muted"></div>
      </div>
      <div class="hidden grid-cols-5 gap-2 lg:grid">
        <div v-for="d in 5" :key="d" class="space-y-2 rounded-lg border border-dashed border-border p-2">
          <div class="h-7 rounded bg-muted"></div>
          <div class="h-16 rounded bg-muted/70"></div>
          <div class="h-7 rounded bg-muted/50"></div>
        </div>
      </div>
      <div class="space-y-2 lg:hidden">
        <div class="h-7 rounded bg-muted"></div>
        <div class="h-16 rounded bg-muted/70"></div>
        <div class="h-16 rounded bg-muted/50"></div>
      </div>
    </section>
  </div>
</template>
