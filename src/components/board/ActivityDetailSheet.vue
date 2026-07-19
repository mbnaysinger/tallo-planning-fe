<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { AlertTriangle, Check, Copy, Maximize2, Pencil, ThumbsDown, ThumbsUp, Trash2, Undo2, X } from 'lucide-vue-next'
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
  (e: 'rename', title: string): void
}>()

// --- Edição rápida do título (canetinha ao fim do texto) ---
const editingTitle = ref(false)
const titleDraft = ref('')
const titleInput = ref<HTMLInputElement>()

watch(
  () => props.modelValue,
  (open) => {
    if (!open) editingTitle.value = false
    descExpanded.value = false
  }
)

async function startRename() {
  titleDraft.value = props.activity?.title ?? ''
  editingTitle.value = true
  await nextTick()
  titleInput.value?.focus()
  titleInput.value?.select()
}

function confirmRename() {
  const next = titleDraft.value.trim()
  if (next.length < 3 || next === props.activity?.title) {
    editingTitle.value = false
    return
  }
  editingTitle.value = false
  emit('rename', next)
}

// --- Visão ampliada (read-only) da descrição ---
const descExpanded = ref(false)

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
    <template #title>
      <!-- Título truncado + canetinha logo após o fim do texto (dentro do min-w-0, longe do X) -->
      <div v-if="!editingTitle" class="flex min-w-0 items-start gap-1.5">
        <h3 class="min-w-0 text-lg font-bold leading-tight [overflow-wrap:anywhere]">{{ activity?.title }}</h3>
        <button
          class="mt-0.5 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Editar título"
          @click="startRename"
        >
          <Pencil class="h-3.5 w-3.5" />
        </button>
      </div>
      <form v-else class="flex items-center gap-1.5" @submit.prevent="confirmRename">
        <input
          ref="titleInput"
          v-model="titleDraft"
          class="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          @keydown.esc="editingTitle = false"
          @blur="confirmRename"
        />
        <button
          type="submit"
          class="shrink-0 rounded-md bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          :disabled="titleDraft.trim().length < 3"
          title="Salvar título"
        >
          <Check class="h-4 w-4" />
        </button>
      </form>
    </template>

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

      <div v-if="description" class="relative">
        <button
          class="absolute right-1.5 top-1.5 z-10 rounded bg-card/80 p-1.5 text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
          title="Ampliar descrição"
          @click="descExpanded = true"
        >
          <Maximize2 class="h-4 w-4" />
        </button>
        <div class="markdown-body max-h-56 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 pr-9 text-sm" v-html="description"></div>
      </div>

      <!-- Visão ampliada read-only da descrição -->
      <Teleport to="body">
        <div v-if="descExpanded" class="fixed inset-0 z-[70] flex flex-col bg-background p-4">
          <div class="mb-3 flex items-start justify-between gap-2">
            <h3 class="min-w-0 text-lg font-bold leading-tight [overflow-wrap:anywhere]">{{ activity?.title }}</h3>
            <button
              class="shrink-0 rounded-full p-1.5 opacity-70 transition-colors hover:bg-muted hover:opacity-100"
              title="Fechar"
              @click="descExpanded = false"
            >
              <X class="h-5 w-5" />
            </button>
          </div>
          <div class="markdown-body flex-1 overflow-y-auto rounded-md border border-border bg-muted/20 p-4 text-sm" v-html="description"></div>
        </div>
      </Teleport>

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
