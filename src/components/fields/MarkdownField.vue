<script setup lang="ts">
import { computed, ref } from 'vue'
import { Bold, Check, Code, Copy, Eye, Heading2, Italic, Link2, List, Maximize2, Pencil, X } from 'lucide-vue-next'
import { renderMarkdown } from '@/lib/markdown'

// Campo de descrição em Markdown (seção 8 do Contexto-geral):
// texto livre sem limite, toolbar de formatação, prévia, ampliar e copiar tudo.
const props = defineProps<{
  modelValue: string
  label?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const textarea = ref<HTMLTextAreaElement>()
const showPreview = ref(false)
const expanded = ref(false)
const copied = ref(false)

const rendered = computed(() => renderMarkdown(props.modelValue || ''))

function update(value: string) {
  emit('update:modelValue', value)
}

// Insere sintaxe Markdown ao redor da seleção atual
function wrapSelection(prefix: string, suffix = prefix, placeholder = 'texto') {
  const el = textarea.value
  if (!el || props.disabled) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const value = props.modelValue || ''
  const selected = value.slice(start, end) || placeholder
  const next = value.slice(0, start) + prefix + selected + suffix + value.slice(end)
  update(next)
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
  })
}

function prefixLines(prefix: string) {
  const el = textarea.value
  if (!el || props.disabled) return
  const start = el.selectionStart
  const value = props.modelValue || ''
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  update(value.slice(0, lineStart) + prefix + value.slice(lineStart))
  requestAnimationFrame(() => el.focus())
}

async function copyAll() {
  await navigator.clipboard.writeText(props.modelValue || '')
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

const toolbar = [
  { icon: Bold, title: 'Negrito', action: () => wrapSelection('**') },
  { icon: Italic, title: 'Itálico', action: () => wrapSelection('*') },
  { icon: Heading2, title: 'Título', action: () => prefixLines('## ') },
  { icon: List, title: 'Lista', action: () => prefixLines('- ') },
  { icon: Link2, title: 'Link', action: () => wrapSelection('[', '](url)', 'texto do link') },
  { icon: Code, title: 'Código', action: () => wrapSelection('`') },
]
</script>

<template>
  <div class="w-full space-y-1.5" :class="expanded ? 'fixed inset-0 z-[60] flex flex-col bg-background p-4' : ''">
    <div class="flex items-center justify-between">
      <label class="text-sm font-medium text-foreground">{{ label || 'Descrição' }}</label>
      <div class="flex items-center gap-0.5">
        <button
          v-for="tool in toolbar"
          :key="tool.title"
          type="button"
          class="hidden rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:block"
          :title="tool.title"
          :disabled="disabled || showPreview"
          @click="tool.action()"
        >
          <component :is="tool.icon" class="h-4 w-4" />
        </button>
        <span class="mx-1 hidden h-4 w-px bg-border sm:block"></span>
        <button
          type="button"
          class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          :title="showPreview ? 'Editar' : 'Prévia'"
          @click="showPreview = !showPreview"
        >
          <Pencil v-if="showPreview" class="h-4 w-4" />
          <Eye v-else class="h-4 w-4" />
        </button>
        <button
          type="button"
          class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Copiar texto inteiro"
          @click="copyAll"
        >
          <Check v-if="copied" class="h-4 w-4 text-success" />
          <Copy v-else class="h-4 w-4" />
        </button>
        <button
          type="button"
          class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          :title="expanded ? 'Fechar visão ampliada' : 'Ampliar'"
          @click="expanded = !expanded"
        >
          <X v-if="expanded" class="h-4 w-4" />
          <Maximize2 v-else class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div
      v-if="showPreview"
      class="markdown-body overflow-y-auto rounded-md border border-input bg-background px-3 py-2 text-sm"
      :class="expanded ? 'flex-1' : 'min-h-24 max-h-64'"
      v-html="rendered"
    ></div>
    <textarea
      v-else
      ref="textarea"
      :value="modelValue"
      :disabled="disabled"
      placeholder="Texto livre com suporte a Markdown…"
      class="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      :class="expanded ? 'flex-1 resize-none' : 'min-h-24'"
      @input="update(($event.target as HTMLTextAreaElement).value)"
    ></textarea>
  </div>
</template>

<style>
/* Estilo mínimo para o HTML renderizado do Markdown (escopo global: v-html) */
.markdown-body h1,
.markdown-body h2,
.markdown-body h3 {
  font-weight: 700;
  margin: 0.5em 0 0.25em;
}
.markdown-body ul,
.markdown-body ol {
  list-style: revert;
  padding-left: 1.25rem;
  margin: 0.25em 0;
}
.markdown-body a {
  color: hsl(var(--primary));
  text-decoration: underline;
}
.markdown-body code {
  background: hsl(var(--muted));
  border-radius: 0.25rem;
  padding: 0.1em 0.3em;
  font-size: 0.85em;
}
.markdown-body pre code {
  display: block;
  padding: 0.5rem;
  overflow-x: auto;
}
.markdown-body p {
  margin: 0.25em 0;
}
</style>
