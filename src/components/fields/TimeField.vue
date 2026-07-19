<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Minus, Plus } from 'lucide-vue-next'
import { hoursToHHMM } from '@/lib/week'

// Campo hh:mm para tempos em horas decimais.
// Desktop: setas ↑/↓ ajustam ±15min (paridade com o monolito).
// Mobile: botões −15/+15 tocáveis (teclado touch não tem setas).
const props = defineProps<{
  modelValue: number
  label: string
  error?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

// 00:00 nunca é exibido como valor: o campo fica vazio com placeholder,
// para o usuário começar a digitar sem precisar apagar
const text = ref(props.modelValue > 0 ? hoursToHHMM(props.modelValue) : '')

watch(
  () => props.modelValue,
  (v) => {
    // Não reescreve enquanto o usuário digita um valor equivalente
    if (normalize(text.value) !== v) text.value = v > 0 ? hoursToHHMM(v) : ''
  }
)

const invalid = computed(() => text.value !== '' && normalize(text.value) === null)

// Entrada parcial é interpretada como se completada: "01" → 01:00, "01:3" → 01:30
function normalize(raw: string): number | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  const hours = Number(digits.slice(0, 2))
  const minutes = Number((digits.slice(2) + '00').slice(0, 2))
  if (minutes > 59) return null
  return hours + minutes / 60
}

// Máscara: apenas dígitos (máx. 4), ":" automático após os 2 primeiros,
// e emissão a cada tecla — o formulário reage sem esperar blur/tab
function onInput(event: Event) {
  const el = event.target as HTMLInputElement
  const digits = el.value.replace(/\D/g, '').slice(0, 4)
  text.value = digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`
  el.value = text.value

  const parsed = normalize(text.value)
  emit('update:modelValue', parsed ?? 0)
}

function commit() {
  const hours = normalize(text.value)
  if (hours !== null) {
    emit('update:modelValue', hours)
    text.value = hours > 0 ? hoursToHHMM(hours) : ''
  } else {
    emit('update:modelValue', 0)
    text.value = props.modelValue > 0 ? hoursToHHMM(props.modelValue) : ''
  }
}

function step(deltaMinutes: number) {
  if (props.disabled) return
  const current = normalize(text.value) ?? props.modelValue
  const next = Math.max(0, current + deltaMinutes / 60)
  emit('update:modelValue', next)
  text.value = next > 0 ? hoursToHHMM(next) : ''
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    step(15)
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    step(-15)
  }
}
</script>

<template>
  <div class="w-full space-y-1.5">
    <label class="text-sm font-medium text-foreground">{{ label }}</label>
    <div class="flex items-center gap-1.5">
      <button
        type="button"
        class="flex h-10 min-w-11 items-center justify-center rounded-md border border-input text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50 lg:hidden"
        :disabled="disabled"
        aria-label="Diminuir 15 minutos"
        @click="step(-15)"
      >
        <Minus class="h-3.5 w-3.5" />15
      </button>
      <input
        :value="text"
        type="text"
        inputmode="numeric"
        maxlength="5"
        placeholder="00:00"
        :disabled="disabled"
        @input="onInput"
        class="h-10 w-full rounded-md border bg-background px-3 py-2 text-center text-sm tabular-nums shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        :class="invalid || error ? 'border-destructive focus-visible:ring-destructive/50' : 'border-input focus-visible:ring-primary/50'"
        @blur="commit"
        @keydown="onKeydown"
      />
      <button
        type="button"
        class="flex h-10 min-w-11 items-center justify-center rounded-md border border-input text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50 lg:hidden"
        :disabled="disabled"
        aria-label="Aumentar 15 minutos"
        @click="step(15)"
      >
        <Plus class="h-3.5 w-3.5" />15
      </button>
    </div>
    <p v-if="error" class="text-sm font-medium text-destructive">{{ error }}</p>
  </div>
</template>
