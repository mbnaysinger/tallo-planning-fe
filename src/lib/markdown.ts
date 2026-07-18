import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const md = new MarkdownIt({
  html: false, // nunca interpreta HTML embutido no texto do usuário
  linkify: true,
  breaks: true,
})

// Links externos sempre em nova aba, sem vazamento de opener
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

// Renderiza Markdown do usuário em HTML seguro (sanitizado — obrigatório antes de v-html)
export function renderMarkdown(source: string): string {
  return DOMPurify.sanitize(md.render(source))
}

// Texto puro para o preview do card (sem tags, quebras colapsadas)
export function stripMarkdown(source: string): string {
  const html = md.render(source)
  const doc = new DOMParser().parseFromString(DOMPurify.sanitize(html), 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}
