<script setup>
import { computed, ref, watch } from 'vue'
import fhirpath from 'fhirpath'
import DynamicQuestionnaireForm from '@/components/DynamicQuestionnaireForm.vue'
import JsonTooltipEditor from '@/components/JsonTooltipEditor.vue'
import ResourceTreeNode from '@/components/ResourceTreeNode.vue'
import { getPropertyGuide } from '@/data/fhirPropertyTooltips'
import {
  fhirR4FhirPathFunctionGroups,
  fhirR4FhirPathOperators,
  prepopulationExamples,
  sampleQuestionnaire,
  sampleQuestionnaireResponse,
  sampleScenarios,
} from '@/data/r4Samples'

const tabs = [
  { id: 'tree', label: 'Resource Tree' },
  { id: 'fhirpath', label: 'FHIRPath Lab' },
  { id: 'form', label: 'Form Builder' },
  { id: 'authoring', label: 'Questionnaire Authoring' },
]

const activeTab = ref('tree')
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
        Learn by editing real Questionnaire + QuestionnaireResponse JSON, exploring their tree structure,
        evaluating FHIRPath expressions, and generating response payloads from a form.
      </p>

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

    <section class="tabs card">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </section>

    <section v-if="activeTab === 'tree'" class="card panel">
      <h3>Resource Tree Visualizer</h3>

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
      <h3>FHIRPath Learning + Validation Lab</h3>

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
      <h3>Build Forms from Questionnaire</h3>

      <p class="hint">
        Update Questionnaire JSON and this form auto-renders common R4 item types (string, text, integer,
        decimal, date, boolean, choice), including <strong>enableWhen</strong> and
        <strong> calculatedExpression</strong>.
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
      <h3>How to Write Questionnaire JSON (R4)</h3>

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

      <h4>Learning flow</h4>
      <ul class="issue-list">
        <li>1. Edit Questionnaire in the Form Builder tab.</li>
        <li>2. Fill answers and inspect generated QuestionnaireResponse.</li>
        <li>3. Run FHIRPath expressions against both resources.</li>
        <li>4. Use Tree Visualizer to understand nested item structure.</li>
      </ul>

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

      <h4>FHIRPath operators (R4 commonly used)</h4>
      <div class="row">
        <label class="label" for="fhirpath-cheatsheet-search">Search</label>
        <input
          id="fhirpath-cheatsheet-search"
          v-model="cheatSheetQuery"
          class="input"
          placeholder="Search operators/functions, e.g. where, count, =, contains"
        />
      </div>

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

      <h4>FHIRPath functions (R4 commonly used)</h4>
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
      <p
        v-if="!filteredFhirPathOperators.length && !filteredFhirPathFunctionGroups.length"
        class="hint"
      >
        No matches for “{{ cheatSheetQuery }}”.
      </p>
      <p class="hint">
        Note: exact runtime support depends on the evaluator implementation used by your app/server.
      </p>
    </section>
  </main>
</template>
