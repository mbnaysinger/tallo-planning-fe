<script setup lang="ts">
import { ChevronLeft, ChevronRight, LogOut, Moon, Sun } from 'lucide-vue-next'
import { useDark, useToggle } from '@vueuse/core'
import { weekRangeLabel } from '@/lib/week'

defineProps<{
  anchorDate: Date
  displayName: string
}>()

const emit = defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
  (e: 'today'): void
  (e: 'logout'): void
}>()

const isDark = useDark({ selector: 'html', attribute: 'class', valueDark: 'dark', valueLight: '' })
const toggleDark = useToggle(isDark)
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="flex items-center gap-2">
      <h1 class="mr-2 text-xl font-bold">Tallo Planning</h1>
      <button
        class="rounded-md border border-border p-2 transition-colors hover:bg-accent"
        title="Semana anterior"
        @click="emit('prev')"
      >
        <ChevronLeft class="h-4 w-4" />
      </button>
      <span class="min-w-48 text-center text-sm font-medium tabular-nums">
        {{ weekRangeLabel(anchorDate) }}
      </span>
      <button
        class="rounded-md border border-border p-2 transition-colors hover:bg-accent"
        title="Próxima semana"
        @click="emit('next')"
      >
        <ChevronRight class="h-4 w-4" />
      </button>
      <button
        class="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
        @click="emit('today')"
      >
        Atual
      </button>
    </div>

    <div class="flex items-center gap-3">
      <slot name="filters" />
      <span class="hidden text-sm text-muted-foreground sm:inline">{{ displayName }}</span>
      <button
        class="rounded-md border border-border p-2 transition-colors hover:bg-accent"
        title="Alternar tema"
        @click="toggleDark()"
      >
        <Sun v-if="isDark" class="h-4 w-4" />
        <Moon v-else class="h-4 w-4" />
      </button>
      <button
        class="rounded-md border border-border p-2 transition-colors hover:bg-accent"
        title="Sair"
        @click="emit('logout')"
      >
        <LogOut class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
