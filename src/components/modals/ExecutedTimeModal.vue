<script setup lang="ts">
import { ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import TimeField from '@/components/fields/TimeField.vue'
import type { Activity } from '@/types'

// Concluir exige o apontamento do tempo executado (regra atômica do backend).
// Se já houver tempo registrado, ele vem pré-carregado para o usuário confirmar/ajustar.
const props = defineProps<{
  modelValue: boolean
  activity: Activity | null
  isSaving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', timeExecuted: number): void
}>()

const timeExecuted = ref(0)

watch(
  () => props.modelValue,
  (open) => {
    if (open) timeExecuted.value = props.activity?.time_executed ?? 0
  }
)
</script>

<template>
  <AppModal
    :model-value="modelValue"
    title="Concluir atividade"
    :description="activity?.title"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="space-y-4" @submit.prevent="timeExecuted > 0 && emit('confirm', timeExecuted)">
      <TimeField v-model="timeExecuted" label="Tempo Executado *" />
      <p v-if="timeExecuted <= 0" class="text-xs text-muted-foreground">
        Informe o tempo executado para concluir a atividade.
      </p>
      <div class="flex justify-end gap-2">
        <BaseButton variant="outline" @click="emit('update:modelValue', false)">Cancelar</BaseButton>
        <BaseButton type="submit" :is-loading="isSaving" :disabled="timeExecuted <= 0">Concluir</BaseButton>
      </div>
    </form>
  </AppModal>
</template>
