<script setup>
import { computed, ref, watch } from 'vue'
import { getPropertyTooltip } from '@/data/fhirPropertyTooltips'

const props = defineProps({
  nodeKey: {
    type: String,
    required: true,
  },
  nodeValue: {
    type: null,
    required: true,
  },
  level: {
    type: Number,
    default: 0,
  },
  resourceType: {
    type: String,
    default: '',
  },
  path: {
    type: String,
    default: 'root',
  },
  selectedPath: {
    type: String,
    default: '',
  },
  treeControlMode: {
    type: String,
    default: '',
  },
  treeControlToken: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['select-node'])

const isObject = (value) => value !== null && typeof value === 'object'
const isArray = (value) => Array.isArray(value)
const asEntries = (value) => {
  if (!isObject(value)) {
    return []
  }
  return isArray(value)
    ? value.map((entry, index) => [String(index), entry])
    : Object.entries(value)
}

const tooltip = computed(() => getPropertyTooltip(props.resourceType, props.nodeKey))
const hasChildren = computed(() => isObject(props.nodeValue) && asEntries(props.nodeValue).length > 0)
const isExpanded = ref(props.level < 2)
const isSelected = computed(() => props.selectedPath && props.selectedPath === props.path)

watch(
  () => [props.treeControlToken, props.treeControlMode],
  () => {
    if (!hasChildren.value) {
      return
    }

    if (props.treeControlMode === 'expand') {
      isExpanded.value = true
      return
    }

    if (props.treeControlMode === 'collapse') {
      isExpanded.value = false
    }
  },
)

function toggleExpand() {
  if (!hasChildren.value) {
    return
  }
  isExpanded.value = !isExpanded.value
}

function childPath(childKey) {
  if (props.path === 'root') {
    return String(childKey)
  }

  if (/^\d+$/.test(String(childKey))) {
    return `${props.path}[${childKey}]`
  }

  return `${props.path}.${childKey}`
}

function selectNode() {
  emit('select-node', {
    path: props.path,
    key: props.nodeKey,
    value: props.nodeValue,
    tooltip: tooltip.value,
    kind: isArray(props.nodeValue) ? 'Array' : isObject(props.nodeValue) ? 'Object' : typeof props.nodeValue,
  })
}

function emitSelectNode(payload) {
  emit('select-node', payload)
}
</script>

<template>
  <li class="tree-node" :style="{ '--level': String(level) }">
    <div class="node-row" :class="{ selected: isSelected }" @click="selectNode">
      <button
        v-if="hasChildren"
        type="button"
        class="toggle-btn"
        :title="isExpanded ? 'Collapse node' : 'Expand node'"
        @click.stop="toggleExpand"
      >
        {{ isExpanded ? '▾' : '▸' }}
      </button>
      <span v-else class="toggle-placeholder" />

      <span :title="tooltip" class="node-key" :class="{ 'has-tooltip': tooltip }">
        {{ nodeKey }}
      </span>
      <span v-if="tooltip" class="help-dot" :title="tooltip">?</span>
      <span v-if="!isObject(nodeValue)" class="node-value">{{ String(nodeValue) }}</span>
      <span v-else class="node-kind">{{ isArray(nodeValue) ? 'Array' : 'Object' }}</span>
    </div>

    <ul v-if="hasChildren && isExpanded" class="node-children">
      <ResourceTreeNode
        v-for="([childKey, childValue], index) in asEntries(nodeValue)"
        :key="`${path}-${childKey}-${index}`"
        :node-key="childKey"
        :node-value="childValue"
        :level="level + 1"
        :resource-type="resourceType"
        :path="childPath(childKey)"
        :selected-path="selectedPath"
        :tree-control-mode="treeControlMode"
        :tree-control-token="treeControlToken"
        @select-node="emitSelectNode"
      />
    </ul>
  </li>
</template>

<style scoped>
.tree-node {
  list-style: none;
  margin-left: calc(var(--level) * 0.5rem);
}

.node-row {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.2rem 0;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
}

.node-row.selected {
  background: var(--color-background-mute);
}

.toggle-btn,
.toggle-placeholder {
  width: 1rem;
  min-width: 1rem;
}

.toggle-btn {
  border: none;
  background: transparent;
  color: var(--color-text-soft);
  padding: 0;
  line-height: 1;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.node-self:hover {
  background: var(--c-bg-app);
}

.node-self.selected {
  background: var(--c-accent-light);
  color: var(--c-accent);
}

.node-key {
  font-weight: 600;
  color: var(--c-text-primary);
  font-family: 'Menlo', monospace;
  font-size: 0.85rem;
}

.help-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--c-border);
  font-size: 0.65rem;
  color: var(--c-text-secondary);
  margin-left: 0.35rem;
}

.node-value {
  color: var(--c-text-secondary);
  margin-left: 0.5rem;
}

.node-children {
  padding-left: 1.25rem;
  border-left: 1px solid var(--c-border);
  margin-left: 0.5rem;
}
</style>
