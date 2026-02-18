<script setup>
import { computed, ref, watch } from 'vue'
import fhirpath from 'fhirpath'
import DynamicQuestionnaireForm from '@/components/DynamicQuestionnaireForm.vue'
import JsonTooltipEditor from '@/components/JsonTooltipEditor.vue'
import ResourceTreeNode from '@/components/ResourceTreeNode.vue'
import { getPropertyGuide } from '@/data/fhirPropertyTooltips'
import {
  fhirPathGrammarCheatSheet,
  fhirPathSyntaxRules,
  fhirR4FhirPathFunctionGroups,
  fhirR4FhirPathOperators,
  prepopulationExamples,
  sampleQuestionnaire,
  sampleQuestionnaireResponse,
  sampleScenarios,
  sdcExpressionContextCheatSheet,
} from '@/data/r4Samples'

const tabs = [
  {
    id: 'tree',
    label: 'Step 1: Understand Resources',
    goal: 'Learn Questionnaire and QuestionnaireResponse structure with interactive tree + glossary.',
  },
  {
    id: 'form',
    label: 'Step 2: Build and Capture',
    goal: 'Render forms from Questionnaire, answer questions, and inspect live QuestionnaireResponse.',
  },
  {
    id: 'fhirpath',
    label: 'Step 3: Validate with FHIRPath',
    goal: 'Run expressions to verify logic, extraction values, and calculated fields.',
  },
  {
    id: 'authoring',
    label: 'Step 4: Authoring & Cheat Sheets',
    goal: 'Use concise reference notes for writing SDC artifacts and expressions.',
  },
]

const activeTab = ref('tree')
const authoringSection = ref('basics')
const selectedScenarioId = ref(sampleScenarios[0]?.id || 'baseline')
const cheatSheetQuery = ref('')

const selectedResourceType = ref('Questionnaire')
const questionnaireJson = ref(JSON.stringify(sampleQuestionnaire, null, 2))
const responseJson = ref(JSON.stringify(sampleQuestionnaireResponse, null, 2))
const selectedTreeNode = ref(null)
const treeControlMode = ref('')
const treeControlToken = ref(0)

const selectedFhirPathResource = ref('QuestionnaireResponse')
const fhirPathExpression = ref("item.where(linkId='pain').answer.valueCoding.display")
const fhirPathResult = ref('')
const fhirPathError = ref('')

const generatedResponse = ref(sampleQuestionnaireResponse)

const selectedJson = computed(() =>
  selectedResourceType.value === 'Questionnaire' ? questionnaireJson.value : responseJson.value,
)

const activeScenario = computed(
  () => sampleScenarios.find((scenario) => scenario.id === selectedScenarioId.value) || sampleScenarios[0],
)

const activeTabMeta = computed(() => tabs.find((tab) => tab.id === activeTab.value) || tabs[0])
const activeStepIndex = computed(() => tabs.findIndex((tab) => tab.id === activeTab.value))
const activeStepNumber = computed(() => activeStepIndex.value + 1)
const totalSteps = tabs.length
const completionPercent = computed(() => Math.round((activeStepNumber.value / totalSteps) * 100))
const breadcrumbText = computed(() => `Home / Learning Flow / ${activeTabMeta.value.label}`)

const activeFhirPathExamples = computed(() => activeScenario.value?.fhirPathExamples || [])
const activeExtractionMappings = computed(() => activeScenario.value?.extractionMappingExamples || [])

const selectedParsed = computed(() => safeParse(selectedJson.value))

const questionnaireParsed = computed(() => safeParse(questionnaireJson.value))
const responseParsed = computed(() => safeParse(responseJson.value))

const questionnaireIssues = computed(() => {
  if (questionnaireParsed.value.error) {
    return ['Questionnaire JSON is not valid JSON.']
  }

  return validateQuestionnaire(questionnaireParsed.value.value)
})

const fhirPathTargetResource = computed(() => {
  if (selectedFhirPathResource.value === 'Questionnaire') {
    return questionnaireParsed.value.value
  }

  if (selectedFhirPathResource.value === 'QuestionnaireResponse') {
    return responseParsed.value.value
  }

  return generatedResponse.value
})

const activeTreeData = computed(() => {
  if (selectedParsed.value.error) {
    return null
  }
  return selectedParsed.value.value
})

const selectedTreeResourceType = computed(
  () => activeTreeData.value?.resourceType || selectedResourceType.value,
)

const propertyGuideEntries = computed(() =>
  Object.entries(getPropertyGuide(selectedTreeResourceType.value)),
)

const normalizedCheatSheetQuery = computed(() => cheatSheetQuery.value.trim().toLowerCase())

const filteredFhirPathOperators = computed(() => {
  const query = normalizedCheatSheetQuery.value
  if (!query) {
    return fhirR4FhirPathOperators
  }

  return fhirR4FhirPathOperators.filter(
    (operator) =>
      operator.symbol.toLowerCase().includes(query) || operator.meaning.toLowerCase().includes(query),
  )
})

const filteredFhirPathFunctionGroups = computed(() => {
  const query = normalizedCheatSheetQuery.value
  if (!query) {
    return fhirR4FhirPathFunctionGroups
  }

  return fhirR4FhirPathFunctionGroups
    .map((group) => {
      const filteredFunctions = group.functions.filter((entry) => entry.toLowerCase().includes(query))
      const categoryMatches = group.category.toLowerCase().includes(query)

      if (!categoryMatches && !filteredFunctions.length) {
        return null
      }

      return {
        ...group,
        functions: categoryMatches ? group.functions : filteredFunctions,
      }
    })
    .filter(Boolean)
})

const extractionPreview = computed(() => {
  const source = generatedResponse.value

  return activeExtractionMappings.value.map((mapping) => {
    try {
      const result = fhirpath.evaluate(source, mapping.fhirPath)
      return {
        ...mapping,
        value: result.length ? result[0] : null,
        error: '',
      }
    } catch (error) {
      return {
        ...mapping,
        value: null,
        error: error instanceof Error ? error.message : 'Mapping evaluation failed.',
      }
    }
  })
})

const extractedBundle = computed(() => buildExtractionBundle(generatedResponse.value))

const authoringSections = [
  { id: 'basics', label: 'Authoring Basics' },
  { id: 'prepopulation', label: 'Prepopulation' },
  { id: 'fhirpath', label: 'FHIRPath Cheat Sheet' },
  { id: 'sdc-context', label: 'SDC Expression Context' },
]

function debounce(fn, delay) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

const runFhirPathDebounced = debounce(() => {
  runFhirPath()
}, 500)

watch(fhirPathExpression, () => {
  runFhirPathDebounced()
})

watch(
  [selectedFhirPathResource, questionnaireJson, responseJson, generatedResponse],
  () => {
    runFhirPath()
  },
  { immediate: true },
)

watch(
  () => selectedScenarioId.value,
  () => {
    loadScenario()
  },
)

function safeParse(rawValue) {
  try {
    return {
      value: JSON.parse(rawValue),
      error: '',
    }
  } catch (error) {
    return {
      value: null,
      error: error instanceof Error ? error.message : 'Unable to parse JSON.',
    }
  }
}

function runFhirPath() {
  fhirPathError.value = ''
  fhirPathResult.value = ''

  const resource = fhirPathTargetResource.value
  if (!resource || !fhirPathExpression.value.trim()) {
    return
  }

  try {
    const result = fhirpath.evaluate(resource, fhirPathExpression.value)
    fhirPathResult.value = JSON.stringify(result, null, 2)
  } catch (error) {
    fhirPathError.value = error instanceof Error ? error.message : 'FHIRPath evaluation failed.'
  }
}

function applyExample(expression) {
  fhirPathExpression.value = expression
  runFhirPath()
}

function loadScenario() {
  const scenario = activeScenario.value
  if (!scenario) {
    return
  }

  questionnaireJson.value = JSON.stringify(scenario.questionnaire, null, 2)
  responseJson.value = JSON.stringify(scenario.questionnaireResponse, null, 2)
  generatedResponse.value = scenario.questionnaireResponse
  selectedResourceType.value = 'Questionnaire'
  selectedTreeNode.value = null

  if (scenario.fhirPathExamples?.length) {
    fhirPathExpression.value = scenario.fhirPathExamples[0].expression
  }

  runFhirPath()
}

function updateGeneratedResponse(nextResponse) {
  generatedResponse.value = nextResponse
}

function goToStep(tabId) {
  activeTab.value = tabId
}

function goToNextStep() {
  const currentIndex = activeStepIndex.value
  if (currentIndex < 0 || currentIndex >= tabs.length - 1) {
    return
  }
  activeTab.value = tabs[currentIndex + 1].id
}

function goToPreviousStep() {
  const currentIndex = activeStepIndex.value
  if (currentIndex <= 0) {
    return
  }
  activeTab.value = tabs[currentIndex - 1].id
}

function updateSelectedResourceJson(nextValue) {
  if (selectedResourceType.value === 'Questionnaire') {
    questionnaireJson.value = nextValue
    return
  }

  responseJson.value = nextValue
}

function expandAllTreeNodes() {
  treeControlMode.value = 'expand'
  treeControlToken.value += 1
}

function collapseAllTreeNodes() {
  treeControlMode.value = 'collapse'
  treeControlToken.value += 1
}

function onTreeNodeSelected(payload) {
  selectedTreeNode.value = payload
}

function useNodePathAsExpression() {
  if (!selectedTreeNode.value?.path) return
  
  let expr = selectedTreeNode.value.path
  
  // "root" is just the placeholder for the top-level object
  if (expr === 'root') {
    expr = '' 
  }

  // If we ever have "root.something", strip "root."
  if (expr.startsWith('root.')) {
     expr = expr.substring(5)
  }

  // Switch tab
  activeTab.value = 'fhirpath'
  fhirPathExpression.value = expr
  selectedFhirPathResource.value = selectedResourceType.value
  
  // Force immediate run (bypass debounce)
  runFhirPath()
}

function validateQuestionnaire(resource) {
  const issues = []

  if (!resource || resource.resourceType !== 'Questionnaire') {
    issues.push("resourceType should be 'Questionnaire'.")
  }

  if (!resource?.status) {
    issues.push('status is required for R4 Questionnaire.')
  }

  if (!Array.isArray(resource?.item) || resource.item.length === 0) {
    issues.push('item[] should contain at least one question/group.')
  }

  const linkIds = new Set()
  const duplicates = new Set()

  const walk = (items = []) => {
    items.forEach((item) => {
      if (!item.linkId) {
        issues.push('Each item requires linkId.')
      }

      if (item.linkId) {
        if (linkIds.has(item.linkId)) {
          duplicates.add(item.linkId)
        }
        linkIds.add(item.linkId)
      }

      if (!item.type) {
        issues.push(`Item ${item.linkId || '<unknown>'} is missing type.`)
      }

      walk(item.item || [])
    })
  }

  walk(resource?.item || [])

  duplicates.forEach((dup) => issues.push(`Duplicate linkId detected: ${dup}`))

  if (!issues.length) {
    issues.push('No structural issues detected in this sample Questionnaire.')
  }

  return issues
}

function readFirstAnswer(item) {
  const answer = item?.answer?.[0]
  if (!answer) {
    return null
  }

  if (Object.hasOwn(answer, 'valueString')) return answer.valueString
  if (Object.hasOwn(answer, 'valueInteger')) return answer.valueInteger
  if (Object.hasOwn(answer, 'valueDecimal')) return answer.valueDecimal
  if (Object.hasOwn(answer, 'valueDate')) return answer.valueDate
  if (Object.hasOwn(answer, 'valueBoolean')) return answer.valueBoolean
  if (Object.hasOwn(answer, 'valueCoding')) return answer.valueCoding.code
  return null
}

function findItemByLinkId(itemList = [], linkId) {
  for (const item of itemList) {
    if (item.linkId === linkId) {
      return item
    }

    const nested = findItemByLinkId(item.item || [], linkId)
    if (nested) {
      return nested
    }
  }

  return null
}

function getResponseValueByLinkId(response, linkId) {
  const found = findItemByLinkId(response?.item || [], linkId)
  return readFirstAnswer(found)
}

function buildExtractionBundle(response) {
  const firstName = getResponseValueByLinkId(response, 'first-name')
  const dob = getResponseValueByLinkId(response, 'dob')
  const height = getResponseValueByLinkId(response, 'height')
  const weight = getResponseValueByLinkId(response, 'weight')
  const bmi = getResponseValueByLinkId(response, 'bmi')
  const painCode = getResponseValueByLinkId(response, 'pain')

  const entries = [
    {
      resource: {
        resourceType: 'Patient',
        id: 'derived-patient',
        name: firstName ? [{ given: [firstName] }] : undefined,
        birthDate: dob || undefined,
      },
    },
  ]

  if (height !== null && height !== undefined) {
    entries.push({
      resource: {
        resourceType: 'Observation',
        id: 'height-observation',
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: '8302-2', display: 'Body height' }],
        },
        valueQuantity: {
          value: Number(height),
          unit: 'cm',
        },
      },
    })
  }

  if (weight !== null && weight !== undefined) {
    entries.push({
      resource: {
        resourceType: 'Observation',
        id: 'weight-observation',
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body weight' }],
        },
        valueQuantity: {
          value: Number(weight),
          unit: 'kg',
        },
      },
    })
  }

  if (bmi !== null && bmi !== undefined) {
    entries.push({
      resource: {
        resourceType: 'Observation',
        id: 'bmi-observation',
        status: 'final',
        code: {
          coding: [{ system: 'http://loinc.org', code: '39156-5', display: 'Body mass index (BMI)' }],
        },
        valueQuantity: {
          value: Number(bmi),
          unit: 'kg/m2',
        },
      },
    })
  }

  if (painCode) {
    entries.push({
      resource: {
        resourceType: 'Condition',
        id: 'pain-condition',
        clinicalStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
              code: 'active',
            },
          ],
        },
        code: {
          text: 'Pain complaint',
        },
        severity: {
          coding: [{ system: 'http://example.org/pain-scale', code: String(painCode) }],
        },
      },
    })
  }

  entries.push({
    resource: {
      ...response,
      id: response?.id || 'generated-questionnaire-response',
    },
  })

  return {
    resourceType: 'Bundle',
    type: 'collection',
    entry: entries,
  }
}
</script>

<template>
  <main class="workspace">
    <section class="intro card">
      <h2>FHIR SDC (R4) Practice Workspace</h2>
      <p>
        Follow the guided 4-step flow below. Each step has one clear goal so you always know what to do
        next while learning FHIR SDC.
      </p>

      <div class="progress-shell">
        <p class="breadcrumb">You are here: {{ breadcrumbText }}</p>
        <div class="progress-inline">
          <span class="progress-pill">Step {{ activeStepNumber }}/{{ totalSteps }}</span>
          <span class="progress-percent">{{ completionPercent }}% complete</span>
        </div>
        <div class="progress-bar" role="progressbar" :aria-valuenow="completionPercent" aria-valuemin="0" aria-valuemax="100">
          <span class="progress-fill" :style="{ width: `${completionPercent}%` }" />
        </div>
      </div>

      <div class="row">
        <label class="label" for="scenario-selector">Scenario</label>
        <select id="scenario-selector" v-model="selectedScenarioId" class="input">
          <option v-for="scenario in sampleScenarios" :key="scenario.id" :value="scenario.id">
            {{ scenario.label }}
          </option>
        </select>
      </div>

      <p v-if="activeScenario?.description" class="hint">{{ activeScenario.description }}</p>
    </section>

    <section class="learning-flow card">
      <h3>Learning Flow</h3>
      <p class="hint">Start at Step 1 and move right. You can switch steps anytime.</p>

      <div class="flow-grid">
        <button
          v-for="(tab, index) in tabs"
          :key="tab.id"
          type="button"
          class="flow-step"
          :class="{ active: activeTab === tab.id }"
          @click="goToStep(tab.id)"
        >
          <p class="flow-step-index">{{ index + 1 }}</p>
          <p class="flow-step-status">{{ activeTab === tab.id ? 'You are here' : 'Open step' }}</p>
          <p class="flow-step-title">{{ tab.label }}</p>
          <p class="flow-step-goal">{{ tab.goal }}</p>
        </button>
      </div>
    </section>

    <section class="step-context card">
      <h3>{{ activeTabMeta.label }}</h3>
      <p>{{ activeTabMeta.goal }}</p>
      <div class="step-nav">
        <button
          type="button"
          class="example-btn"
          :disabled="activeStepIndex <= 0"
          @click="goToPreviousStep"
        >
          Previous Step
        </button>

        <span class="step-nav-label">Step {{ activeStepNumber }} of {{ totalSteps }}</span>

        <button
          type="button"
          class="primary-btn"
          :disabled="activeStepIndex >= tabs.length - 1"
          @click="goToNextStep"
        >
          {{ activeStepIndex >= tabs.length - 1 ? 'You reached final step' : 'Next Step' }}
        </button>
      </div>
    </section>

    <section v-if="activeTab === 'tree'" class="card panel">
      <h3>Step 1 — Resource Explorer</h3>
      <p class="hint">
        Goal: understand what each property means and how Questionnaire / QuestionnaireResponse are nested.
      </p>

      <div class="row">
        <label class="label" for="resource-selector">Resource</label>
        <select id="resource-selector" v-model="selectedResourceType" class="input">
          <option value="Questionnaire">Questionnaire</option>
          <option value="QuestionnaireResponse">QuestionnaireResponse</option>
        </select>
      </div>

      <div class="btn-row">
        <button type="button" class="example-btn" @click="expandAllTreeNodes">Expand all</button>
        <button type="button" class="example-btn" @click="collapseAllTreeNodes">Collapse all</button>
      </div>

      <JsonTooltipEditor
        :model-value="selectedResourceType === 'Questionnaire' ? questionnaireJson : responseJson"
        :resource-type="selectedResourceType"
        :min-height="340"
        @update:model-value="updateSelectedResourceJson"
      />

      <p v-if="selectedParsed.error" class="error">JSON parse error: {{ selectedParsed.error }}</p>

      <div v-else class="tree-shell">
        <ul>
          <ResourceTreeNode
            node-key="root"
            :node-value="activeTreeData"
            :resource-type="selectedTreeResourceType"
            :selected-path="selectedTreeNode?.path || ''"
            :tree-control-mode="treeControlMode"
            :tree-control-token="treeControlToken"
            @select-node="onTreeNodeSelected"
          />
        </ul>
      </div>

      <div v-if="selectedTreeNode" class="selected-node card-lite">
        <h4>Selected Node</h4>
        <p><strong>Path:</strong> {{ selectedTreeNode.path }}</p>
        <p><strong>Kind:</strong> {{ selectedTreeNode.kind }}</p>
        <p><strong>Description:</strong> {{ selectedTreeNode.tooltip || 'No tooltip for this key.' }}</p>
        <div class="btn-row">
            <button class="primary-btn" @click="useNodePathAsExpression">
                Query this path →
            </button>
        </div>
        <pre class="output">{{ JSON.stringify(selectedTreeNode.value, null, 2) }}</pre>
      </div>

      <div v-if="!selectedParsed.error" class="property-guide">
        <h4>Property Glossary ({{ selectedTreeResourceType }})</h4>
        <p class="hint">Hover any dotted property key in the tree to see the same tooltip details.</p>

        <div class="guide-grid">
          <article
            v-for="([propertyName, description], index) in propertyGuideEntries"
            :key="`${selectedTreeResourceType}-${propertyName}-${index}`"
            class="guide-card"
          >
            <h5>{{ propertyName }}</h5>
            <p>{{ description }}</p>
          </article>
        </div>
      </div>
    </section>

    <section v-if="activeTab === 'fhirpath'" class="card panel">
      <h3>Step 3 — FHIRPath Validation Lab</h3>
      <p class="hint">
        Goal: test expressions against real resources to validate calculations, conditions, and extraction logic.
      </p>

      <div class="row">
        <label class="label" for="fhirpath-target">Evaluate against</label>
        <select id="fhirpath-target" v-model="selectedFhirPathResource" class="input">
          <option value="Questionnaire">Questionnaire</option>
          <option value="QuestionnaireResponse">QuestionnaireResponse</option>
          <option value="GeneratedResponse">Generated form response</option>
        </select>
      </div>

      <label class="label" for="fhirpath-expression">FHIRPath expression</label>
      <textarea id="fhirpath-expression" v-model="fhirPathExpression" class="editor" rows="5" />

      <div class="btn-row">
        <button type="button" class="primary-btn" @click="runFhirPath">Run Expression</button>
      </div>

      <p v-if="fhirPathError" class="error">{{ fhirPathError }}</p>
      <pre v-else-if="fhirPathResult" class="output">{{ fhirPathResult }}</pre>

      <div class="example-grid">
        <button
          v-for="example in activeFhirPathExamples"
          :key="example.label"
          type="button"
          class="example-btn"
          @click="applyExample(example.expression)"
        >
          {{ example.label }}
        </button>
      </div>
    </section>

    <section v-if="activeTab === 'form'" class="card panel">
      <h3>Step 2 — Form Builder + Response Capture</h3>

      <p class="hint">
        Goal: convert Questionnaire into an interactive form, answer it, and inspect generated
        QuestionnaireResponse + extraction outputs.
      </p>

      <JsonTooltipEditor
        v-model="questionnaireJson"
        resource-type="Questionnaire"
        :min-height="300"
      />

      <p v-if="questionnaireParsed.error" class="error">{{ questionnaireParsed.error }}</p>

      <template v-else>
        <ul class="issue-list">
          <li
            v-for="(issue, index) in questionnaireIssues"
            :key="`issue-${index}`"
            :class="{ success: issue.startsWith('No structural issues') }"
          >
            {{ issue }}
          </li>
        </ul>

        <DynamicQuestionnaireForm
          :questionnaire="questionnaireParsed.value"
          @response-updated="updateGeneratedResponse"
        />

        <h4>Generated QuestionnaireResponse (live)</h4>
        <pre class="output">{{ JSON.stringify(generatedResponse, null, 2) }}</pre>

        <h4>Extraction mapping examples (QuestionnaireResponse → target resources)</h4>
        <div class="mapping-grid">
          <div v-for="mapping in extractionPreview" :key="mapping.name" class="mapping-card">
            <h5>{{ mapping.name }}</h5>
            <p><strong>FHIRPath:</strong> {{ mapping.fhirPath }}</p>
            <p><strong>Target:</strong> {{ mapping.target }}</p>
            <p v-if="mapping.error" class="error">{{ mapping.error }}</p>
            <p v-else><strong>Current value:</strong> {{ mapping.value ?? 'null' }}</p>
          </div>
        </div>

        <h4>Extracted output bundle (example)</h4>
        <pre class="output">{{ JSON.stringify(extractedBundle, null, 2) }}</pre>
      </template>
    </section>

    <section v-if="activeTab === 'authoring'" class="card panel">
      <h3>Step 4 — Authoring and Reference</h3>
      <p class="hint">
        Choose one reference section at a time. This keeps learning focused and avoids information overload.
      </p>

      <div class="tabs sub-tabs">
        <button
          v-for="section in authoringSections"
          :key="section.id"
          type="button"
          class="tab-btn"
          :class="{ active: authoringSection === section.id }"
          @click="authoringSection = section.id"
        >
          {{ section.label }}
        </button>
      </div>

      <template v-if="authoringSection === 'basics'">
        <h4>How to Write Questionnaire JSON (R4)</h4>

        <ol class="steps">
          <li>Start with required metadata: <strong>resourceType</strong>, <strong>status</strong>, <strong>item</strong>.</li>
          <li>Use stable, unique <strong>linkId</strong> values for each item.</li>
          <li>Choose accurate <strong>type</strong> values (group, string, integer, date, choice, boolean, text).</li>
          <li>Use <strong>required</strong> when a question must be answered.</li>
          <li>
            For choice questions, add <strong>answerOption</strong> with <strong>valueCoding</strong> code/display.
          </li>
          <li>For form logic, add extensions (e.g. <strong>enableWhen</strong>) and test with FHIRPath.</li>
        </ol>

        <h4>Starter template</h4>
        <pre class="output">{{ `{
  "resourceType": "Questionnaire",
  "status": "active",
  "item": [
    {
      "linkId": "q1",
      "text": "What is your question?",
      "type": "string",
      "required": true
    }
  ]
}` }}</pre>

        <h4>Suggested learning sequence</h4>
        <ul class="issue-list">
          <li>1. Explore structure in Step 1.</li>
          <li>2. Edit and render form in Step 2.</li>
          <li>3. Validate rules/logic in Step 3.</li>
          <li>4. Return here for authoring patterns and references.</li>
        </ul>
      </template>

      <template v-if="authoringSection === 'prepopulation'">
        <h4>Prepopulation examples</h4>
        <div class="reference-grid">
          <article
            v-for="example in prepopulationExamples"
            :key="example.title"
            class="reference-card"
          >
            <h5>{{ example.title }}</h5>
            <p>{{ example.description }}</p>
            <pre class="output">{{ example.snippet }}</pre>
          </article>
        </div>
      </template>

      <template v-if="authoringSection === 'fhirpath'">
        <h4>FHIRPath operators, functions, grammar, and syntax</h4>
        <div class="row">
          <label class="label" for="fhirpath-cheatsheet-search">Search</label>
          <input
            id="fhirpath-cheatsheet-search"
            v-model="cheatSheetQuery"
            class="input"
            placeholder="Search operators/functions, e.g. where, count, =, contains"
          />
        </div>

        <h4>Operators (R4 commonly used)</h4>
        <div class="reference-grid compact">
          <article
            v-for="operator in filteredFhirPathOperators"
            :key="operator.symbol"
            class="reference-card"
          >
            <h5>{{ operator.symbol }}</h5>
            <p>{{ operator.meaning }}</p>
          </article>
        </div>

        <h4>Functions (R4 commonly used)</h4>
        <div class="reference-grid">
          <article
            v-for="group in filteredFhirPathFunctionGroups"
            :key="group.category"
            class="reference-card"
          >
            <h5>{{ group.category }}</h5>
            <p>{{ group.functions.join(', ') }}</p>
          </article>
        </div>

        <h4>Grammar cheat-sheet</h4>
        <div class="reference-grid">
          <article
            v-for="grammar in fhirPathGrammarCheatSheet"
            :key="grammar.title"
            class="reference-card"
          >
            <h5>{{ grammar.title }}</h5>
            <p><strong>Pattern:</strong> {{ grammar.pattern }}</p>
            <p>{{ grammar.description }}</p>
            <p><strong>Example:</strong> {{ grammar.example }}</p>
          </article>
        </div>

        <h4>Syntax quick rules</h4>
        <ul class="issue-list">
          <li v-for="rule in fhirPathSyntaxRules" :key="rule">{{ rule }}</li>
        </ul>

        <p
          v-if="!filteredFhirPathOperators.length && !filteredFhirPathFunctionGroups.length"
          class="hint"
        >
          No matches for “{{ cheatSheetQuery }}”.
        </p>
      </template>

      <template v-if="authoringSection === 'sdc-context'">
        <h4>SDC IG expression context cheat-sheet</h4>
        <div class="reference-grid">
          <article
            v-for="entry in sdcExpressionContextCheatSheet"
            :key="entry.area"
            class="reference-card"
          >
            <h5>{{ entry.area }}</h5>
            <p><strong>Context:</strong> {{ entry.context }}</p>
            <p><strong>Notes:</strong> {{ entry.notes }}</p>
            <p><strong>Example:</strong> {{ entry.example }}</p>
          </article>
        </div>
      </template>

      <p class="hint">
        Note: exact runtime support depends on the evaluator implementation used by your app/server.
      </p>
    </section>
  </main>
</template>
