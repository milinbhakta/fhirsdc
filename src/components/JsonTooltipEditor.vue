<script setup>
import { onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'
import * as monaco from 'monaco-editor'
import { getPropertyTooltip } from '@/data/fhirPropertyTooltips'
import { schemas, knownExtensionUrls, constraintExtensionKeys } from '@/data/fhirJsonSchema'

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  resourceType: {
    type: String,
    default: '',
  },
  minHeight: {
    type: Number,
    default: 280,
  },
})

const emit = defineEmits(['update:modelValue'])

const containerRef = ref(null)
let editor = null
let completionDisposable = null
let hoverDisposable = null
let ignoreNextWatch = false

// ─── JSON Path Analysis ──────────────────────────────────────────────

/**
 * Build the nesting path by bracket-counting with proper string skipping.
 */
function getJsonPath(text) {
  const stack = []
  let i = 0
  let lastKey = null

  while (i < text.length) {
    const ch = text[i]

    if (ch === '"') {
      i++
      const strStart = i
      while (i < text.length) {
        if (text[i] === '\\') { i += 2; continue }
        if (text[i] === '"') break
        i++
      }
      const strContent = text.substring(strStart, i)
      if (i < text.length) i++

      let j = i
      while (j < text.length && ' \t\n\r'.includes(text[j])) j++
      if (j < text.length && text[j] === ':') {
        lastKey = strContent
      }
    } else if (ch === '{') {
      stack.push({ key: lastKey, type: 'object' })
      lastKey = null
      i++
    } else if (ch === '[') {
      stack.push({ key: lastKey, type: 'array' })
      lastKey = null
      i++
    } else if (ch === '}' || ch === ']') {
      stack.pop()
      lastKey = null
      i++
    } else if (ch === ',') {
      lastKey = null
      i++
    } else {
      i++
    }
  }

  return stack.map(s => s.key).filter(Boolean)
}

function getSchemaAtPath(resourceType, path) {
  const rootSchema = schemas[resourceType]
  if (!rootSchema) return null

  let schema = rootSchema
  for (const key of path) {
    if (!schema) return null
    const prop = schema[key]
    if (!prop) return null
    if (prop.children) {
      schema = prop.children
    } else {
      return null
    }
  }
  return schema
}

// ─── Smart Context Helpers ───────────────────────────────────────────

const typeRestrictedProps = {
  answerOption: new Set(['choice', 'open-choice']),
  answerValueSet: new Set(['choice', 'open-choice']),
  maxLength: new Set(['string', 'text', 'url']),
}

function getCurrentItemType(text) {
  let depth = 0
  let objStart = -1
  for (let i = text.length - 1; i >= 0; i--) {
    const ch = text[i]
    if (ch === '}' || ch === ']') depth++
    else if (ch === '{' || ch === '[') {
      if (depth === 0 && ch === '{') { objStart = i; break }
      depth--
    }
  }
  if (objStart === -1) return null

  const objText = text.substring(objStart, Math.min(text.length, objStart + 3000))
  let d = 0, j = 0
  while (j < objText.length) {
    const ch = objText[j]
    if (ch === '"') {
      j++
      const start = j
      while (j < objText.length) {
        if (objText[j] === '\\') { j += 2; continue }
        if (objText[j] === '"') break
        j++
      }
      const str = objText.substring(start, j)
      j++
      if (d === 1 && str === 'type') {
        while (j < objText.length && ' \t\n\r'.includes(objText[j])) j++
        if (j < objText.length && objText[j] === ':') {
          j++
          while (j < objText.length && ' \t\n\r'.includes(objText[j])) j++
          if (j < objText.length && objText[j] === '"') {
            j++
            const valStart = j
            while (j < objText.length && objText[j] !== '"') j++
            return objText.substring(valStart, j)
          }
        }
      }
    } else if (ch === '{' || ch === '[') { d++; j++ }
    else if (ch === '}' || ch === ']') { d--; j++; if (d <= 0) break }
    else j++
  }
  return null
}

function getExistingKeys(text) {
  let depth = 0
  let objStart = -1
  for (let i = text.length - 1; i >= 0; i--) {
    const ch = text[i]
    if (ch === '}' || ch === ']') depth++
    else if (ch === '{' || ch === '[') {
      if (depth === 0 && ch === '{') { objStart = i; break }
      depth--
    }
  }
  if (objStart === -1) return new Set()

  const keys = new Set()
  const objText = text.substring(objStart, Math.min(text.length, objStart + 5000))
  let d = 0, j = 0
  while (j < objText.length) {
    const ch = objText[j]
    if (ch === '"') {
      j++
      const start = j
      while (j < objText.length) {
        if (objText[j] === '\\') { j += 2; continue }
        if (objText[j] === '"') break
        j++
      }
      const str = objText.substring(start, j)
      j++
      if (d === 1) {
        let k = j
        while (k < objText.length && ' \t\n\r'.includes(objText[k])) k++
        if (k < objText.length && objText[k] === ':') keys.add(str)
      }
    } else if (ch === '{' || ch === '[') { d++; j++ }
    else if (ch === '}' || ch === ']') { d--; j++; if (d <= 0) break }
    else j++
  }
  return keys
}

// ─── Monaco Autocomplete Provider ───────────────────────────────────

function detectKeyOrValue(textBeforeQuote) {
  const trimmed = textBeforeQuote.trimEnd()
  if (!trimmed.length) return { position: 'key', currentKey: null }

  const lastChar = trimmed[trimmed.length - 1]

  if (lastChar === ':') {
    const keyMatch = trimmed.match(/"([^"]+)"\s*:$/)
    if (keyMatch) return { position: 'value', currentKey: keyMatch[1] }
    return { position: 'value', currentKey: null }
  }

  return { position: 'key', currentKey: null }
}

function createInsertText(key, prop) {
  if (prop.type === 'array' && prop.children && Object.keys(prop.children).length > 0) {
    return `${key}": [\\n\\t{\\n\\t\\t"$0`
  }
  if (prop.type === 'array') return `${key}": [$0`
  if (prop.type === 'object' && prop.children) {
    return `${key}": {\\n\\t"$0`
  }
  if (prop.type === 'object') return `${key}": {$0`
  if (prop.type === 'boolean') return `${key}": $0`
  if (prop.type === 'number') return `${key}": $0`
  return `${key}": "$0`
}

function registerCompletionProvider() {
  if (completionDisposable) completionDisposable.dispose()

  completionDisposable = monaco.languages.registerCompletionItemProvider('json', {
    triggerCharacters: ['"', ':', '{', ',', ' '],

    provideCompletionItems(model, position) {
      const resourceType = props.resourceType
      if (!schemas[resourceType]) return { suggestions: [] }

      try {
        const offset = model.getOffsetAt(position)
        const fullText = model.getValue()
        const textBefore = fullText.substring(0, offset)
        const path = getJsonPath(textBefore)

        const lineContent = model.getLineContent(position.lineNumber)
        const colIdx = position.column - 1

        // Check if we're inside a quoted string
        let inQuote = false
        let quoteStart = -1
        for (let i = 0; i < colIdx; i++) {
          if (lineContent[i] === '"' && (i === 0 || lineContent[i - 1] !== '\\')) {
            inQuote = !inQuote
            if (inQuote) quoteStart = i
          }
        }

        if (!inQuote) {
          // Not inside quotes — check for boolean/number enum values after colon
          const trimmedLine = lineContent.substring(0, colIdx).trimEnd()
          if (trimmedLine.endsWith(':')) {
            const keyMatch = trimmedLine.match(/"([^"]+)"\s*:$/)
            if (keyMatch) {
              const currentKey = keyMatch[1]
              const schema = getSchemaAtPath(resourceType, path)
              if (schema) {
                const prop = schema[currentKey]
                if (prop?.enum && (prop.type === 'boolean' || prop.type === 'number')) {
                  return {
                    suggestions: prop.enum.map((val, i) => ({
                      label: String(val),
                      kind: monaco.languages.CompletionItemKind.Value,
                      insertText: ` ${String(val)}`,
                      detail: `${currentKey} value`,
                      sortText: String(i).padStart(3, '0'),
                      range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                    })),
                  }
                }
              }
            }
          }
          return { suggestions: [] }
        }

        // We're inside a quoted string — figure out key vs value
        const textBeforeQuote = lineContent.substring(0, quoteStart)
        const { position: posType, currentKey } = detectKeyOrValue(textBeforeQuote)

        const typed = lineContent.substring(quoteStart + 1, colIdx)
        const wordRange = new monaco.Range(
          position.lineNumber, quoteStart + 2,
          position.lineNumber, position.column,
        )

        if (posType === 'value' && currentKey) {
          return { suggestions: getValueSuggestions(currentKey, path, typed, wordRange, textBefore, resourceType) }
        }

        return { suggestions: getKeySuggestions(path, typed, wordRange, textBefore, resourceType) }
      } catch {
        return { suggestions: [] }
      }
    },
  })
}

function getKeySuggestions(path, typed, range, textBefore, resourceType) {
  const schema = getSchemaAtPath(resourceType, path)
  if (!schema) return []

  const existingKeys = getExistingKeys(textBefore)
  const isDirectItemLevel = path.length > 0 && path[path.length - 1] === 'item'
  const currentType = isDirectItemLevel ? getCurrentItemType(textBefore) : null

  return Object.entries(schema)
    .filter(([key]) => !existingKeys.has(key))
    .filter(([key]) => {
      if (!currentType || !typeRestrictedProps[key]) return true
      return typeRestrictedProps[key].has(currentType)
    })
    .filter(([key]) => !typed || key.toLowerCase().startsWith(typed.toLowerCase()))
    .map(([key, prop]) => {
      let sortPrefix = '5'

      if (isDirectItemLevel) {
        if (key === 'linkId' || key === 'text' || key === 'type') sortPrefix = '0'
        if (key === 'required') sortPrefix = '1'
      }

      if (currentType === 'choice' || currentType === 'open-choice') {
        if (key === 'answerOption' || key === 'answerValueSet') sortPrefix = '0'
        if (key === 'repeats') sortPrefix = '2'
      } else if (currentType === 'group') {
        if (key === 'item') sortPrefix = '0'
      } else if (currentType === 'string' || currentType === 'text' || currentType === 'url') {
        if (key === 'maxLength') sortPrefix = '1'
      }

      let detail = prop.description || ''
      if (detail.length > 80) detail = detail.slice(0, 80) + '…'

      if (currentType && typeRestrictedProps[key]) {
        const types = [...typeRestrictedProps[key]].join('/')
        detail = `[${types}] ${detail}`
      }

      const insertText = createInsertText(key, prop)

      return {
        label: key,
        kind: monaco.languages.CompletionItemKind.Property,
        insertText,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail,
        documentation: prop.description || '',
        sortText: `${sortPrefix}_${key}`,
        range,
      }
    })
}

function getValueSuggestions(currentKey, path, typed, range, textBefore, resourceType) {
  // Extension URLs
  if (currentKey === 'url' && path.some(p => p === 'extension')) {
    return knownExtensionUrls
      .filter(e => !typed || e.url.toLowerCase().includes(typed.toLowerCase()))
      .map((e, i) => ({
        label: e.url,
        kind: monaco.languages.CompletionItemKind.Value,
        insertText: e.url,
        detail: e.description,
        sortText: String(i).padStart(3, '0'),
        range,
      }))
  }

  // Constraint extension sub-keys
  if (currentKey === 'url' && textBefore.includes('questionnaire-constraint')) {
    return constraintExtensionKeys
      .filter(e => !typed || e.url.toLowerCase().startsWith(typed.toLowerCase()))
      .map((e, i) => ({
        label: e.url,
        kind: monaco.languages.CompletionItemKind.Value,
        insertText: e.url,
        detail: e.description,
        sortText: String(i).padStart(3, '0'),
        range,
      }))
  }

  // Enum values from schema
  const schema = getSchemaAtPath(resourceType, path)
  if (!schema) return []

  const prop = schema[currentKey]
  if (!prop?.enum) return []

  return prop.enum
    .filter(val => !typed || String(val).toLowerCase().startsWith(typed.toLowerCase()))
    .map((val, i) => ({
      label: String(val),
      kind: monaco.languages.CompletionItemKind.EnumMember,
      insertText: String(val),
      detail: `${currentKey} value`,
      sortText: String(i).padStart(3, '0'),
      range,
    }))
}

// ─── Monaco Hover Provider ──────────────────────────────────────────

const jsonKeyRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"\s*:/g

function registerHoverProvider() {
  if (hoverDisposable) hoverDisposable.dispose()

  hoverDisposable = monaco.languages.registerHoverProvider('json', {
    provideHover(model, position) {
      const lineText = model.getLineContent(position.lineNumber)
      const col = position.column - 1
      jsonKeyRegex.lastIndex = 0

      let match = jsonKeyRegex.exec(lineText)
      while (match) {
        const keyStart = match.index
        const keyEnd = keyStart + match[0].length

        if (col >= keyStart && col <= keyEnd) {
          const key = match[1]
          const tooltipText = getPropertyTooltip(props.resourceType, key)
          if (tooltipText) {
            return {
              range: new monaco.Range(
                position.lineNumber, keyStart + 1,
                position.lineNumber, keyStart + key.length + 3,
              ),
              contents: [
                { value: `**${key}**` },
                { value: tooltipText },
              ],
            }
          }
        }
        match = jsonKeyRegex.exec(lineText)
      }
      return null
    },
  })
}

// ─── Editor Creation ────────────────────────────────────────────────

function getTheme() {
  if (typeof window !== 'undefined') {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim()
    if (bg && (bg.startsWith('#1') || bg.startsWith('#2') || bg.startsWith('#0'))) {
      return 'vs-dark'
    }
  }
  return 'vs'
}

function createEditor() {
  if (!containerRef.value) return

  editor = monaco.editor.create(containerRef.value, {
    value: props.modelValue,
    language: 'json',
    theme: getTheme(),
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 13,
    lineNumbers: 'on',
    tabSize: 2,
    wordWrap: 'on',
    formatOnPaste: false,
    formatOnType: false,
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    bracketPairColorization: { enabled: true },
    suggest: {
      showWords: false,
      snippetsPreventQuickSuggestions: false,
    },
    quickSuggestions: {
      strings: true,
      other: true,
      comments: false,
    },
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
    padding: { top: 8, bottom: 8 },
    renderLineHighlight: 'line',
    folding: true,
    foldingStrategy: 'indentation',
    glyphMargin: false,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
  })

  editor.onDidChangeModelContent(() => {
    if (ignoreNextWatch) return
    ignoreNextWatch = true
    emit('update:modelValue', editor.getValue())
  })

  registerCompletionProvider()
  registerHoverProvider()

  // Format JSON action (Shift+Alt+F)
  editor.addAction({
    id: 'fhir-format-json',
    label: 'Format JSON',
    keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
    run(ed) {
      try {
        const text = ed.getValue()
        const parsed = JSON.parse(text)
        const formatted = JSON.stringify(parsed, null, 2)
        ed.setValue(formatted)
      } catch { /* ignore invalid JSON */ }
    },
  })
}

// ─── Watchers ───────────────────────────────────────────────────────

watch(
  () => props.modelValue,
  (nextValue) => {
    if (!editor) return
    if (ignoreNextWatch) {
      ignoreNextWatch = false
      return
    }
    const current = editor.getValue()
    if (current === nextValue) return

    // External change (e.g. template switch) — replace content preserving undo stack
    const model = editor.getModel()
    editor.pushUndoStop()
    editor.executeEdits('external', [{
      range: model.getFullModelRange(),
      text: nextValue,
    }])
    editor.pushUndoStop()
  },
)

watch(
  () => props.resourceType,
  () => {
    registerCompletionProvider()
    registerHoverProvider()
  },
)

// ─── Lifecycle ──────────────────────────────────────────────────────

onMounted(() => {
  nextTick(() => createEditor())
})

onBeforeUnmount(() => {
  if (completionDisposable) completionDisposable.dispose()
  if (hoverDisposable) hoverDisposable.dispose()
  if (editor) {
    editor.dispose()
    editor = null
  }
})
</script>

<template>
  <div class="json-editor-shell">
    <div ref="containerRef" class="json-editor" :style="{ minHeight: `${minHeight}px` }" />
    <p class="json-editor-hint">
      Hover property keys to see FHIR descriptions. Press <kbd>Ctrl</kbd>+<kbd>Space</kbd> for suggestions.
    </p>
  </div>
</template>

<style scoped>
.json-editor-shell {
  display: grid;
  gap: 0.45rem;
}

.json-editor {
  width: 100%;
  height: 100%;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}

.json-editor-hint {
  color: var(--color-text-soft);
  font-size: 0.84rem;
  margin: 0;
}

.json-editor-hint kbd {
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  padding: 0.05em 0.35em;
  font-size: 0.8em;
  font-family: inherit;
}
</style>
