<script setup lang="ts">
import { ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import type { BoardLane } from '@/types'
import { weekRangeLabel } from '@/lib/week'

// Revisão da Semana (ADMIN): progresso, impedimentos e lembretes da pessoa
const props = defineProps<{
  modelValue: boolean
  lane: BoardLane | null
  anchorDate: Date
  isSaving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', comment: string): void
}>()

const comment = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (open) comment.value = props.lane?.summary?.comment ?? ''
  }
)
</script>

<template>
  <AppModal
    :model-value="modelValue"
    title="Revisão da Semana"
    :description="lane ? `${lane.person.name} · ${weekRangeLabel(anchorDate)}` : ''"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="space-y-4" @submit.prevent="comment.trim() && emit('submit', comment.trim())">
      <textarea
        v-model="comment"
        rows="6"
        placeholder="Progresso, impedimentos, lembretes…"
        class="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
      ></textarea>
      <div class="flex justify-end gap-2">
        <BaseButton variant="outline" @click="emit('update:modelValue', false)">Cancelar</BaseButton>
        <BaseButton type="submit" :is-loading="isSaving" :disabled="!comment.trim()">Salvar</BaseButton>
      </div>
    </form>
  </AppModal>
</template>
