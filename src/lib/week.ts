import {
  addDays,
  addWeeks,
  format,
  getISOWeek,
  getISOWeekYear,
  parseISO,
  startOfISOWeek,
} from 'date-fns'

export const WEEKDAY_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']

// Data → string ISO da semana no formato do backend ("2026-W29")
export function isoWeekString(date: Date): string {
  const week = String(getISOWeek(date)).padStart(2, '0')
  return `${getISOWeekYear(date)}-W${week}`
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function fromISODate(date: string): Date {
  return parseISO(date)
}

export function toBRDate(date: Date): string {
  return format(date, 'dd/MM/yyyy')
}

// Dias úteis (Seg–Sex) da semana que contém a data âncora
export function weekDays(anchor: Date): Date[] {
  const monday = startOfISOWeek(anchor)
  return Array.from({ length: 5 }, (_, i) => addDays(monday, i))
}

// Rótulo do intervalo exibido nos controles: "dd/MM/yyyy - dd/MM/yyyy" (Seg–Sex)
export function weekRangeLabel(anchor: Date): string {
  const days = weekDays(anchor)
  return `${toBRDate(days[0]!)} - ${toBRDate(days[4]!)}`
}

export function shiftWeek(anchor: Date, delta: number): Date {
  return addWeeks(anchor, delta)
}

export function shiftDay(anchor: Date, delta: number): Date {
  return addDays(anchor, delta)
}

// Horas decimais (3.5) → "03:30"; limite do dia é 8h (regra da TarjaHoras)
export const DAY_LIMIT_HOURS = 8

export function hoursToHHMM(hours: number): string {
  const totalMinutes = Math.round(Math.abs(hours) * 60)
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const mm = String(totalMinutes % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

// "03:30" → 3.5; retorna null para entrada inválida
export function hhmmToHours(value: string): number | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim())
  if (!match) return null
  return Number(match[1]) + Number(match[2]) / 60
}
