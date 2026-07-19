import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { toast } from 'vue-sonner'
import { ApiError, tallo, type CreateActivityPayload } from '@/lib/api'
import { isoWeekString, toISODate } from '@/lib/week'
import type { Activity, ActivityStatus, BoardLane, BoardResponse } from '@/types'

// Store única do board: estado normalizado por pessoa×data carregado do endpoint
// agregado. Board desktop (raias) e DayView mobile são projeções deste estado.
export const useBoardStore = defineStore('board', () => {
  const anchorDate = ref(new Date())
  const board = ref<BoardResponse | null>(null)
  const isLoading = ref(false)

  // Filtros (visão ADMIN)
  const squadIds = ref<string[]>([])
  const personIds = ref<string[]>([])
  const projectIds = ref<string[]>([])

  const week = computed(() => isoWeekString(anchorDate.value))
  const lanes = computed(() => board.value?.lanes ?? [])

  function laneOf(personId: string): BoardLane | undefined {
    return board.value?.lanes.find((l) => l.person.id === personId)
  }

  function activitiesFor(personId: string, date: string): Activity[] {
    const lane = laneOf(personId)
    if (!lane) return []
    return lane.activities
      .filter((a) => a.date === date)
      .sort((a, b) => a.position - b.position)
  }

  function findActivity(id: string): Activity | undefined {
    for (const lane of lanes.value) {
      const found = lane.activities.find((a) => a.id === id)
      if (found) return found
    }
    return undefined
  }

  // Recalcula os totais de uma raia localmente (espelho da agregação do backend)
  function recomputeTotals(lane: BoardLane) {
    lane.week_totals = { planned: 0, executed: 0 }
    lane.day_totals = {}
    for (const a of lane.activities) {
      const day = lane.day_totals[a.date] ?? { planned: 0, executed: 0 }
      day.planned += a.time_planned
      day.executed += a.time_executed
      lane.day_totals[a.date] = day
      lane.week_totals.planned += a.time_planned
      lane.week_totals.executed += a.time_executed
    }
  }

  // --- Carga ---

  async function loadBoard(options?: { silent?: boolean }) {
    if (!options?.silent) isLoading.value = true
    try {
      board.value = await tallo.getBoard(week.value, {
        squadIds: squadIds.value,
        personIds: personIds.value,
        projectIds: projectIds.value,
      })
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Falha ao carregar o board')
    } finally {
      isLoading.value = false
    }
  }

  function setAnchor(date: Date) {
    anchorDate.value = date
    void loadBoard()
  }

  // --- Padrão otimista: snapshot → mutação local → persistência → rollback em falha ---

  function snapshot(): string {
    return JSON.stringify(board.value)
  }

  function restore(snap: string) {
    board.value = JSON.parse(snap)
  }

  async function optimistic(mutate: () => void, persist: () => Promise<void>, errorFallback: string) {
    const snap = snapshot()
    mutate()
    try {
      await persist()
      return true
    } catch (error) {
      restore(snap)
      toast.error(error instanceof ApiError ? error.message : errorFallback)
      return false
    }
  }

  // Reordena os cards de um dia (mesma pessoa)
  async function reorderDay(personId: string, date: string, orderedIds: string[]) {
    return optimistic(
      () => {
        const lane = laneOf(personId)
        if (!lane) return
        orderedIds.forEach((id, index) => {
          const activity = lane.activities.find((a) => a.id === id)
          if (activity) activity.position = index
        })
      },
      () => tallo.reorder(personId, date, orderedIds),
      'Falha ao salvar a nova ordem'
    )
  }

  // Move um card para outro dia da mesma raia e aplica a ordem do dia de destino
  async function moveActivity(activityId: string, personId: string, targetDate: string, orderedIdsTarget: string[]) {
    return optimistic(
      () => {
        const lane = laneOf(personId)
        if (!lane) return
        const activity = lane.activities.find((a) => a.id === activityId)
        if (activity) activity.date = targetDate
        orderedIdsTarget.forEach((id, index) => {
          const target = lane.activities.find((a) => a.id === id)
          if (target) target.position = index
        })
        recomputeTotals(lane)
      },
      () => tallo.moveAndReorder(activityId, targetDate, orderedIdsTarget),
      'Falha ao mover a atividade'
    )
  }

  // Alterna o status com atualização imediata; concluir carrega junto o tempo executado
  async function updateStatus(activityId: string, status: ActivityStatus, timeExecuted?: number) {
    return optimistic(
      () => {
        const activity = findActivity(activityId)
        if (!activity) return
        activity.status = status
        if (timeExecuted !== undefined) {
          activity.time_executed = timeExecuted
          const lane = laneOf(activity.person_id)
          if (lane) recomputeTotals(lane)
        }
      },
      async () => {
        await tallo.updateActivityStatus(activityId, status, timeExecuted)
      },
      'Falha ao atualizar o status'
    )
  }

  // Edição rápida do título via PATCH, com atualização otimista
  async function renameActivity(activityId: string, title: string) {
    return optimistic(
      () => {
        const activity = findActivity(activityId)
        if (activity) activity.title = title
      },
      async () => {
        await tallo.updateActivityTitle(activityId, title)
      },
      'Falha ao renomear a atividade'
    )
  }

  // Exclusão otimista (ADMIN)
  async function deleteActivity(activityId: string) {
    const ok = await optimistic(
      () => {
        for (const lane of lanes.value) {
          const index = lane.activities.findIndex((a) => a.id === activityId)
          if (index >= 0) {
            lane.activities.splice(index, 1)
            recomputeTotals(lane)
            break
          }
        }
      },
      () => tallo.deleteActivity(activityId),
      'Falha ao excluir a atividade'
    )
    if (ok) toast.success('Atividade excluída')
    return ok
  }

  // Criação/edição/clonagem: o servidor é autoritativo (position, week, réplicas) —
  // aguarda a resposta e recarrega silenciosamente para reconciliar.
  async function createActivity(payload: CreateActivityPayload) {
    try {
      await tallo.createActivity(payload)
      await loadBoard({ silent: true })
      toast.success('Atividade criada')
      return true
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Falha ao criar a atividade')
      return false
    }
  }

  async function updateActivity(id: string, payload: Partial<Activity>) {
    try {
      await tallo.updateActivity(id, payload)
      await loadBoard({ silent: true })
      toast.success('Atividade atualizada')
      return true
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Falha ao atualizar a atividade')
      return false
    }
  }

  async function cloneActivity(id: string) {
    try {
      const cloned = await tallo.cloneActivity(id)
      const lane = laneOf(cloned.person_id)
      if (lane) {
        lane.activities.push(cloned)
        recomputeTotals(lane)
      }
      toast.success('Atividade clonada')
      return true
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Falha ao clonar a atividade')
      return false
    }
  }

  async function saveSummary(personId: string, comment: string) {
    try {
      const saved = await tallo.saveWeeklySummary(personId, week.value, comment)
      const lane = laneOf(personId)
      if (lane) lane.summary = saved
      toast.success('Revisão da semana salva')
      return true
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Falha ao salvar a revisão')
      return false
    }
  }

  async function applyFilters(filters: { squadIds: string[]; personIds: string[]; projectIds: string[] }) {
    squadIds.value = filters.squadIds
    personIds.value = filters.personIds
    projectIds.value = filters.projectIds
    await loadBoard()
  }

  return {
    anchorDate,
    board,
    isLoading,
    week,
    lanes,
    squadIds,
    personIds,
    projectIds,
    laneOf,
    activitiesFor,
    findActivity,
    loadBoard,
    setAnchor,
    reorderDay,
    moveActivity,
    updateStatus,
    renameActivity,
    deleteActivity,
    createActivity,
    updateActivity,
    cloneActivity,
    saveSummary,
    applyFilters,
  }
})

export { toISODate }
