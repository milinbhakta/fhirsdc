<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, hoverTooltip } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { json } from '@codemirror/lang-json'
import { getPropertyTooltip } from '@/data/fhirPropertyTooltips'

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
    maxHeight: '520px',
    border: '1px solid var(--color-border)',
    borderRadius: '10px',
    backgroundColor: 'var(--color-background)',
    fontSize: '0.9rem',
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

function editorExtensions() {
  return [
    basicSetup,
    json(),
    createTooltipExtension(),
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
