<script setup lang="ts">
import { NotebookPen } from 'lucide-vue-next'
import type { Activity, BoardLane } from '@/types'
import { hoursToHHMM, toISODate, weekDays } from '@/lib/week'
import DayColumn from './DayColumn.vue'

const props = defineProps<{
  lane: BoardLane
  anchorDate: Date
  canManage: boolean
  canDrag: boolean
}>()

const emit = defineEmits<{
  (e: 'add', date: string): void
  (e: 'open', activity: Activity): void
  (e: 'status', activity: Activity, status: Activity['status']): void
  (e: 'clone', activity: Activity): void
  (e: 'reorder', date: string, orderedIds: string[]): void
  (e: 'moved-in', activityId: string, date: string, orderedIds: string[]): void
  (e: 'review'): void
}>()

const days = () => weekDays(props.anchorDate).map(toISODate)

function activitiesOf(date: string) {
  return props.lane.activities.filter((a) => a.date === date).sort((a, b) => a.position - b.position)
}
</script>

<template>
  <section class="rounded-xl border border-border bg-card/50 shadow-sm">
    <!-- Header da raia -->
    <header class="flex flex-wrap items-center justify-between gap-3 rounded-t-xl bg-card px-4 py-3">
      <div>
        <h2 class="text-lg font-bold uppercase tracking-wide">{{ lane.person.name }}</h2>
      </div>
      <div class="flex items-center gap-4">
        <button
          v-if="canManage"
          class="flex items-center gap-1.5 rounded-full border border-primary px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          @click="emit('review')"
        >
          <NotebookPen class="h-4 w-4" /> Revisão da Semana
        </button>
        <div class="text-right">
          <p class="text-xl font-bold tabular-nums text-primary">
            {{ hoursToHHMM(lane.week_totals.planned) }}/{{ hoursToHHMM(lane.week_totals.executed) }}
          </p>
          <p class="text-xs text-muted-foreground">Planejado/Executado</p>
        </div>
      </div>
    </header>

    <div class="hidden w-full lg:block">
      <div class="grid grid-cols-5 gap-2 p-3">
        <DayColumn
          v-for="date in days()"
          :key="date"
          :person-id="lane.person.id"
          :date="date"
          :activities="activitiesOf(date)"
          :totals="lane.day_totals[date]"
          :can-manage="canManage"
          :can-drag="canDrag"
          @add="emit('add', date)"
          @open="(a) => emit('open', a)"
          @status="(a, s) => emit('status', a, s)"
          @clone="(a) => emit('clone', a)"
          @reorder="(ids) => emit('reorder', date, ids)"
          @moved-in="(id, ids) => emit('moved-in', id, date, ids)"
        />
      </div>
    </div>
  </section>
</template>
