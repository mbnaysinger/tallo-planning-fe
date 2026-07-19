<script setup lang="ts">
import { ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { Plus } from 'lucide-vue-next'
import { format } from 'date-fns'
import type { Activity, DayTotals } from '@/types'
import { fromISODate, hoursToHHMM } from '@/lib/week'
import ActivityCard from './ActivityCard.vue'

const props = defineProps<{
  personId: string
  date: string // YYYY-MM-DD
  activities: Activity[]
  totals?: DayTotals
  canManage: boolean
  canDrag: boolean
}>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'open', activity: Activity): void
  (e: 'status', activity: Activity, status: Activity['status']): void
  (e: 'clone', activity: Activity): void
  (e: 'reorder', orderedIds: string[]): void
  (e: 'moved-in', activityId: string, orderedIds: string[]): void
}>()

// Cópia local exigida pelo vuedraggable; a store continua sendo a fonte da verdade
// e re-sincroniza este array em qualquer mudança (inclusive rollback).
const localList = ref<Activity[]>([...props.activities])
watch(
  () => props.activities,
  (next) => {
    localList.value = [...next]
  },
  { deep: true }
)

type DragChangeEvent = {
  added?: { element: Activity }
  moved?: { element: Activity }
}

// A data de destino vem das props desta coluna — nunca do DOM
function onChange(event: DragChangeEvent) {
  const orderedIds = localList.value.map((a) => a.id)
  if (event.added) {
    emit('moved-in', event.added.element.id, orderedIds)
  } else if (event.moved) {
    emit('reorder', orderedIds)
  }
  // event.removed: a coluna de destino persiste o movimento
}
</script>

<template>
  <div
    class="day-drop flex min-h-40 flex-col gap-2 rounded-lg border border-dashed border-border p-2 transition-colors"
  >
    <!-- TarjaHoras do dia -->
    <div class="rounded-md border border-border bg-muted/50 px-2 py-1.5">
      <div class="flex items-center justify-between text-[11px]">
        <span class="font-semibold">{{ format(fromISODate(date), 'dd/MM') }}</span>
        <span class="text-muted-foreground">
          plan <b class="text-foreground">{{ hoursToHHMM(totals?.planned ?? 0) }}</b>
          exec <b class="text-foreground">{{ hoursToHHMM(totals?.executed ?? 0) }}</b>
        </span>
      </div>
    </div>

    <draggable
      :list="localList"
      item-key="id"
      :group="'lane-' + personId"
      :disabled="!canDrag"
      ghost-class="drag-ghost"
      :animation="150"
      class="flex flex-1 flex-col gap-2"
      @change="onChange"
    >
      <template #item="{ element }">
        <ActivityCard
          :activity="element"
          :can-manage="canManage"
          @open="emit('open', element)"
          @status="(s) => emit('status', element, s)"
          @clone="emit('clone', element)"
        />
      </template>
    </draggable>

    <button
      class="flex w-full items-center justify-center gap-1 rounded-md bg-primary/90 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary"
      @click="emit('add')"
    >
      <Plus class="h-3.5 w-3.5" /> Adicionar
    </button>
  </div>
</template>

<style scoped>
.drag-ghost {
  opacity: 0.4;
}
/* Destaque da coluna de destino durante o arrasto (paridade com o monolito) */
.day-drop:has(.drag-ghost) {
  border-color: hsl(var(--primary));
  background-color: hsl(var(--primary) / 0.05);
}
</style>
