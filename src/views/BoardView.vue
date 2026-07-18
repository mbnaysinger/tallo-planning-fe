<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { isSameISOWeek } from 'date-fns'
import { useAuthStore } from '@/stores/auth'
import { useBoardStore } from '@/stores/board'
import { tallo } from '@/lib/api'
import { shiftWeek, toISODate, weekDays } from '@/lib/week'
import type { Activity, BoardLane, Project } from '@/types'
import WeekControls from '@/components/board/WeekControls.vue'
import PersonLane from '@/components/board/PersonLane.vue'
import DayView from '@/components/board/DayView.vue'
import BoardSkeleton from '@/components/board/BoardSkeleton.vue'
import ActivityDetailSheet from '@/components/board/ActivityDetailSheet.vue'
import ActivityModal from '@/components/modals/ActivityModal.vue'
import WeeklySummaryModal from '@/components/modals/WeeklySummaryModal.vue'

const router = useRouter()
const auth = useAuthStore()
const board = useBoardStore()

const projects = ref<Project[]>([])

// --- Estado do DayView (mobile) ---
const selectedDate = ref(toISODate(new Date()))
const selectedPersonId = ref(auth.personId)

function clampSelectedDate(landOn: 'monday' | 'friday' | 'today' = 'today') {
  const days = weekDays(board.anchorDate).map(toISODate)
  if (landOn === 'monday') selectedDate.value = days[0]!
  else if (landOn === 'friday') selectedDate.value = days[4]!
  else if (!days.includes(selectedDate.value)) {
    const today = toISODate(new Date())
    selectedDate.value = days.includes(today) ? today : days[0]!
  }
}

watch(
  () => board.lanes,
  (lanes) => {
    if (!lanes.find((l) => l.person.id === selectedPersonId.value) && lanes.length) {
      selectedPersonId.value = lanes[0]!.person.id
    }
  }
)

// --- Modais e painel de detalhe ---
const detailActivity = ref<Activity | null>(null)
const showDetail = ref(false)

const modalMode = ref<'create' | 'edit'>('create')
const modalActivity = ref<Activity | null>(null)
const modalContext = ref<{ personId: string; date: string }>({ personId: '', date: '' })
const showActivityModal = ref(false)
const isSaving = ref(false)

const summaryLane = ref<BoardLane | null>(null)
const showSummaryModal = ref(false)
const isSavingSummary = ref(false)

// Pessoas disponíveis como colaboradores (todas as raias, exceto a pessoa-alvo)
const collaboratorOptions = computed(() =>
  board.lanes.map((l) => l.person).filter((p) => p.id !== modalContext.value.personId)
)

// --- Navegação de semana ---
function goPrevWeek() {
  board.setAnchor(shiftWeek(board.anchorDate, -1))
  clampSelectedDate('monday')
}
function goNextWeek() {
  board.setAnchor(shiftWeek(board.anchorDate, 1))
  clampSelectedDate('monday')
}
function goToday() {
  board.setAnchor(new Date())
  clampSelectedDate('today')
}
function shiftWeekFromDay(delta: 1 | -1, landOn: 'monday' | 'friday') {
  board.setAnchor(shiftWeek(board.anchorDate, delta))
  clampSelectedDate(landOn)
}

// --- Ações de atividade ---
function openCreate(personId: string, date: string) {
  modalMode.value = 'create'
  modalActivity.value = null
  modalContext.value = { personId, date }
  showActivityModal.value = true
}

function openDetail(activity: Activity) {
  detailActivity.value = activity
  showDetail.value = true
}

function openEdit(activity: Activity) {
  showDetail.value = false
  modalMode.value = 'edit'
  modalActivity.value = activity
  modalContext.value = { personId: activity.person_id, date: activity.date }
  showActivityModal.value = true
}

async function submitActivity(payload: Partial<Activity> & { collaborator_ids?: string[] }) {
  isSaving.value = true
  const ok =
    modalMode.value === 'create'
      ? await board.createActivity({ ...payload, person_id: modalContext.value.personId })
      : await board.updateActivity(modalActivity.value!.id, payload)
  isSaving.value = false
  if (ok) showActivityModal.value = false
}

async function changeStatus(activity: Activity, status: Activity['status']) {
  showDetail.value = false
  await board.updateStatus(activity.id, status)
}

async function cloneActivity(activity: Activity) {
  showDetail.value = false
  await board.cloneActivity(activity.id)
}

async function removeActivity(activity: Activity) {
  if (!confirm(`Excluir a atividade "${activity.title}"?`)) return
  showDetail.value = false
  await board.deleteActivity(activity.id)
}

// --- Revisão da semana ---
function openReview(lane: BoardLane) {
  summaryLane.value = lane
  showSummaryModal.value = true
}

async function submitSummary(comment: string) {
  if (!summaryLane.value) return
  isSavingSummary.value = true
  const ok = await board.saveSummary(summaryLane.value.person.id, comment)
  isSavingSummary.value = false
  if (ok) showSummaryModal.value = false
}

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}

window.addEventListener('tallo:unauthorized', () => {
  router.push({ name: 'login' })
})

onMounted(async () => {
  if (isSameISOWeek(new Date(), board.anchorDate)) clampSelectedDate('today')
  await board.loadBoard()
  try {
    projects.value = await tallo.getProjects()
  } catch {
    projects.value = []
  }
})
</script>

<template>
  <div class="mx-auto min-h-dvh max-w-[1600px] p-3 sm:p-4">
    <WeekControls
      :anchor-date="board.anchorDate"
      :display-name="auth.displayName"
      @prev="goPrevWeek"
      @next="goNextWeek"
      @today="goToday"
      @logout="logout"
    />

    <!-- Cabeçalho dos dias (desktop) -->
    <div class="mt-4 hidden grid-cols-5 gap-2 px-3 lg:grid">
      <div
        v-for="label in ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']"
        :key="label"
        class="rounded-md border border-border py-2 text-center text-sm font-semibold"
      >
        {{ label }}
      </div>
    </div>

    <BoardSkeleton v-if="board.isLoading" class="mt-3" :lanes="2" />

    <template v-else>
      <!-- Desktop: raias por pessoa -->
      <div class="mt-3 hidden space-y-4 lg:block">
        <PersonLane
          v-for="lane in board.lanes"
          :key="lane.person.id"
          :lane="lane"
          :anchor-date="board.anchorDate"
          :is-admin="auth.isAdmin"
          :can-drag="true"
          @add="(date) => openCreate(lane.person.id, date)"
          @open="openDetail"
          @status="changeStatus"
          @clone="cloneActivity"
          @reorder="(date, ids) => board.reorderDay(lane.person.id, date, ids)"
          @moved-in="(id, date, ids) => board.moveActivity(id, lane.person.id, date, ids)"
          @review="openReview(lane)"
        />
        <p v-if="!board.lanes.length" class="py-16 text-center text-muted-foreground">
          Nenhuma pessoa no board desta semana.
        </p>
      </div>

      <!-- Mobile: visão de dia (mesma store, sem DnD — mover = editar a data) -->
      <div class="mt-3 lg:hidden">
        <DayView
          :lanes="board.lanes"
          :anchor-date="board.anchorDate"
          :selected-date="selectedDate"
          :selected-person-id="selectedPersonId"
          :is-admin="auth.isAdmin"
          @select-date="selectedDate = $event"
          @select-person="selectedPersonId = $event"
          @shift-week="shiftWeekFromDay"
          @add="openCreate(auth.isAdmin ? selectedPersonId : auth.personId, selectedDate)"
          @open="openDetail"
          @review="() => { const l = board.laneOf(selectedPersonId); if (l) openReview(l) }"
        />
      </div>
    </template>

    <!-- Painel de detalhe/ações (tap no card) -->
    <ActivityDetailSheet
      v-model="showDetail"
      :activity="detailActivity"
      :is-admin="auth.isAdmin"
      @status="(s) => detailActivity && changeStatus(detailActivity, s)"
      @edit="detailActivity && openEdit(detailActivity)"
      @clone="detailActivity && cloneActivity(detailActivity)"
      @delete="detailActivity && removeActivity(detailActivity)"
    />

    <ActivityModal
      v-model="showActivityModal"
      :mode="modalMode"
      :activity="modalActivity"
      :initial-date="modalContext.date"
      :is-admin="auth.isAdmin"
      :persons="collaboratorOptions"
      :projects="projects"
      :is-saving="isSaving"
      @submit="submitActivity"
    />

    <WeeklySummaryModal
      v-model="showSummaryModal"
      :lane="summaryLane"
      :anchor-date="board.anchorDate"
      :is-saving="isSavingSummary"
      @submit="submitSummary"
    />
  </div>
</template>
