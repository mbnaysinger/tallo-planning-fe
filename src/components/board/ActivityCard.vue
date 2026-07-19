<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Copy, ThumbsDown, ThumbsUp } from 'lucide-vue-next'
import type { Activity } from '@/types'
import { hoursToHHMM } from '@/lib/week'
import { stripMarkdown } from '@/lib/markdown'

const props = defineProps<{
  activity: Activity
  canManage: boolean // ADMIN em qualquer raia; USER-FULL na própria
}>()

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'status', status: Activity['status']): void
  (e: 'clone'): void
}>()

const stateClass = computed(() => {
  switch (props.activity.status) {
    case 'concluida':
      return 'border-l-success opacity-80'
    case 'nao_realizada':
      return 'border-l-destructive opacity-60'
    default:
      return 'border-l-primary'
  }
})

const titleClass = computed(() =>
  props.activity.status === 'nao_realizada' ? 'text-muted-foreground' : 'text-card-foreground'
)

const descriptionPreview = computed(() =>
  props.activity.description ? stripMarkdown(props.activity.description) : ''
)
</script>

<template>
  <div
    class="group relative cursor-pointer rounded-md border border-border border-l-4 bg-card p-2 shadow-sm transition-colors hover:border-primary/50"
    :class="stateClass"
    @click="emit('open')"
  >
    <div class="flex items-start justify-between gap-1">
      <p class="text-sm font-semibold leading-tight" :class="titleClass">{{ activity.title }}</p>
      <AlertTriangle
        v-if="activity.is_deviation"
        class="h-4 w-4 shrink-0 text-warning"
        aria-label="Desvio de planejamento"
      />
    </div>

    <p class="mt-0.5 text-[11px] text-muted-foreground">
      {{ hoursToHHMM(activity.time_planned) }}/{{ hoursToHHMM(activity.time_executed) }}
    </p>
    <p class="text-[11px] text-muted-foreground">{{ activity.type }}</p>
    <p v-if="descriptionPreview" class="mt-1 line-clamp-2 text-[11px] text-muted-foreground/80">
      {{ descriptionPreview }}
    </p>

    <!-- Ações rápidas: atalho por hover no desktop; o clique abre o painel com as mesmas ações -->
    <div
      class="pointer-events-none absolute bottom-1.5 right-1.5 hidden items-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 lg:flex"
      @click.stop
    >
      <button
        class="rounded-full p-1.5 shadow hover:brightness-110"
        :class="activity.status === 'concluida' ? 'bg-success text-white ring-2 ring-success/50' : 'bg-muted text-muted-foreground hover:bg-success hover:text-white'"
        :title="activity.status === 'concluida' ? 'Desfazer conclusão' : 'Marcar como concluída'"
        @click="emit('status', 'concluida')"
      >
        <ThumbsUp class="h-3.5 w-3.5" />
      </button>
      <button
        class="rounded-full p-1.5 shadow hover:brightness-110"
        :class="activity.status === 'nao_realizada' ? 'bg-destructive text-white ring-2 ring-destructive/50' : 'bg-muted text-muted-foreground hover:bg-destructive hover:text-white'"
        :title="activity.status === 'nao_realizada' ? 'Desfazer marcação' : 'Marcar como não realizada'"
        @click="emit('status', 'nao_realizada')"
      >
        <ThumbsDown class="h-3.5 w-3.5" />
      </button>
      <button
        v-if="canManage"
        class="rounded-full bg-muted p-1.5 text-muted-foreground shadow hover:bg-primary hover:text-primary-foreground"
        title="Clonar atividade"
        @click="emit('clone')"
      >
        <Copy class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>
