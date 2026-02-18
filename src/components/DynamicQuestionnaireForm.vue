<script setup>
import { computed, onMounted, reactive, watch } from 'vue'
import fhirpath from 'fhirpath'
import r4Model from 'fhirpath/fhir-context/r4'

const props = defineProps({
  questionnaire: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['response-updated'])

const answers = reactive({})
const touched = reactive({})
const validationErrors = reactive({})

const items = computed(() => props.questionnaire.item ?? [])

const flatQuestions = computed(() => {
  const out = []

  const walk = (itemList = [], path = []) => {
    itemList.forEach((item) => {
      const currentPath = [...path, item.linkId]

      if (item.type === 'group') {
        walk(item.item ?? [], currentPath)
        return
      }

      out.push({
        ...item,
        path: currentPath,
      })
    })
  }

  walk(items.value)
  return out
})

const responseFromAnswers = computed(() => {
  const responseItems = buildResponseItems(items.value, true)

  return {
    resourceType: 'QuestionnaireResponse',
    status: 'in-progress',
    questionnaire: props.questionnaire.url || props.questionnaire.id || 'Questionnaire/unknown',
    authored: new Date().toISOString(),
    item: responseItems,
  }
})

const visibleQuestions = computed(() => flatQuestions.value.filter((item) => isItemEnabled(item)))

function buildResponseItems(itemList = [], respectEnableWhen = true) {
  return itemList
    .map((item) => {
      if (respectEnableWhen && !isItemEnabled(item)) {
        return null
      }

      if (item.type === 'group') {
        const childItems = buildResponseItems(item.item ?? [], respectEnableWhen)
        if (!childItems.length) {
          return null
        }

        return {
          linkId: item.linkId,
          item: childItems,
        }
      }

      const answer = buildAnswer(item)
      if (!answer) {
        return null
      }

      return {
        linkId: item.linkId,
        answer: [answer],
      }
    })
    .filter(Boolean)
}

function buildAnswer(item) {
  const value = answers[item.linkId]
  if (value === '' || value === undefined || value === null) {
    return null
  }

  switch (item.type) {
    case 'string':
    case 'text':
      return { valueString: String(value) }
    case 'integer':
      return Number.isNaN(Number(value)) ? null : { valueInteger: Number(value) }
    case 'decimal':
      return Number.isNaN(Number(value)) ? null : { valueDecimal: Number(value) }
    case 'boolean':
      return { valueBoolean: Boolean(value) }
    case 'date':
      return { valueDate: String(value) }
    case 'choice':
      return {
        valueCoding: {
          code: String(value),
          display:
            item.answerOption?.find((opt) => opt.valueCoding?.code === value)?.valueCoding?.display ||
            String(value),
        },
      }
    default:
      return { valueString: String(value) }
  }
}

function isItemEnabled(item) {
  if (!item?.enableWhen?.length) {
    return true
  }

  const mode = item.enableBehavior === 'any' ? 'any' : 'all'
  const results = item.enableWhen.map((condition) => evaluateEnableWhen(condition))

  return mode === 'any' ? results.some(Boolean) : results.every(Boolean)
}

function evaluateEnableWhen(condition) {
  const actual = answers[condition.question]
  const expected = expectedEnableWhenAnswer(condition)

  if (condition.operator === 'exists') {
    const exists = !(actual === undefined || actual === null || actual === '')
    return exists === Boolean(expected)
  }

  if (condition.operator === '!=') {
    return normalizeComparable(actual) !== normalizeComparable(expected)
  }

  return normalizeComparable(actual) === normalizeComparable(expected)
}

function expectedEnableWhenAnswer(condition) {
  if (Object.hasOwn(condition, 'answerBoolean')) return condition.answerBoolean
  if (Object.hasOwn(condition, 'answerString')) return condition.answerString
  if (Object.hasOwn(condition, 'answerInteger')) return condition.answerInteger
  if (Object.hasOwn(condition, 'answerDecimal')) return condition.answerDecimal
  if (Object.hasOwn(condition, 'answerDate')) return condition.answerDate
  if (Object.hasOwn(condition, 'answerCoding')) return condition.answerCoding?.code
  return undefined
}

function normalizeComparable(value) {
  if (value === undefined || value === null) {
    return ''
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return value
  }
  return String(value)
}

function initialAnswerToValue(initialAnswer) {
  if (!initialAnswer) {
    return undefined
  }

  if (Object.hasOwn(initialAnswer, 'valueString')) return initialAnswer.valueString
  if (Object.hasOwn(initialAnswer, 'valueDate')) return initialAnswer.valueDate
  if (Object.hasOwn(initialAnswer, 'valueInteger')) return initialAnswer.valueInteger
  if (Object.hasOwn(initialAnswer, 'valueDecimal')) return initialAnswer.valueDecimal
  if (Object.hasOwn(initialAnswer, 'valueBoolean')) return initialAnswer.valueBoolean
  if (Object.hasOwn(initialAnswer, 'valueCoding')) return initialAnswer.valueCoding?.code
  return undefined
}

function applyInitialValues() {
  flatQuestions.value.forEach((item) => {
    if (isCalculated(item)) {
      return
    }

    const initialValue = initialAnswerToValue(item.initial?.[0])
    if (initialValue !== undefined && answers[item.linkId] === undefined) {
      answers[item.linkId] = initialValue
    }
  })
}

function getCalculatedExpression(item) {
  const extension = item?.extension?.find(
    (entry) =>
      entry.url ===
      'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression',
  )
  return extension?.valueExpression?.expression || ''
}

function isCalculated(item) {
  return Boolean(getCalculatedExpression(item))
}

function applyCalculatedExpressions() {
  const draftResponse = {
    resourceType: 'QuestionnaireResponse',
    status: 'in-progress',
    questionnaire: props.questionnaire.url || props.questionnaire.id || 'Questionnaire/unknown',
    authored: new Date().toISOString(),
    item: buildResponseItems(items.value, false),
  }

  let changed = false

  flatQuestions.value.forEach((item) => {
    const expression = getCalculatedExpression(item)
    if (!expression) {
      return
    }

    try {
      const result = fhirpath.evaluate(draftResponse, expression)
      const nextValue = normalizeCalculatedValue(item, result)

      if (nextValue === undefined || nextValue === null || nextValue === '') {
        if (answers[item.linkId] !== undefined) {
          delete answers[item.linkId]
          changed = true
        }
        return
      }

      if (answers[item.linkId] !== nextValue) {
        answers[item.linkId] = nextValue
        changed = true
      }
    } catch {
      if (answers[item.linkId] !== undefined) {
        delete answers[item.linkId]
        changed = true
      }
    }
  })

  return changed
}

function normalizeCalculatedValue(item, result) {
  const first = result?.[0]
  if (first === undefined || first === null) {
    return undefined
  }

  if (item.type === 'integer') {
    return Number.isNaN(Number(first)) ? undefined : Math.round(Number(first))
  }

  if (item.type === 'decimal') {
    return Number.isNaN(Number(first)) ? undefined : Number(Number(first).toFixed(2))
  }

  return first
}

function clearDisabledAnswers() {
  let changed = false

  flatQuestions.value.forEach((item) => {
    if (!isItemEnabled(item) && answers[item.linkId] !== undefined) {
      delete answers[item.linkId]
      changed = true
    }
  })

  return changed
}

function getConstraints(item) {
  if (!item?.extension?.length) return []
  return item.extension
    .filter((ext) => ext.url === 'http://hl7.org/fhir/StructureDefinition/questionnaire-constraint')
    .map((ext) => {
      const sub = ext.extension || []
      return {
        key: sub.find((e) => e.url === 'key')?.valueId || '',
        severity: sub.find((e) => e.url === 'severity')?.valueCode || 'error',
        human: sub.find((e) => e.url === 'human')?.valueString || 'Validation failed',
        expression: sub.find((e) => e.url === 'expression')?.valueString || '',
      }
    })
    .filter((c) => c.expression)
}

function hasConstraints(item) {
  return getConstraints(item).length > 0
}

function evaluateAllValidation() {
  const response = responseFromAnswers.value

  flatQuestions.value.forEach((item) => {
    const errors = []
    const isTouched = touched[item.linkId]
    const value = answers[item.linkId]
    const hasValue = value !== undefined && value !== '' && value !== null

    if (item.required && isTouched && !hasValue) {
      errors.push('This field is required.')
    }

    if (item.maxLength && typeof value === 'string' && value.length > item.maxLength) {
      errors.push(`Maximum length is ${item.maxLength} characters (current: ${value.length}).`)
    }

    if (isTouched || hasValue) {
      getConstraints(item).forEach((constraint) => {
        try {
          const result = fhirpath.evaluate(response, constraint.expression, {
            resource: response,
            questionnaire: props.questionnaire,
          }, r4Model)
          if (result.length > 0 && result[0] === false) {
            errors.push(
              constraint.severity === 'warning'
                ? `\u26A0 ${constraint.human}`
                : constraint.human,
            )
          }
        } catch {
          // Expression may reference absent data \u2014 skip silently
        }
      })
    }

    if (errors.length) {
      validationErrors[item.linkId] = errors
    } else {
      delete validationErrors[item.linkId]
    }
  })
}

function refreshStateAndEmit() {
  let attempts = 0
  let changed = true

  while (changed && attempts < 4) {
    const calculatedChanged = applyCalculatedExpressions()
    const disabledChanged = clearDisabledAnswers()
    changed = calculatedChanged || disabledChanged
    attempts += 1
  }

  evaluateAllValidation()
  emit('response-updated', responseFromAnswers.value)
}

function onInput(item, value) {
  if (isCalculated(item)) {
    return
  }

  touched[item.linkId] = true
  answers[item.linkId] = value
  refreshStateAndEmit()
}

function onBlur(item) {
  if (!touched[item.linkId]) {
    touched[item.linkId] = true
    evaluateAllValidation()
  }
}

watch(
  () => props.questionnaire,
  () => {
    Object.keys(answers).forEach((key) => {
      delete answers[key]
    })
    Object.keys(touched).forEach((key) => {
      delete touched[key]
    })
    Object.keys(validationErrors).forEach((key) => {
      delete validationErrors[key]
    })
    applyInitialValues()
    refreshStateAndEmit()
  },
  { deep: true },
)

onMounted(() => {
  applyInitialValues()
  refreshStateAndEmit()
})
</script>

<template>
  <div class="form-shell">
    <div v-if="!visibleQuestions.length" class="empty-state">
      Questionnaire has no renderable questions.
    </div>

    <div v-for="item in visibleQuestions" :key="item.linkId" class="question-row">
      <label class="question-label" :for="item.linkId">
        {{ item.text || item.linkId }}
        <span v-if="item.required" class="required-pill">required</span>
        <span v-if="item.enableWhen?.length" class="logic-pill">enableWhen</span>
        <span v-if="isCalculated(item)" class="logic-pill">calculatedExpression</span>
        <span v-if="hasConstraints(item)" class="logic-pill constraint-pill">constraint</span>
      </label>

      <textarea
        v-if="item.type === 'text'"
        :id="item.linkId"
        rows="3"
        class="question-input"
        :class="{ 'question-input--invalid': validationErrors[item.linkId]?.length }"
        :value="answers[item.linkId] || ''"
        :disabled="isCalculated(item)"
        @input="onInput(item, $event.target.value)"
        @blur="onBlur(item)"
      />

      <select
        v-else-if="item.type === 'choice'"
        :id="item.linkId"
        class="question-input"
        :class="{ 'question-input--invalid': validationErrors[item.linkId]?.length }"
        :value="answers[item.linkId] || ''"
        :disabled="isCalculated(item)"
        @change="onInput(item, $event.target.value)"
        @blur="onBlur(item)"
      >
        <option value="">Select option</option>
        <option
          v-for="(option, index) in item.answerOption || []"
          :key="`${item.linkId}-opt-${index}`"
          :value="option.valueCoding?.code || ''"
        >
          {{ option.valueCoding?.display || option.valueCoding?.code || 'Option' }}
        </option>
      </select>

      <input
        v-else-if="item.type === 'boolean'"
        :id="item.linkId"
        type="checkbox"
        class="question-checkbox"
        :checked="Boolean(answers[item.linkId])"
        :disabled="isCalculated(item)"
        @change="onInput(item, $event.target.checked)"
        @blur="onBlur(item)"
      />

      <input
        v-else
        :id="item.linkId"
        :type="item.type === 'integer' || item.type === 'decimal' ? 'number' : item.type === 'date' ? 'date' : 'text'"
        :step="item.type === 'decimal' ? '0.01' : undefined"
        class="question-input"
        :class="{ 'question-input--invalid': validationErrors[item.linkId]?.length }"
        :value="answers[item.linkId] || ''"
        :disabled="isCalculated(item)"
        @input="onInput(item, $event.target.value)"
        @change="onInput(item, $event.target.value)"
        @blur="onBlur(item)"
      />

      <div v-if="validationErrors[item.linkId]?.length" class="validation-errors">
        <div v-for="(msg, msgIdx) in validationErrors[item.linkId]" :key="msgIdx" class="validation-msg">
          {{ msg }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-shell {
  display: grid;
  gap: 0.9rem;
}

.question-row {
  display: grid;
  gap: 0.35rem;
}

.question-label {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.required-pill {
  font-size: 0.75rem;
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
}

.logic-pill {
  font-size: 0.75rem;
  background: var(--color-background);
  border: 1px dashed var(--color-border-hover);
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
}

.question-input {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  padding: 0.55rem 0.65rem;
  width: 100%;
}

.question-checkbox {
  width: 1.2rem;
  height: 1.2rem;
}

.empty-state {
  color: var(--color-text-soft);
  font-style: italic;
}

.question-input--invalid {
  border-color: #dc2626 !important;
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.15);
}

.validation-errors {
  display: grid;
  gap: 0.2rem;
}

.validation-msg {
  font-size: 0.8rem;
  color: #dc2626;
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
}

.validation-msg::before {
  content: '\26A0';
  flex-shrink: 0;
}

.constraint-pill {
  border-color: #e87040 !important;
  color: #e87040;
}
</style>
