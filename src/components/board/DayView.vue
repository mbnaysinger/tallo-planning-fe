<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, NotebookPen, Plus } from 'lucide-vue-next'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Activity, BoardLane } from '@/types'
import { fromISODate, toISODate, weekDays } from '@/lib/week'
import ActivityCard from './ActivityCard.vue'
import TimeBar from './TimeBar.vue'

// Projeção mobile do board: um dia por vez, lista vertical, mesma store.
// Navegar entre dias da semana não gera fetch; cruzar a semana emite 'shift-week'.
const props = defineProps<{
  lanes: BoardLane[]
  anchorDate: Date
  selectedDate: string
  selectedPersonId: string
  isAdmin: boolean
  canManage: boolean
}>()

const emit = defineEmits<{
  (e: 'select-date', date: string): void
  (e: 'select-person', personId: string): void
  (e: 'shift-week', delta: 1 | -1, landOn: 'monday' | 'friday'): void
  (e: 'add'): void
  (e: 'open', activity: Activity): void
  (e: 'review'): void
}>()

const days = computed(() => weekDays(props.anchorDate).map(toISODate))

const lane = computed(() => props.lanes.find((l) => l.person.id === props.selectedPersonId) ?? props.lanes[0] ?? null)

const activities = computed(() => {
  if (!lane.value) return []
  return lane.value.activities
    .filter((a) => a.date === props.selectedDate)
    .sort((a, b) => a.position - b.position)
})

const dayLabel = computed(() =>
  format(fromISODate(props.selectedDate), "EEEE, dd 'de' MMMM", { locale: ptBR })
)

function prevDay() {
  const index = days.value.indexOf(props.selectedDate)
  if (index > 0) emit('select-date', days.value[index - 1]!)
  else emit('shift-week', -1, 'friday')
}

function nextDay() {
  const index = days.value.indexOf(props.selectedDate)
  if (index >= 0 && index < days.value.length - 1) emit('select-date', days.value[index + 1]!)
  else emit('shift-week', 1, 'monday')
}

// Swipe horizontal nativo para trocar de dia
const touchStartX = ref(0)
function onTouchStart(event: TouchEvent) {
  touchStartX.value = event.changedTouches[0]?.clientX ?? 0
}
function onTouchEnd(event: TouchEvent) {
  const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.value
  if (Math.abs(deltaX) < 60) return
  if (deltaX < 0) nextDay()
  else prevDay()
}
</script>

<template>
  <div class="flex flex-col gap-3" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
    <!-- Seleção de pessoa (ADMIN com várias raias) -->
    <select
      v-if="isAdmin && lanes.length > 1"
      :value="lane?.person.id"
      class="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      @change="emit('select-person', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="l in lanes" :key="l.person.id" :value="l.person.id">{{ l.person.name }}</option>
    </select>

    <div v-if="lane" class="rounded-xl border border-border bg-card p-3">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <h2 class="truncate text-base font-bold uppercase tracking-wide">{{ lane.person.name }}</h2>
          <p class="text-xs capitalize text-muted-foreground">{{ dayLabel }}</p>
        </div>
        <button
          v-if="canManage"
          class="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-primary text-primary"
          title="Revisão da Semana"
          @click="emit('review')"
        >
          <NotebookPen class="h-5 w-5" />
        </button>
      </div>
      <div class="mt-2">
        <TimeBar
          :planned="lane.day_totals[selectedDate]?.planned ?? 0"
          :executed="lane.day_totals[selectedDate]?.executed ?? 0"
        />
      </div>
    </div>

    <!-- Navegação de dia: strip Seg–Sex + setas -->
    <div class="flex items-center gap-1">
      <button class="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border" aria-label="Dia anterior" @click="prevDay">
        <ChevronLeft class="h-5 w-5" />
      </button>
      <div class="grid flex-1 grid-cols-5 gap-1">
        <button
          v-for="date in days"
          :key="date"
          class="flex min-h-11 flex-col items-center justify-center rounded-md border text-xs font-medium transition-colors"
          :class="date === selectedDate ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent'"
          @click="emit('select-date', date)"
        >
          <span>{{ format(fromISODate(date), 'EEEEEE', { locale: ptBR }) }}</span>
          <span class="tabular-nums">{{ format(fromISODate(date), 'dd') }}</span>
          <span
            v-if="lane && (lane.day_totals[date]?.planned || lane.day_totals[date]?.executed)"
            class="mt-0.5 h-1 w-1 rounded-full"
            :class="date === selectedDate ? 'bg-primary-foreground' : 'bg-primary'"
          ></span>
        </button>
      </div>
      <button class="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border" aria-label="Próximo dia" @click="nextDay">
        <ChevronRight class="h-5 w-5" />
      </button>
    </div>

    <!-- Lista do dia -->
    <div class="flex flex-1 flex-col gap-2 pb-20">
      <ActivityCard
        v-for="activity in activities"
        :key="activity.id"
        :activity="activity"
        :can-manage="canManage"
        @open="emit('open', activity)"
      />
      <p v-if="!activities.length" class="py-8 text-center text-sm text-muted-foreground">
        Nenhuma atividade neste dia.
      </p>
    </div>

    <!-- Criação: botão fixo -->
    <button
      class="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
      aria-label="Adicionar atividade"
      @click="emit('add')"
    >
      <Plus class="h-6 w-6" />
    </button>
  </div>
</template>
