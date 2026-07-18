<script setup lang="ts">
import { computed } from 'vue'
import { DAY_LIMIT_HOURS, hoursToHHMM } from '@/lib/week'

const props = defineProps<{
  planned: number
  executed: number
  compact?: boolean
}>()

const overLimit = computed(() => props.planned > DAY_LIMIT_HOURS || props.executed > DAY_LIMIT_HOURS)

// Progresso do executado sobre o planejado (cheio quando não há plano mas há execução)
const progress = computed(() => {
  if (props.planned <= 0) return props.executed > 0 ? 100 : 0
  return Math.min(100, (props.executed / props.planned) * 100)
})

const barClass = computed(() => {
  if (overLimit.value) return 'bg-warning'
  if (props.executed > props.planned && props.planned > 0) return 'bg-destructive'
  return 'bg-success'
})
</script>

<template>
  <div class="w-full" :title="overLimit ? `Atenção: tempo acima do limite diário de ${DAY_LIMIT_HOURS}h` : undefined">
    <div class="flex items-center justify-between gap-2" :class="compact ? 'text-[11px]' : 'text-xs'">
      <span class="text-muted-foreground">
        plan <b class="text-foreground font-semibold">{{ hoursToHHMM(planned) }}</b>
      </span>
      <span class="text-muted-foreground">
        exec <b class="text-foreground font-semibold">{{ hoursToHHMM(executed) }}</b>
      </span>
    </div>
    <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div class="h-full rounded-full transition-all" :class="barClass" :style="{ width: progress + '%' }"></div>
    </div>
    <p v-if="overLimit" class="mt-0.5 text-[10px] font-medium text-warning">acima de {{ DAY_LIMIT_HOURS }}h</p>
  </div>
</template>
