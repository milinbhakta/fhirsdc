<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import fhirpath from 'fhirpath'
import r4Model from 'fhirpath/fhir-context/r4'
import { loadServers, getActiveServer, expandValueSet } from '@/utils/fhirClient'

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
const collapsedGroups = reactive({})

// ── ValueSet Expansion ──────────────────────────────────────────────
const expandedOptions = reactive({})   // { [linkId]: answerOption[] }
const expandingVS = reactive({})       // { [linkId]: boolean }
const expandErrors = reactive({})      // { [linkId]: string }

function getTermServer() {
  try {
    const servers = loadServers()
    return getActiveServer(servers, 'terminology') || getActiveServer(servers, 'fhir') || null
  } catch { return null }
}

/** Walk all items (including nested groups) and expand any answerValueSet references */
async function expandAllValueSets(itemList) {
  if (!itemList?.length) return
  const server = getTermServer()
  if (!server) return

  const tasks = []
  const walk = (items) => {
    for (const item of items) {
      if (item.answerValueSet && !item.answerOption?.length) {
        tasks.push(expandSingleVS(server, item))
      }
      if (item.item?.length) walk(item.item)
    }
  }
  walk(itemList)
  await Promise.allSettled(tasks)
}

async function expandSingleVS(server, item) {
  const linkId = item.linkId
  expandingVS[linkId] = true
  delete expandErrors[linkId]
  try {
    const result = await expandValueSet(server, item.answerValueSet, '', 200)
    const concepts = result?.expansion?.contains || []
    expandedOptions[linkId] = concepts.map(c => ({
      valueCoding: { system: c.system, code: c.code, display: c.display || c.code }
    }))
  } catch (err) {
    expandErrors[linkId] = err.message || 'Failed to expand ValueSet'
    expandedOptions[linkId] = []
  }
  expandingVS[linkId] = false
}

/** Get the effective options for a choice item (inline answerOption or expanded ValueSet) */
function getEffectiveOptions(item) {
  if (item.answerOption?.length) return item.answerOption
  if (expandedOptions[item.linkId]?.length) return expandedOptions[item.linkId]
  return []
}

const items = computed(() => props.questionnaire.item ?? [])

const flatQuestions = computed(() => {
  const out = []

  const walk = (itemList = [], path = []) => {
    itemList.forEach((item) => {
      const currentPath = [...path, item.linkId]

      if (item.type === 'group') {
        // Include the group itself so we can render collapsible/table headers
        out.push({ ...item, path: currentPath })
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

const visibleQuestions = computed(() => flatQuestions.value.filter((item) => isItemEnabled(item) && !isHidden(item)))

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

/**
 * Extract the value string from an answerOption for use in <option :value>.
 * Supports valueCoding, valueString, valueInteger, valueDate, valueReference.
 */
function getOptionValue(option) {
  if (option.valueCoding) return option.valueCoding.code || ''
  if (Object.hasOwn(option, 'valueString')) return option.valueString
  if (Object.hasOwn(option, 'valueInteger')) return String(option.valueInteger)
  if (option.valueDate) return option.valueDate
  if (option.valueReference) return option.valueReference.reference || ''
  return ''
}

/**
 * Extract the display label from an answerOption for use in <option> text.
 */
function getOptionLabel(option) {
  if (option.valueCoding) return option.valueCoding.display || option.valueCoding.code || 'Option'
  if (Object.hasOwn(option, 'valueString')) return option.valueString
  if (Object.hasOwn(option, 'valueInteger')) return String(option.valueInteger)
  if (option.valueDate) return option.valueDate
  if (option.valueReference) return option.valueReference.display || option.valueReference.reference || 'Reference'
  return 'Option'
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
    case 'choice': {
      const opts = getEffectiveOptions(item)
      const matchedOpt = opts.find((opt) => getOptionValue(opt) === value)
      if (matchedOpt) {
        if (matchedOpt.valueCoding) return { valueCoding: matchedOpt.valueCoding }
        if (Object.hasOwn(matchedOpt, 'valueInteger')) return { valueCoding: { code: String(matchedOpt.valueInteger), display: String(matchedOpt.valueInteger) } }
        if (matchedOpt.valueDate) return { valueCoding: { code: matchedOpt.valueDate, display: matchedOpt.valueDate } }
        if (matchedOpt.valueReference) return { valueReference: matchedOpt.valueReference }
        return { valueString: matchedOpt.valueString ?? String(value) }
      }
      return { valueString: String(value) }
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

  // Initialize collapsed state for collapsible groups
  flatQuestions.value.forEach((item) => {
    if (item.type === 'group') {
      const collapsible = getCollapsible(item)
      if (collapsible === 'default-closed') {
        collapsedGroups[item.linkId] = true
      } else if (collapsible === 'default-open') {
        collapsedGroups[item.linkId] = false
      }
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

// ── Rendering Extension Helpers ──────────────────────────────────────
function getExtValue(item, url) {
  return item?.extension?.find((e) => e.url === url)
}

function getRenderingStyle(item) {
  const ext = getExtValue(item, 'http://hl7.org/fhir/StructureDefinition/rendering-style')
  return ext?.valueString || ''
}

function getRenderingXhtml(item) {
  const ext = getExtValue(item, 'http://hl7.org/fhir/StructureDefinition/rendering-xhtml')
  return ext?.valueString || ''
}

function getEntryFormat(item) {
  const ext = getExtValue(item, 'http://hl7.org/fhir/StructureDefinition/entryFormat')
  return ext?.valueString || ''
}

function isHidden(item) {
  const ext = getExtValue(item, 'http://hl7.org/fhir/StructureDefinition/questionnaire-hidden')
  return ext?.valueBoolean === true
}

function getItemControl(item) {
  const ext = getExtValue(item, 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl')
  return ext?.valueCodeableConcept?.coding?.[0]?.code || ''
}

function getChoiceOrientation(item) {
  const ext = getExtValue(item, 'http://hl7.org/fhir/StructureDefinition/questionnaire-choiceOrientation')
  return ext?.valueCode || ''
}

function getSliderStepValue(item) {
  const ext = getExtValue(item, 'http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue')
  return ext?.valueInteger ?? 1
}

function getDisplayCategory(item) {
  const ext = getExtValue(item, 'http://hl7.org/fhir/StructureDefinition/questionnaire-displayCategory')
  return ext?.valueCodeableConcept?.coding?.[0]?.code || ''
}

function getShortText(item) {
  const ext = getExtValue(item, 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-shortText')
  return ext?.valueString || ''
}

function getCollapsible(item) {
  const ext = getExtValue(item, 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-collapsible')
  return ext?.valueCode || ''
}

function getMinValue(item) {
  const ext = getExtValue(item, 'http://hl7.org/fhir/StructureDefinition/minValue')
  return ext?.valueInteger ?? ext?.valueDecimal ?? ext?.valueDate ?? null
}

function getMaxValue(item) {
  const ext = getExtValue(item, 'http://hl7.org/fhir/StructureDefinition/maxValue')
  return ext?.valueInteger ?? ext?.valueDecimal ?? ext?.valueDate ?? null
}

function getMinLength(item) {
  const ext = getExtValue(item, 'http://hl7.org/fhir/StructureDefinition/minLength')
  return ext?.valueInteger ?? null
}

function getRegex(item) {
  const ext = getExtValue(item, 'http://hl7.org/fhir/StructureDefinition/regex')
  return ext?.valueString || null
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
  return getConstraints(item).length > 0 || getMinValue(item) !== null || getMaxValue(item) !== null || getMinLength(item) !== null || getRegex(item) !== null
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

    // minLength extension
    const minLen = getMinLength(item)
    if (minLen !== null && typeof value === 'string' && hasValue && value.length < minLen) {
      errors.push(`Minimum length is ${minLen} characters (current: ${value.length}).`)
    }

    // minValue / maxValue extensions
    if (hasValue) {
      const numValue = Number(value)
      const minVal = getMinValue(item)
      const maxVal = getMaxValue(item)

      if (minVal !== null && !Number.isNaN(numValue) && typeof minVal === 'number' && numValue < minVal) {
        errors.push(`Value must be at least ${minVal}.`)
      }
      if (maxVal !== null && !Number.isNaN(numValue) && typeof maxVal === 'number' && numValue > maxVal) {
        errors.push(`Value must be at most ${maxVal}.`)
      }

      // Date min/max
      if (typeof minVal === 'string' && typeof value === 'string' && value < minVal) {
        errors.push(`Date must be on or after ${minVal}.`)
      }
      if (typeof maxVal === 'string' && typeof value === 'string' && value > maxVal) {
        errors.push(`Date must be on or before ${maxVal}.`)
      }
    }

    // regex extension
    const regexPattern = getRegex(item)
    if (regexPattern && hasValue && typeof value === 'string') {
      try {
        const re = new RegExp(regexPattern)
        if (!re.test(value)) {
          errors.push(`Value does not match the required pattern.`)
        }
      } catch {
        // invalid regex — skip
      }
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

function toggleCollapsed(linkId) {
  collapsedGroups[linkId] = !collapsedGroups[linkId]
}

function onCheckboxChange(item, value, checked) {
  const current = Array.isArray(answers[item.linkId]) ? [...answers[item.linkId]] : []
  if (checked) {
    current.push(value)
  } else {
    const idx = current.indexOf(value)
    if (idx >= 0) current.splice(idx, 1)
  }
  touched[item.linkId] = true
  answers[item.linkId] = current
  refreshStateAndEmit()
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
    Object.keys(collapsedGroups).forEach((key) => {
      delete collapsedGroups[key]
    })
    applyInitialValues()
    refreshStateAndEmit()
    expandAllValueSets(props.questionnaire.item)
  },
  { deep: true },
)

onMounted(() => {
  applyInitialValues()
  refreshStateAndEmit()
  expandAllValueSets(props.questionnaire.item)
})
</script>

<template>
  <div class="form-shell">
    <div v-if="!visibleQuestions.length" class="empty-state">
      Questionnaire has no renderable questions.
    </div>

    <template v-for="item in visibleQuestions" :key="item.linkId">
      <!-- GROUP items: render as section header, optionally collapsible -->
      <div v-if="item.type === 'group'" class="group-row" :class="{ 'group-collapsible': getCollapsible(item) }">
        <div
          class="group-header"
          :style="getRenderingStyle(item)"
          :class="{ 'group-header--clickable': getCollapsible(item) }"
          @click="getCollapsible(item) ? toggleCollapsed(item.linkId) : null"
        >
          <span v-if="getCollapsible(item)" class="collapse-chevron" :class="{ open: !collapsedGroups[item.linkId] }">▶</span>
          <span v-if="getRenderingXhtml(item)" v-html="getRenderingXhtml(item)"></span>
          <span v-else>{{ item.text || item.linkId }}</span>
        </div>
      </div>

      <!-- DISPLAY items: read-only text -->
      <div v-else-if="item.type === 'display'" class="display-row" :class="getDisplayCategory(item) ? `display-${getDisplayCategory(item)}` : ''">
        <div :style="getRenderingStyle(item)">
          <span v-if="getRenderingXhtml(item)" v-html="getRenderingXhtml(item)"></span>
          <span v-else>{{ item.text || '' }}</span>
        </div>
      </div>

      <!-- QUESTION items -->
      <div v-else class="question-row">
        <label class="question-label" :for="item.linkId">
          <span v-if="getRenderingXhtml(item)" v-html="getRenderingXhtml(item)" :style="getRenderingStyle(item)"></span>
          <span v-else :style="getRenderingStyle(item)">{{ getShortText(item) || item.text || item.linkId }}</span>
          <span v-if="item.required" class="required-pill">required</span>
          <span v-if="item.enableWhen?.length" class="logic-pill">enableWhen</span>
          <span v-if="isCalculated(item)" class="logic-pill">calculatedExpression</span>
          <span v-if="hasConstraints(item)" class="logic-pill constraint-pill">constraint</span>
        </label>

        <!-- TEXT (multi-line) -->
        <textarea
          v-if="item.type === 'text' || getItemControl(item) === 'text-box'"
          :id="item.linkId"
          rows="3"
          class="question-input"
          :class="{ 'question-input--invalid': validationErrors[item.linkId]?.length }"
          :value="answers[item.linkId] || ''"
          :placeholder="getEntryFormat(item)"
          :disabled="isCalculated(item) || item.readOnly"
          @input="onInput(item, $event.target.value)"
          @blur="onBlur(item)"
        />

        <!-- CHOICE: radio-button itemControl -->
        <div v-else-if="(item.type === 'choice' || item.type === 'open-choice') && getItemControl(item) === 'radio-button'"
          class="choice-group"
          :class="{ 'choice-horizontal': getChoiceOrientation(item) === 'horizontal' }"
        >
          <label
            v-for="(option, index) in getEffectiveOptions(item)"
            :key="`${item.linkId}-radio-${index}`"
            class="radio-label"
          >
            <input
              type="radio"
              :name="item.linkId"
              :value="getOptionValue(option)"
              :checked="answers[item.linkId] === getOptionValue(option)"
              :disabled="isCalculated(item) || item.readOnly"
              @change="onInput(item, $event.target.value)"
            />
            {{ getOptionLabel(option) }}
          </label>
        </div>

        <!-- CHOICE: check-box itemControl -->
        <div v-else-if="(item.type === 'choice' || item.type === 'open-choice') && getItemControl(item) === 'check-box'"
          class="choice-group"
          :class="{ 'choice-horizontal': getChoiceOrientation(item) === 'horizontal' }"
        >
          <label
            v-for="(option, index) in getEffectiveOptions(item)"
            :key="`${item.linkId}-cb-${index}`"
            class="radio-label"
          >
            <input
              type="checkbox"
              :value="getOptionValue(option)"
              :checked="(answers[item.linkId] || []).includes?.(getOptionValue(option))"
              :disabled="isCalculated(item) || item.readOnly"
              @change="onCheckboxChange(item, getOptionValue(option), $event.target.checked)"
            />
            {{ getOptionLabel(option) }}
          </label>
        </div>

        <!-- CHOICE: default drop-down / autocomplete -->
        <div v-else-if="item.type === 'choice' || item.type === 'open-choice'" style="position: relative;">
          <select
            :id="item.linkId"
            class="question-input"
            :class="{ 'question-input--invalid': validationErrors[item.linkId]?.length }"
            :value="answers[item.linkId] || ''"
            :disabled="isCalculated(item) || expandingVS[item.linkId] || item.readOnly"
            @change="onInput(item, $event.target.value)"
            @blur="onBlur(item)"
          >
            <option value="">{{ expandingVS[item.linkId] ? 'Loading options…' : 'Select option' }}</option>
            <option
              v-for="(option, index) in getEffectiveOptions(item)"
              :key="`${item.linkId}-opt-${index}`"
              :value="getOptionValue(option)"
            >
              {{ getOptionLabel(option) }}
            </option>
          </select>
          <span v-if="expandErrors[item.linkId]" style="font-size: 0.75rem; color: #b45309; margin-top: 0.2rem; display: block;">
            ⚠️ Could not load options: {{ expandErrors[item.linkId] }}
          </span>
        </div>

        <!-- BOOLEAN -->
        <input
          v-else-if="item.type === 'boolean'"
          :id="item.linkId"
          type="checkbox"
          class="question-checkbox"
          :checked="Boolean(answers[item.linkId])"
          :disabled="isCalculated(item) || item.readOnly"
          @change="onInput(item, $event.target.checked)"
          @blur="onBlur(item)"
        />

        <!-- SLIDER (integer/decimal with slider itemControl) -->
        <div v-else-if="getItemControl(item) === 'slider'" class="slider-row">
          <input
            :id="item.linkId"
            type="range"
            class="slider-input"
            :min="getMinValue(item) ?? 0"
            :max="getMaxValue(item) ?? 100"
            :step="getSliderStepValue(item)"
            :value="answers[item.linkId] || getMinValue(item) || 0"
            :disabled="isCalculated(item) || item.readOnly"
            @input="onInput(item, Number($event.target.value))"
          />
          <span class="slider-value">{{ answers[item.linkId] ?? getMinValue(item) ?? 0 }}</span>
        </div>

        <!-- DEFAULT: string, integer, decimal, date, etc. -->
        <input
          v-else
          :id="item.linkId"
          :type="item.type === 'integer' || item.type === 'decimal' ? 'number' : item.type === 'date' ? 'date' : item.type === 'dateTime' ? 'datetime-local' : item.type === 'time' ? 'time' : item.type === 'url' ? 'url' : 'text'"
          :step="item.type === 'decimal' ? '0.01' : undefined"
          :min="getMinValue(item) ?? undefined"
          :max="getMaxValue(item) ?? undefined"
          :placeholder="getEntryFormat(item)"
          class="question-input"
          :class="{ 'question-input--invalid': validationErrors[item.linkId]?.length }"
          :value="answers[item.linkId] || ''"
          :disabled="isCalculated(item) || item.readOnly"
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
    </template>
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
  flex-wrap: wrap;
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

/* ── Group & Display ── */
.group-row {
  margin-top: 0.5rem;
}

.group-header {
  font-weight: 700;
  font-size: 1.05rem;
  padding: 0.4rem 0;
  border-bottom: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.group-header--clickable {
  cursor: pointer;
  user-select: none;
}

.collapse-chevron {
  font-size: 0.7rem;
  transition: transform 0.2s;
  display: inline-block;
}

.collapse-chevron.open {
  transform: rotate(90deg);
}

.display-row {
  padding: 0.5rem 0;
  color: var(--color-text-soft);
  font-size: 0.9rem;
}

.display-instructions {
  padding: 0.6rem 0.8rem;
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
  border-radius: 4px;
  color: #1e40af;
  font-size: 0.85rem;
}

.display-security {
  padding: 0.6rem 0.8rem;
  background: #fef3c7;
  border-left: 3px solid #f59e0b;
  border-radius: 4px;
  color: #92400e;
  font-size: 0.85rem;
}

/* ── Choice Groups (radio/checkbox) ── */
.choice-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.choice-horizontal {
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 400;
  cursor: pointer;
  padding: 0.25rem 0;
}

.radio-label input[type="radio"],
.radio-label input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

/* ── Slider ── */
.slider-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.slider-input {
  flex: 1;
  height: 6px;
  appearance: auto;
  cursor: pointer;
}

.slider-value {
  font-weight: 600;
  font-size: 0.9rem;
  min-width: 2.5rem;
  text-align: center;
  background: var(--color-background-mute);
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
}
</style>
