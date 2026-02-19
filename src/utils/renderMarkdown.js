import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'

// Register only the languages we need (keeps bundle small)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)

// Configure marked with highlight.js for fenced code blocks
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch {
        /* fall through */
      }
    }
    // Auto-detect if no language specified
    try {
      return hljs.highlightAuto(code).value
    } catch {
      /* fall through */
    }
    return code
  },
})

/**
 * Render a Markdown string to safe HTML.
 * Used by learning modules, quiz explanations, etc.
 */
export function renderMarkdown(md) {
  if (!md) return ''
  return marked.parse(md)
}
