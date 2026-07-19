<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import TimeField from '@/components/fields/TimeField.vue'
import MarkdownField from '@/components/fields/MarkdownField.vue'
import { ACTIVITY_TYPES, type Activity, type ActivityType, type Person, type Project } from '@/types'

// Modal de criação/edição com as validações do monolito:
// título ≥3, data obrigatória, projeto condicional ao tipo "Projeto",
// desvio zera o planejado, tempos em hh:mm com step de 15min.
// Perfil USER: tipo/projeto read-only; colaboradores apenas na criação por ADMIN.
const props = defineProps<{
  modelValue: boolean
  mode: 'create' | 'edit'
  activity?: Activity | null
  initialDate?: string
  isAdmin: boolean // habilita colaboradores (criar para terceiros é exclusivo do ADMIN)
  canFullEdit: boolean // ADMIN/USER-FULL: tipo/projeto editáveis e data sem trava de semana
  persons: Person[]
  projects: Project[]
  isSaving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', payload: Partial<Activity> & { collaborator_ids?: string[] }): void
}>()

const form = reactive({
  title: '',
  date: '',
  type: '' as ActivityType | '',
  project_id: '',
  description: '',
  time_planned: 0,
  time_executed: 0,
  is_deviation: false,
  collaborator_ids: [] as string[],
})

const errors = reactive<Record<string, string>>({})

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    Object.keys(errors).forEach((k) => delete errors[k])
    if (props.mode === 'edit' && props.activity) {
      form.title = props.activity.title
      form.date = props.activity.date
      form.type = props.activity.type
      form.project_id = props.activity.project_id ?? ''
      form.description = props.activity.description ?? ''
      form.time_planned = props.activity.time_planned
      form.time_executed = props.activity.time_executed
      form.is_deviation = props.activity.is_deviation
    } else {
      form.title = ''
      form.date = props.initialDate ?? ''
      form.type = ''
      form.project_id = ''
      form.description = ''
      form.time_planned = 0
      form.time_executed = 0
      form.is_deviation = false
      form.collaborator_ids = []
    }
  }
)

// Desvio de planejamento ignora e zera o tempo planejado
watch(
  () => form.is_deviation,
  (deviation) => {
    if (deviation) form.time_planned = 0
  }
)

const isProjectType = computed(() => form.type === 'Projeto')
const typeLocked = computed(() => props.mode === 'edit' && !props.canFullEdit)
const title = computed(() => (props.mode === 'create' ? 'Nova Atividade' : 'Editar Atividade'))

function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (form.title.trim().length < 3) errors.title = 'O título deve ter pelo menos 3 caracteres'
  if (!form.date) errors.date = 'A data é obrigatória'
  if (!form.type) errors.type = 'O tipo é obrigatório'
  if (isProjectType.value && !form.project_id) errors.project_id = 'Selecione o projeto'
  if (!form.is_deviation && form.time_planned <= 0) errors.time_planned = 'Informe o tempo planejado'
  return Object.keys(errors).length === 0
}

function submit() {
  if (!validate()) return
  emit('submit', {
    title: form.title.trim(),
    date: form.date,
    type: form.type as ActivityType,
    project_id: isProjectType.value ? form.project_id : null,
    description: form.description || null,
    time_planned: form.time_planned,
    time_executed: form.time_executed,
    is_deviation: form.is_deviation,
    ...(props.mode === 'create' && props.isAdmin && form.collaborator_ids.length
      ? { collaborator_ids: form.collaborator_ids }
      : {}),
  })
}
</script>

<template>
  <AppModal :model-value="modelValue" :title="title" @update:model-value="emit('update:modelValue', $event)">
    <form class="space-y-4" @submit.prevent="submit">
      <BaseInput v-model="form.title" label="Título *" placeholder="O que será feito?" :error="errors.title" />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label class="text-sm font-medium">Data *</label>
          <input
            v-model="form.date"
            type="date"
            class="h-10 w-full rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            :class="errors.date ? 'border-destructive focus-visible:ring-destructive/50' : 'border-input focus-visible:ring-primary/50'"
          />
          <p v-if="errors.date" class="text-sm font-medium text-destructive">{{ errors.date }}</p>
          <p v-else-if="!canFullEdit && mode === 'edit'" class="text-xs text-muted-foreground">
            Você pode mover apenas dentro da própria semana.
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium">Tipo *</label>
          <select
            v-model="form.type"
            :disabled="typeLocked"
            class="h-10 w-full rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            :class="errors.type ? 'border-destructive focus-visible:ring-destructive/50' : 'border-input focus-visible:ring-primary/50'"
          >
            <option value="" disabled>Selecione…</option>
            <option v-for="t in ACTIVITY_TYPES" :key="t" :value="t">{{ t }}</option>
          </select>
          <p v-if="errors.type" class="text-sm font-medium text-destructive">{{ errors.type }}</p>
        </div>
      </div>

      <div v-if="isProjectType" class="space-y-1.5">
        <label class="text-sm font-medium">Projeto *</label>
        <select
          v-model="form.project_id"
          :disabled="typeLocked"
          class="h-10 w-full rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          :class="errors.project_id ? 'border-destructive focus-visible:ring-destructive/50' : 'border-input focus-visible:ring-primary/50'"
        >
          <option value="" disabled>Selecione o projeto…</option>
          <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.abbreviation }} — {{ p.name }}</option>
        </select>
        <p v-if="errors.project_id" class="text-sm font-medium text-destructive">{{ errors.project_id }}</p>
      </div>

      <div v-if="mode === 'create' && isAdmin && persons.length" class="space-y-1.5">
        <label class="text-sm font-medium">Colaboradores (replica a atividade)</label>
        <div class="flex max-h-28 flex-wrap gap-2 overflow-y-auto rounded-md border border-input p-2">
          <label
            v-for="person in persons"
            :key="person.id"
            class="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs transition-colors has-checked:border-primary has-checked:bg-primary/10"
          >
            <input v-model="form.collaborator_ids" type="checkbox" :value="person.id" class="accent-primary" />
            {{ person.name }}
          </label>
        </div>
      </div>

      <MarkdownField v-model="form.description" label="Descrição (Markdown)" />

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TimeField
          v-model="form.time_planned"
          :label="form.is_deviation ? 'Tempo Planejado (desvio)' : 'Tempo Planejado *'"
          :disabled="form.is_deviation"
          :error="errors.time_planned"
        />
        <TimeField v-model="form.time_executed" label="Tempo Executado" />
      </div>

      <label class="flex cursor-pointer items-center gap-2 text-sm">
        <input v-model="form.is_deviation" type="checkbox" class="h-4 w-4 accent-primary" />
        Desvio de planejamento
        <span class="text-xs text-muted-foreground">(zera o tempo planejado)</span>
      </label>

      <div class="flex justify-end gap-2 pt-2">
        <BaseButton variant="outline" @click="emit('update:modelValue', false)">Cancelar</BaseButton>
        <BaseButton type="submit" :is-loading="isSaving">
          {{ mode === 'create' ? 'Criar' : 'Salvar' }}
        </BaseButton>
      </div>
    </form>
  </AppModal>
</template>
