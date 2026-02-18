<script setup>
import { computed } from 'vue'
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
})

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
</script>

<template>
  <li class="tree-node" :style="{ '--level': String(level) }">
    <div class="node-row">
      <span :title="tooltip" class="node-key" :class="{ 'has-tooltip': tooltip }">
        {{ nodeKey }}
      </span>
      <span v-if="tooltip" class="help-dot" :title="tooltip">?</span>
      <span v-if="!isObject(nodeValue)" class="node-value">{{ String(nodeValue) }}</span>
      <span v-else class="node-kind">{{ isArray(nodeValue) ? 'Array' : 'Object' }}</span>
    </div>

    <ul v-if="isObject(nodeValue)" class="node-children">
      <ResourceTreeNode
        v-for="([childKey, childValue], index) in asEntries(nodeValue)"
        :key="`${nodeKey}-${childKey}-${index}`"
        :node-key="childKey"
        :node-value="childValue"
        :level="level + 1"
        :resource-type="resourceType"
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
}

.node-key {
  font-weight: 600;
  color: var(--color-heading);
}

.node-key.has-tooltip {
  text-decoration: underline dotted;
  text-underline-offset: 0.15rem;
}

.help-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  font-size: 0.72rem;
  color: var(--color-text-soft);
}

.node-value {
  color: var(--color-text);
  overflow-wrap: anywhere;
}

.node-kind {
  color: var(--color-text-soft);
  font-size: 0.85rem;
}

.node-children {
  padding-left: 0.5rem;
}
</style>
