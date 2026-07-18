<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDark, useToggle } from '@vueuse/core'
import { Moon, Sun } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/lib/api'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'

const router = useRouter()
const auth = useAuthStore()

const identifier = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

const isDark = useDark({ selector: 'html', attribute: 'class', valueDark: 'dark', valueLight: '' })
const toggleDark = useToggle(isDark)

async function submit() {
  error.value = ''
  isLoading.value = true
  try {
    await auth.login(identifier.value.trim(), password.value)
    router.push({ name: 'board' })
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Falha ao entrar. Tente novamente.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-background p-4">
    <button
      class="absolute right-4 top-4 rounded-md border border-border p-2 transition-colors hover:bg-accent"
      title="Alternar tema"
      @click="toggleDark()"
    >
      <Sun v-if="isDark" class="h-4 w-4" />
      <Moon v-else class="h-4 w-4" />
    </button>

    <div class="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
      <h1 class="text-2xl font-bold">Tallo Planning</h1>
      <p class="mt-1 text-sm text-muted-foreground">Entre com sua conta para acessar o board.</p>

      <form class="mt-6 space-y-4" @submit.prevent="submit">
        <BaseInput
          v-model="identifier"
          label="E-mail ou usuário"
          placeholder="voce@empresa.com"
          required
        />
        <BaseInput
          v-model="password"
          label="Senha"
          type="password"
          placeholder="••••••••"
          required
        />
        <p v-if="error" class="text-sm font-medium text-destructive">{{ error }}</p>
        <BaseButton type="submit" class="w-full" :is-loading="isLoading">Entrar</BaseButton>
      </form>
    </div>
  </div>
</template>
