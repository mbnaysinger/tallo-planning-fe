<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Copy, Pencil, ThumbsDown, ThumbsUp, Trash2, Undo2 } from 'lucide-vue-next'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import type { Activity } from '@/types'
import { fromISODate, hoursToHHMM, toBRDate } from '@/lib/week'
import { renderMarkdown } from '@/lib/markdown'

// Painel de detalhe com TODAS as ações do card — tap no mobile, clique no desktop.
// Nenhuma ação fica exclusivamente atrás de hover (requisito 6.3).
const props = defineProps<{
  modelValue: boolean
  activity: Activity | null
  canManage: boolean // ADMIN em qualquer raia; USER-FULL na própria
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'status', status: Activity['status']): void
  (e: 'edit'): void
  (e: 'clone'): void
  (e: 'delete'): void
}>()

const statusLabel = computed(() => {
  switch (props.activity?.status) {
    case 'concluida':
      return { text: 'Concluída', class: 'bg-success/15 text-success' }
    case 'nao_realizada':
      return { text: 'Não realizada', class: 'bg-destructive/15 text-destructive' }
    default:
      return { text: 'Planejada', class: 'bg-primary/15 text-primary' }
  }
})

const description = computed(() =>
  props.activity?.description ? renderMarkdown(props.activity.description) : ''
)
</script>

<template>
  <BottomSheet :model-value="modelValue" :title="activity?.title" @update:model-value="emit('update:modelValue', $event)">
    <div v-if="activity" class="space-y-4">
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <span class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="statusLabel.class">
          {{ statusLabel.text }}
        </span>
        <span class="text-muted-foreground">{{ activity.type }}</span>
        <span class="text-muted-foreground">·</span>
        <span class="text-muted-foreground">{{ toBRDate(fromISODate(activity.date)) }}</span>
        <span v-if="activity.is_deviation" class="flex items-center gap-1 text-xs font-medium text-warning">
          <AlertTriangle class="h-3.5 w-3.5" /> Desvio
        </span>
      </div>

      <p class="text-sm text-muted-foreground">
        Planejado <b class="text-foreground">{{ hoursToHHMM(activity.time_planned) }}</b>
        · Executado <b class="text-foreground">{{ hoursToHHMM(activity.time_executed) }}</b>
      </p>

      <div v-if="description" class="markdown-body max-h-56 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 text-sm" v-html="description"></div>

      <!-- Ações: alvos ≥44px -->
      <div class="grid grid-cols-2 gap-2">
        <button
          v-if="activity.status !== 'concluida'"
          class="flex min-h-11 items-center justify-center gap-2 rounded-md bg-success/15 px-3 text-sm font-medium text-success transition-colors hover:bg-success hover:text-white"
          @click="emit('status', 'concluida')"
        >
          <ThumbsUp class="h-4 w-4" /> Concluída
        </button>
        <button
          v-if="activity.status !== 'nao_realizada'"
          class="flex min-h-11 items-center justify-center gap-2 rounded-md bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-white"
          @click="emit('status', 'nao_realizada')"
        >
          <ThumbsDown class="h-4 w-4" /> Não realizada
        </button>
        <button
          v-if="activity.status !== 'planejada'"
          class="flex min-h-11 items-center justify-center gap-2 rounded-md bg-muted px-3 text-sm font-medium transition-colors hover:bg-accent"
          @click="emit('status', 'planejada')"
        >
          <Undo2 class="h-4 w-4" /> Voltar a planejada
        </button>
        <button
          class="flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary/10 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          @click="emit('edit')"
        >
          <Pencil class="h-4 w-4" /> Editar
        </button>
        <button
          v-if="canManage"
          class="flex min-h-11 items-center justify-center gap-2 rounded-md bg-muted px-3 text-sm font-medium transition-colors hover:bg-accent"
          @click="emit('clone')"
        >
          <Copy class="h-4 w-4" /> Clonar
        </button>
        <button
          v-if="canManage"
          class="flex min-h-11 items-center justify-center gap-2 rounded-md bg-destructive/10 px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-white"
          @click="emit('delete')"
        >
          <Trash2 class="h-4 w-4" /> Excluir
        </button>
      </div>
    </div>
  </BottomSheet>
</template>
