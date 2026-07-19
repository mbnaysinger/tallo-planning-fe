import axios, { AxiosError, type AxiosInstance } from 'axios'
import type {
  Activity,
  ActivityStatus,
  BoardResponse,
  Project,
  Squad,
  WeeklySummary,
} from '@/types'

// ---------------------------------------------------------------------------
// Camada única de HTTP: um token, um refresh, duas APIs (nayz-auth e tallo).
// ---------------------------------------------------------------------------

const AUTH_BASE = import.meta.env.VITE_AUTH_API_URL || 'http://localhost:8080/api/v1'
const TALLO_BASE = import.meta.env.VITE_TALLO_API_URL || 'http://localhost:8081/api/v1'

const TOKEN_KEY = 'tallo_token'
const REFRESH_KEY = 'tallo_refresh_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)

export const setToken = (token: string, refreshToken?: string) => {
  localStorage.setItem(TOKEN_KEY, token)
  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken)
  }
}

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export class ApiError extends Error {
  constructor(
    public override message: string,
    public status?: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function handleError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: string } | undefined)?.error || error.message
    throw new ApiError(message, error.response?.status)
  }
  throw new ApiError('Erro desconhecido de conexão')
}

// --- Refresh transparente com fila anti-corrida (compartilhado pelas duas APIs) ---

let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else if (token) prom.resolve(token)
  })
  failedQueue = []
}

function attachInterceptors(instance: AxiosInstance) {
  instance.interceptors.request.use((config) => {
    const token = getToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as (typeof error.config & { _retry?: boolean }) | undefined
      if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error)
      }
      if (originalRequest.url?.includes('/users/login') || originalRequest.url?.includes('/users/refresh')) {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers!.Authorization = `Bearer ${token}`
          return instance(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem(REFRESH_KEY)
      if (!refreshToken) {
        isRefreshing = false
        clearToken()
        window.dispatchEvent(new Event('tallo:unauthorized'))
        return Promise.reject(error)
      }

      try {
        // Axios cru (sem interceptors) para evitar loop infinito
        const { data } = await axios.post(`${AUTH_BASE}/users/refresh`, { refresh_token: refreshToken })
        setToken(data.token, data.refresh_token)
        processQueue(null, data.token)
        originalRequest.headers!.Authorization = `Bearer ${data.token}`
        return instance(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        clearToken()
        window.dispatchEvent(new Event('tallo:unauthorized'))
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }
  )
}

const authApi = axios.create({ baseURL: AUTH_BASE, headers: { 'Content-Type': 'application/json' } })
const talloApi = axios.create({ baseURL: TALLO_BASE, headers: { 'Content-Type': 'application/json' } })
attachInterceptors(authApi)
attachInterceptors(talloApi)

// ---------------------------------------------------------------------------
// nayz-auth: autenticação e perfil
// ---------------------------------------------------------------------------

const APP_ID = import.meta.env.VITE_NAYZ_AUTH_APP_ID

export const auth = {
  async login(identifier: string, password: string) {
    try {
      const { data } = await authApi.post('/users/login', { app_id: APP_ID, identifier, password })
      return data as { token: string; refresh_token: string; type: string }
    } catch (error) {
      handleError(error)
    }
  },

  async passwordlessStart(identifier: string) {
    try {
      const { data } = await authApi.post('/users/passwordless/start', { app_id: APP_ID, identifier })
      return data
    } catch (error) {
      handleError(error)
    }
  },

  async passwordlessVerify(identifier: string, code: string) {
    try {
      const { data } = await authApi.post('/users/passwordless/verify', { app_id: APP_ID, identifier, code })
      return data as { token: string; refresh_token: string; type: string }
    } catch (error) {
      handleError(error)
    }
  },

  async me() {
    try {
      const { data } = await authApi.get('/me')
      return data
    } catch (error) {
      handleError(error)
    }
  },
}

// ---------------------------------------------------------------------------
// tallo-planning-api: board, atividades, squads, resumos, projetos
// ---------------------------------------------------------------------------

export interface CreateActivityPayload extends Partial<Activity> {
  collaborator_ids?: string[]
}

export const tallo = {
  async getBoard(week: string, filters?: { squadIds?: string[]; personIds?: string[]; projectIds?: string[] }) {
    try {
      const params = new URLSearchParams({ week })
      if (filters?.squadIds?.length) params.set('squad_ids', filters.squadIds.join(','))
      if (filters?.personIds?.length) params.set('person_ids', filters.personIds.join(','))
      if (filters?.projectIds?.length) params.set('project_ids', filters.projectIds.join(','))
      const { data } = await talloApi.get(`/board?${params.toString()}`)
      return data as BoardResponse
    } catch (error) {
      handleError(error)
    }
  },

  async createActivity(payload: CreateActivityPayload) {
    try {
      const { data } = await talloApi.post('/activities', payload)
      return data as Activity[]
    } catch (error) {
      handleError(error)
    }
  },

  async updateActivity(id: string, payload: Partial<Activity>) {
    try {
      const { data } = await talloApi.put(`/activities/${id}`, payload)
      return data as Activity
    } catch (error) {
      handleError(error)
    }
  },

  async updateActivityTitle(id: string, title: string) {
    try {
      const { data } = await talloApi.patch(`/activities/${id}/title`, { title })
      return data as Activity
    } catch (error) {
      handleError(error)
    }
  },

  async updateActivityStatus(id: string, status: ActivityStatus, timeExecuted?: number) {
    try {
      const payload: { status: ActivityStatus; time_executed?: number } = { status }
      if (timeExecuted !== undefined) payload.time_executed = timeExecuted
      const { data } = await talloApi.patch(`/activities/${id}/status`, payload)
      return data as Activity
    } catch (error) {
      handleError(error)
    }
  },

  async deleteActivity(id: string) {
    try {
      await talloApi.delete(`/activities/${id}`)
    } catch (error) {
      handleError(error)
    }
  },

  async cloneActivity(id: string) {
    try {
      const { data } = await talloApi.post(`/activities/${id}/clone`)
      return data as Activity
    } catch (error) {
      handleError(error)
    }
  },

  async reorder(personId: string, date: string, orderedIds: string[]) {
    try {
      await talloApi.post('/activities/reorder', { person_id: personId, date, ordered_ids: orderedIds })
    } catch (error) {
      handleError(error)
    }
  },

  async moveAndReorder(activityId: string, targetDate: string, orderedIds: string[]) {
    try {
      await talloApi.post('/activities/move-and-reorder', {
        activity_id: activityId,
        target_date: targetDate,
        ordered_ids: orderedIds,
      })
    } catch (error) {
      handleError(error)
    }
  },

  async saveWeeklySummary(personId: string, week: string, comment: string) {
    try {
      const { data } = await talloApi.put('/weekly-summaries', { person_id: personId, week, comment })
      return data as WeeklySummary
    } catch (error) {
      handleError(error)
    }
  },

  async getSquads() {
    try {
      const { data } = await talloApi.get('/squads')
      return data as Squad[]
    } catch (error) {
      handleError(error)
    }
  },

  async getProjects() {
    try {
      const { data } = await talloApi.get('/projects')
      return data as Project[]
    } catch (error) {
      handleError(error)
    }
  },
}
