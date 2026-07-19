<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'

// Painel de detalhe/ações: bottom-sheet no mobile, dialog central no desktop.
// Garante que nenhuma ação fique exclusivamente atrás de hover (requisito 6.3).
const props = defineProps<{
  modelValue: boolean
  title?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

watch(
  () => props.modelValue,
  (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  }
)

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        class="fixed inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in"
        @click="emit('update:modelValue', false)"
      ></div>

      <div
        class="z-50 w-full rounded-t-2xl border border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl animate-in slide-in-from-bottom sm:mx-4 sm:max-w-md sm:rounded-2xl sm:p-6 sm:zoom-in-95"
      >
        <div class="mx-auto mb-3 h-1 w-10 rounded-full bg-muted sm:hidden"></div>
        <div v-if="title || $slots.title" class="mb-4 flex items-start justify-between gap-2">
          <!-- min-w-0 garante truncamento/quebra do título sem invadir o X (bug3) -->
          <div class="min-w-0 flex-1">
            <slot name="title">
              <h3 class="text-lg font-bold leading-tight [overflow-wrap:anywhere]">{{ title }}</h3>
            </slot>
          </div>
          <button
            class="shrink-0 rounded-full p-1.5 opacity-70 transition-colors hover:bg-muted hover:opacity-100"
            @click="emit('update:modelValue', false)"
          >
            <X class="h-5 w-5" />
          </button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
