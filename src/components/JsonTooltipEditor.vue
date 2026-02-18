<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, hoverTooltip } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { json } from '@codemirror/lang-json'
import { autocompletion } from '@codemirror/autocomplete'
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
let editorView = null

const jsonKeyRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"\s*:/g

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    maxHeight: 'none',
    border: 'none',
    borderRadius: '0',
    backgroundColor: 'var(--c-bg-pane)',
    fontSize: '0.85rem',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  },
  '.cm-content': {
    padding: '0.75rem',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--color-background-mute)',
  },
  '.cm-tooltip': {
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    background: 'var(--color-background)',
    color: 'var(--color-text)',
  },
})

function minHeightTheme() {
  return EditorView.theme({
    '&': {
      minHeight: `${props.minHeight}px`,
    },
  })
}

function keyAtPosition(lineText, columnIndex) {
  jsonKeyRegex.lastIndex = 0
  let match = jsonKeyRegex.exec(lineText)

  while (match) {
    const keyStart = match.index
    const keyEnd = keyStart + match[0].length

    if (columnIndex >= keyStart && columnIndex <= keyEnd) {
      return {
        key: match[1],
        from: keyStart,
        to: keyStart + match[1].length + 2,
      }
    }

    match = jsonKeyRegex.exec(lineText)
  }

  return null
}

/**
 * Build the nesting path by bracket-counting with proper string skipping.
 * Returns the property path (e.g. ['item'] when inside an item array element).
 */
function getJsonPath(doc, pos) {
  const text = doc.sliceString(0, pos)
  const stack = [] // { key: string|null, type: 'object'|'array' }
  let i = 0
  let lastKey = null

  while (i < text.length) {
    const ch = text[i]

    if (ch === '"') {
      // Skip entire string, determine if it's a key
      i++ // past opening quote
      const strStart = i
      while (i < text.length) {
        if (text[i] === '\\') { i += 2; continue } // skip escaped chars
        if (text[i] === '"') break
        i++
      }
      const strContent = text.substring(strStart, i)
      if (i < text.length) i++ // past closing quote

      // Check if followed by colon → this string is a key
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

/**
 * Walk the FHIR schema tree following the path to get the schema at the cursor's nesting level.
 */
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

/**
 * Main completion source. Determines position (key vs value) using the text
 * immediately before the matched token, then delegates to key or value completions.
 */
function fhirJsonCompletion(context) {
  if (!schemas[props.resourceType]) return null

  try {
    const path = getJsonPath(context.state.doc, context.pos)

    // Try matching a quoted string token (most common JSON editing scenario)
    const beforeQuoted = context.matchBefore(/"[\w:/.\-]*$/)

    if (beforeQuoted) {
      // Determine if this quoted string is a key or a value
      // by checking the last significant character before the opening quote
      const textBeforeQuote = context.state.doc.sliceString(
        Math.max(0, beforeQuoted.from - 200), beforeQuoted.from,
      )
      const trimmed = textBeforeQuote.trimEnd()
      const lastChar = trimmed.length > 0 ? trimmed[trimmed.length - 1] : ''

      if (lastChar === ':') {
        // VALUE position — find the key name
        const keyMatch = trimmed.match(/"([^"]+)"\s*:$/)
        if (keyMatch) {
          return getValueCompletions(context, keyMatch[1], path)
        }
        return null
      }

      // KEY position (after {, comma, [, or start of document)
      return getKeyCompletions(context, path, beforeQuoted)
    }

    // Fallback: match bare word characters (typing without opening quote)
    const beforeWord = context.matchBefore(/[a-zA-Z]\w*$/)
    if (beforeWord) {
      return getKeyCompletions(context, path, null, beforeWord)
    }

    // Ctrl+Space explicit completion
    if (context.explicit) {
      return getKeyCompletions(context, path, null, null)
    }

    return null
  } catch {
    return null
  }
}

/**
 * Provide key completions at the current schema path.
 * @param {object} context - CodeMirror completion context
 * @param {string[]} path - Current nesting path
 * @param {object|null} quotedMatch - Match from /"[\w]*$/ (cursor inside quotes)
 * @param {object|null} wordMatch - Match from /[a-zA-Z]\w*$/ (cursor typing bare word)
 */
function getKeyCompletions(context, path, quotedMatch, wordMatch) {
  const schema = getSchemaAtPath(props.resourceType, path)
  if (!schema) return null

  const typed = quotedMatch
    ? quotedMatch.text.replace(/^"/, '')
    : (wordMatch ? wordMatch.text : '')

  const options = Object.entries(schema)
    .filter(([key]) => !typed || key.toLowerCase().startsWith(typed.toLowerCase()))
    .map(([key, prop]) => ({
      label: key,
      type: 'property',
      detail: prop.description
        ? (prop.description.length > 55 ? prop.description.slice(0, 55) + '…' : prop.description)
        : '',
      boost: typed && key.toLowerCase().startsWith(typed.toLowerCase()) ? 2 : 0,
      apply: createKeyApply(key, prop),
    }))

  if (!options.length) return null

  let from
  if (quotedMatch) {
    from = quotedMatch.from + 1 // after the opening quote
  } else if (wordMatch) {
    from = wordMatch.from
  } else {
    from = context.pos
  }

  return { from, options, validFor: /^[\w]*$/ }
}

function createKeyApply(key, prop) {
  if (prop.type === 'array') return `${key}": [`
  if (prop.type === 'object') return `${key}": {`
  if (prop.type === 'boolean') return `${key}": `
  if (prop.type === 'number') return `${key}": `
  return `${key}": "`
}

/**
 * Provide value completions for enum properties, extension URLs, and constraint keys.
 */
function getValueCompletions(context, currentKey, path) {
  const beforeQuoted = context.matchBefore(/"[\w:/.\-]*$/)

  // Extension URLs
  if (currentKey === 'url' && path.some(p => p === 'extension')) {
    const typed = beforeQuoted ? beforeQuoted.text.replace(/^"/, '') : ''
    const options = knownExtensionUrls
      .filter(e => !typed || e.url.toLowerCase().includes(typed.toLowerCase()))
      .map(e => ({
        label: e.url,
        type: 'text',
        detail: e.description,
        boost: e.url.toLowerCase().includes(typed.toLowerCase()) ? 2 : 0,
      }))
    if (!options.length) return null
    return {
      from: beforeQuoted ? beforeQuoted.from + 1 : context.pos,
      options,
      validFor: /^[\w:/.\-]*$/,
    }
  }

  // Constraint extension sub-keys
  if (currentKey === 'url') {
    const textBefore = context.state.doc.sliceString(Math.max(0, context.pos - 600), context.pos)
    if (textBefore.includes('questionnaire-constraint')) {
      const typed = beforeQuoted ? beforeQuoted.text.replace(/^"/, '') : ''
      const options = constraintExtensionKeys
        .filter(e => !typed || e.url.toLowerCase().startsWith(typed.toLowerCase()))
        .map(e => ({
          label: e.url,
          type: 'text',
          detail: e.description,
          boost: 2,
        }))
      if (options.length) {
        return {
          from: beforeQuoted ? beforeQuoted.from + 1 : context.pos,
          options,
          validFor: /^[\w]*$/,
        }
      }
    }
  }

  // Enum values from schema
  const schema = getSchemaAtPath(props.resourceType, path)
  if (!schema) return null

  const prop = schema[currentKey]
  if (!prop?.enum) return null

  const typed = beforeQuoted ? beforeQuoted.text.replace(/^"/, '') : ''
  const options = prop.enum
    .map(val => ({ label: String(val), type: 'enum', boost: 2 }))
    .filter(opt => !typed || opt.label.toLowerCase().startsWith(typed.toLowerCase()))

  if (!options.length) return null

  if (prop.type === 'boolean' || prop.type === 'number') {
    const wordBefore = context.matchBefore(/[\w]*$/)
    return {
      from: wordBefore ? wordBefore.from : context.pos,
      options,
      validFor: /^[\w]*$/,
    }
  }

  return {
    from: beforeQuoted ? beforeQuoted.from + 1 : context.pos,
    options,
    validFor: /^[\w\-]*$/,
  }
}

function editorExtensions() {
  return [
    basicSetup,
    json(),
    createTooltipExtension(),
    autocompletion({
      override: [fhirJsonCompletion],
      activateOnTyping: true,
      maxRenderedOptions: 30,
    }),
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        emit('update:modelValue', update.state.doc.toString())
      }
    }),
    editorTheme,
    minHeightTheme(),
  ]
}

function createTooltipExtension() {
  return hoverTooltip((view, pos) => {
    const line = view.state.doc.lineAt(pos)
    const lineText = line.text
    const columnIndex = pos - line.from
    const found = keyAtPosition(lineText, columnIndex)

    if (!found) {
      return null
    }

    const tooltipText = getPropertyTooltip(props.resourceType, found.key)
    if (!tooltipText) {
      return null
    }

    const from = line.from + found.from
    const to = line.from + found.to

    return {
      pos: from,
      end: to,
      above: true,
      create() {
        const dom = document.createElement('div')
        dom.className = 'json-key-tooltip'

        const title = document.createElement('strong')
        title.textContent = found.key

        const description = document.createElement('p')
        description.textContent = tooltipText

        dom.appendChild(title)
        dom.appendChild(description)

        return { dom }
      },
    }
  })
}

function createEditor() {
  if (!containerRef.value) {
    return
  }

  editorView = new EditorView({
    parent: containerRef.value,
    state: EditorState.create({
      doc: props.modelValue,
      extensions: editorExtensions(),
    }),
  })
}

watch(
  () => props.modelValue,
  (nextValue) => {
    if (!editorView) {
      return
    }

    const current = editorView.state.doc.toString()
    if (current === nextValue) {
      return
    }

    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: nextValue,
      },
    })
  },
)

watch(
  () => props.resourceType,
  () => {
    if (!editorView) {
      return
    }

    const currentText = editorView.state.doc.toString()
    editorView.setState(
      EditorState.create({
        doc: currentText,
        extensions: editorExtensions(),
      }),
    )
  },
)

onMounted(() => {
  createEditor()
})

onBeforeUnmount(() => {
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
})
</script>

<template>
  <div class="json-editor-shell">
    <div ref="containerRef" class="json-editor" />
    <p class="json-editor-hint">
      Hover property keys inside this JSON editor to see FHIR descriptions.
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
}

.json-editor-hint {
  color: var(--color-text-soft);
  font-size: 0.84rem;
}
</style>

<style>
.json-key-tooltip {
  max-width: 320px;
  padding: 0.55rem 0.65rem;
  display: grid;
  gap: 0.25rem;
}

.json-key-tooltip strong {
  font-size: 0.86rem;
}

.json-key-tooltip p {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.35;
}
</style>
