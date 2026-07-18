// Tipos de domínio — espelham os contratos do tallo-planning-api e do nayz-auth

export type ActivityStatus = 'planejada' | 'concluida' | 'nao_realizada'

export type ActivityType = 'Projeto' | 'Melhoria' | 'Sustentação' | 'Administrativo' | 'Capacitação'

export const ACTIVITY_TYPES: ActivityType[] = ['Projeto', 'Melhoria', 'Sustentação', 'Administrativo', 'Capacitação']

export interface Activity {
  id: string
  title: string
  date: string // YYYY-MM-DD
  week: string // ex.: 2026-W29
  person_id: string
  type: ActivityType
  is_deviation: boolean
  project_id: string | null
  description: string | null // Markdown livre
  time_planned: number // horas decimais (3.5 = 3h30)
  time_executed: number
  status: ActivityStatus
  position: number
  created_at?: string
  updated_at?: string
}

export interface Person {
  id: string
  user_id?: string
  name: string
  identifier?: string
  is_active: boolean
}

export interface WeeklySummary {
  id: string
  person_id: string
  week: string
  comment: string
}

export interface DayTotals {
  planned: number
  executed: number
}

export interface BoardLane {
  person: Person
  activities: Activity[]
  summary: WeeklySummary | null
  week_totals: DayTotals
  day_totals: Record<string, DayTotals>
}

export interface BoardResponse {
  week: string
  lanes: BoardLane[]
}

export interface Squad {
  id: string
  name: string
  is_active: boolean
  member_ids: string[]
}

export interface Project {
  id: string
  abbreviation: string
  name: string
  status: string
}

// Claims do JWT emitido pelo nayz-auth para a app TALLO-PLANNING
export interface TokenClaims {
  sub: string
  app_id: string
  roles: string[]
  person_id?: string
  name?: string
  exp: number
}
