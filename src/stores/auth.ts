import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { auth, clearToken, getToken, setToken } from '@/lib/api'
import { decodeToken } from '@/lib/jwt'
import type { TokenClaims } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  // Token expirado ainda conta como "logado": o refresh transparente do interceptor renova
  const claims = ref<TokenClaims | null>(readClaims())

  function readClaims(): TokenClaims | null {
    const token = getToken()
    if (!token) return null
    return decodeToken(token)
  }

  const isAuthenticated = computed(() => claims.value !== null)
  const personId = computed(() => claims.value?.person_id ?? '')
  const displayName = computed(() => claims.value?.name ?? '')
  const isAdmin = computed(() => claims.value?.roles?.includes('ADMIN') ?? false)

  async function login(identifier: string, password: string) {
    const data = await auth.login(identifier, password)
    setToken(data.token, data.refresh_token)
    claims.value = decodeToken(data.token)
  }

  function logout() {
    clearToken()
    claims.value = null
  }

  // O interceptor dispara este evento quando o refresh falha definitivamente
  window.addEventListener('tallo:unauthorized', () => {
    claims.value = null
  })

  return { claims, isAuthenticated, personId, displayName, isAdmin, login, logout }
})
