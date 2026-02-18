<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view'
import { autocompletion } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import {
  fhirpathFunctions,
  fhirpathKeywords,
  fhirpathVariables,
  fhirResourceProperties,
} from '@/data/fhirpathCompletions'

const props = defineProps({
  modelValue: { type: String, default: '' },
  resourceType: { type: String, default: '' },
  placeholder: { type: String, default: "e.g. name.where(use='official').given" },
  rows: { type: Number, default: 2 },
})

const emit = defineEmits(['update:modelValue', 'evaluate'])

const containerRef = ref(null)
let editorView = null

function fhirpathCompletionSource(context) {
  // Match word characters, dots, and % for variables
  const word = context.matchBefore(/[%\w.][\w.]*/)
  if (!word && !context.explicit) return null

  const input = (word?.text || '').toLowerCase()
  const options = []

  // After a dot — suggest resource-specific paths and functions
  const dotIndex = input.lastIndexOf('.')
  const afterDot = dotIndex >= 0 ? input.slice(dotIndex + 1) : ''

  // Functions (always available, filtered by afterDot if after a dot, otherwise by full input)
  const filterText = dotIndex >= 0 ? afterDot : input
  for (const fn of fhirpathFunctions) {
    const funcName = fn.label.replace(/\(.*/, '')
    if (!filterText || funcName.toLowerCase().startsWith(filterText)) {
      options.push({
        label: fn.label,
        type: 'function',
        detail: fn.detail,
        section: fn.section,
        boost: fn.label.startsWith(filterText) ? 2 : 0,
      })
    }
  }

  // Resource properties (context-aware)
  if (props.resourceType && fhirResourceProperties[props.resourceType]) {
    const paths = fhirResourceProperties[props.resourceType]
    for (const path of paths) {
      const pathLower = path.toLowerCase()
      if (!input || pathLower.startsWith(input) || pathLower.includes(input)) {
        options.push({
          label: path,
          type: 'property',
          detail: props.resourceType,
          boost: pathLower.startsWith(input) ? 3 : 1,
        })
      }
    }
  } else {
    // Show properties from all resource types
    const seen = new Set()
    for (const [resType, paths] of Object.entries(fhirResourceProperties)) {
      for (const path of paths) {
        if (seen.has(path)) continue
        seen.add(path)
        const pathLower = path.toLowerCase()
        if (!input || pathLower.startsWith(input) || pathLower.includes(input)) {
          options.push({
            label: path,
            type: 'property',
            detail: resType,
            boost: pathLower.startsWith(input) ? 3 : 1,
          })
        }
      }
    }
  }

  // Keywords
  for (const kw of fhirpathKeywords) {
    if (!input || kw.label.toLowerCase().startsWith(input)) {
      options.push({ ...kw, boost: 0 })
    }
  }

  // Variables (when typing %)
  if (input.startsWith('%') || !input) {
    for (const v of fhirpathVariables) {
      if (!input || v.label.toLowerCase().startsWith(input)) {
        options.push({ ...v, boost: input.startsWith('%') ? 4 : -1 })
      }
    }
  }

  return {
    from: word?.from ?? context.pos,
    options,
    validFor: /^[%\w.]*$/,
  }
}

const editorTheme = EditorView.theme({
  '&': {
    fontSize: '0.88rem',
    backgroundColor: 'var(--c-bg-secondary)',
    border: '2px solid var(--c-border)',
    borderRadius: '8px',
  },
  '&.cm-focused': {
    outline: 'none',
    borderColor: 'var(--c-accent)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace",
    lineHeight: '1.5',
  },
  '.cm-content': {
    padding: '0.45rem 0.65rem',
    caretColor: 'var(--c-accent)',
    minHeight: '1.5em',
  },
  '.cm-line': {
    padding: '0',
  },
  '.cm-placeholder': {
    color: 'var(--c-text-tertiary)',
    fontStyle: 'italic',
  },
  '.cm-tooltip.cm-tooltip-autocomplete': {
    border: '1px solid var(--c-border)',
    borderRadius: '8px',
    background: 'var(--c-bg-primary)',
    boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
    overflow: 'hidden',
    fontSize: '0.82rem',
  },
  '.cm-tooltip-autocomplete ul': {
    maxHeight: '220px',
  },
  '.cm-tooltip-autocomplete li': {
    padding: '0.3rem 0.6rem',
  },
  '.cm-tooltip-autocomplete li[aria-selected]': {
    background: 'var(--c-accent)',
    color: '#fff',
  },
  '.cm-completionLabel': {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '0.82rem',
  },
  '.cm-completionDetail': {
    fontStyle: 'normal',
    fontSize: '0.72rem',
    opacity: '0.7',
    marginLeft: '0.6rem',
  },
})

function createEditorState(doc) {
  return EditorState.create({
    doc,
    extensions: [
      history(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        {
          key: 'Enter',
          run: () => {
            emit('evaluate')
            return true
          },
        },
      ]),
      autocompletion({
        override: [fhirpathCompletionSource],
        activateOnTyping: true,
        maxRenderedOptions: 40,
        icons: true,
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          emit('update:modelValue', update.state.doc.toString())
        }
      }),
      EditorView.domEventHandlers({
        blur: () => {
          // Auto-close autocomplete on blur
        },
      }),
      EditorState.allowMultipleSelections.of(false),
      cmPlaceholder(props.placeholder),
      editorTheme,
    ],
  })
}

function createEditor() {
  if (!containerRef.value) return
  editorView = new EditorView({
    parent: containerRef.value,
    state: createEditorState(props.modelValue),
  })
}

watch(
  () => props.modelValue,
  (next) => {
    if (!editorView) return
    const current = editorView.state.doc.toString()
    if (current === next) return
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: next },
    })
  },
)

watch(
  () => props.resourceType,
  () => {
    // Re-instantiate to pick up new resource type completions is not needed
    // since fhirpathCompletionSource reads props.resourceType dynamically
  },
)

onMounted(() => createEditor())
onBeforeUnmount(() => {
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
})
</script>

<template>
  <div ref="containerRef" class="fp-cm-editor" />
</template>

<style scoped>
.fp-cm-editor {
  width: 100%;
}
</style>
