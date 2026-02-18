<script setup>
import { computed, ref, watch } from 'vue'
import fhirpath from 'fhirpath'
import DynamicQuestionnaireForm from '@/components/DynamicQuestionnaireForm.vue'
import JsonTooltipEditor from '@/components/JsonTooltipEditor.vue'
import ResourceTreeNode from '@/components/ResourceTreeNode.vue'
import { getPropertyGuide } from '@/data/fhirPropertyTooltips'
import { learningModules } from '@/data/learningModules'
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
    id: 'intro',
    label: 'Module 0: Basics',
    goal: 'Start here.',
    icon: '🏠'
  },
  {
    id: 'tree',
    label: 'Module 1: Structure',
    goal: 'Understand Questionnaire nesting.',
    icon: 'hierarchy'
  },
  {
    id: 'form',
    label: 'Module 2: Rendering',
    goal: 'Build forms & responses.',
    icon: 'form'
  },
  {
    id: 'fhirpath',
    label: 'Module 3: Logic Lab',
    goal: 'Test extraction & calculation.',
    icon: 'code'
  },
  {
    id: 'quiz',
    label: 'Module 4: Quiz',
    goal: 'Test your knowledge.',
    icon: 'check-circle'
  },
  {
    id: 'authoring',
    label: 'Reference',
    goal: 'Cheat sheets & patterns.',
    icon: 'book'
  },
]

const activeTab = ref('intro')
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

// Quiz State
const quizQuestions = [
  {
    question: "What is the primary goal of the FHIR Structured Data Capture (SDC) implementation guide?",
    options: [
      "To define the core FHIR resources for patient demographics",
      "To enhance the base Questionnaire resource with advanced behaviors like pre-population, calculated scores, and form rendering",
      "To replace the Questionnaire resource with a binary document format",
      "To restrict the use of FHIRPath in clinical settings"
    ],
    answer: 1
  },
  {
    question: "Which `item.type` in a FHIR Questionnaire represents a question with a set of allowed answers where multiple selections may be permitted?",
    options: [
      "group",
      "string",
      "choice",
      "boolean"
    ],
    answer: 2
  },
  {
    question: "In a FHIRPath expression used within an SDC Questionnaire, what does `%resource` typically refer to?",
    options: [
      "The FHIR server's root URL",
      "The QuestionnaireResponse currently being populated or authored",
      "The Patient resource associated with the form",
      "The structure definition of the Questionnaire"
    ],
    answer: 1
  },
  {
    question: "Which extension is used to specify that a Questionnaire item should be hidden until a specific condition (expressed in FHIRPath) is met?",
    options: [
      "enableWhen",
      "initialExpression",
      "variable",
      "itemControl"
    ],
    answer: 0
  },
  {
    question: "How are `linkId` elements used effectively in a QuestionnaireResponse?",
    options: [
      "They link to external web pages for help text",
      "They are optional labels for human readability only",
      "They must uniquely correspond to the `linkId` of the items in the defining Questionnaire to map answers back to questions",
      "They are automatically generated hashes used for security"
    ],
    answer: 2
  }
]

const quizAnswers = ref({})
const quizSubmitted = ref(false)

const quizScore = computed(() => {
  if (!quizSubmitted.value) return 0
  let score = 0
  quizQuestions.forEach((q, idx) => {
    if (quizAnswers.value[idx] === q.answer) {
      score++
    }
  })
  return score
})

const quizPercentage = computed(() => Math.round((quizScore.value / quizQuestions.length) * 100))

function submitQuiz() {
  quizSubmitted.value = true
}

function resetQuiz() {
  quizAnswers.value = {}
  quizSubmitted.value = false
}


const selectedJson = computed(() =>
  selectedResourceType.value === 'Questionnaire' ? questionnaireJson.value : responseJson.value,
)

const activeScenario = computed(
  () => sampleScenarios.find((scenario) => scenario.id === selectedScenarioId.value) || sampleScenarios[0],
)

const activeTabMeta = computed(() => tabs.find((tab) => tab.id === activeTab.value) || tabs[0])
const activeStepIndex = computed(() => tabs.findIndex((tab) => tab.id === activeTab.value))
const activeStepNumber = computed(() => activeStepIndex.value + 1)
const totalSteps = tabs.length - 1 // Subtract Home
const completionPercent = computed(() => {
    if (activeTab.value === 'intro') return 0
    return Math.round((activeStepIndex.value / totalSteps) * 100)
})

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
  
  if (expr === 'root') {
    expr = '' 
  }

  if (expr.startsWith('root.')) {
     expr = expr.substring(5)
  }

  activeTab.value = 'fhirpath'
  fhirPathExpression.value = expr
  selectedFhirPathResource.value = selectedResourceType.value
  
  runFhirPath()
}

function validateQuestionnaire(resource) {
  const issues = []

  if (!resource || resource.resourceType !== 'Questionnaire') {
    issues.push('resourceType should be Questionnaire.')
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
  <div id="app">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 class="brand">FHIR SDC Lab</h1>
      </div>
      
      <nav class="sidebar-nav">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="nav-item" 
          :class="{ active: activeTab === tab.id }"
          @click="goToStep(tab.id)"
        >
          <span>{{ tab.label }}</span>
          <span v-if="tab.id === activeTab" class="nav-badge">Active</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <div class="flex-col gap-2">
            <div style="display:flex; justify-content:space-between;">
                <span style="font-size:0.8rem">Progress</span>
                <span style="font-size:0.8rem; font-weight:bold">{{ completionPercent }}%</span>
            </div>
            <div style="width:100%; height:8px; background:rgba(255,255,255,0.1); border-radius:4px; overflow:hidden;">
                 <div :style="{ width: completionPercent + '%', height:'100%', background:'#3b82f6' }"></div>
            </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Top Bar -->
      <header class="top-bar">
        <div class="page-title">
          <h2>{{ activeTabMeta?.label || 'Home' }}</h2>
        </div>
        
        <div class="top-actions">
           <label for="scenario-select" style="font-size: 0.85rem; font-weight: 500; color: var(--c-text-secondary);">Scenario:</label>
           <select id="scenario-select" v-model="selectedScenarioId" class="input-select">
            <option v-for="scenario in sampleScenarios" :key="scenario.id" :value="scenario.id">
              {{ scenario.label }}
            </option>
          </select>
          
          <button 
            v-if="activeTab !== 'intro'"
            class="btn btn-sm" 
            @click="goToPreviousStep" 
            :disabled="activeStepIndex <= 0"
          >
            ← Prev
          </button>
          <button 
            class="btn btn-primary btn-sm" 
            @click="goToNextStep"
            :disabled="activeStepIndex >= tabs.length - 1"
          >
            {{ activeStepIndex >= tabs.length - 1 ? 'Finish' : 'Next Module →' }}
          </button>
        </div>
      </header>

      <!-- Scrollable Area -->
      <div class="content-scroll-area">
        
        <!-- MODULE 0: INTRO (Dynamic) -->
        <div v-if="activeTab === 'intro'" class="card" style="max-width: 800px; margin: 0 auto;">
          <h2>{{ learningModules.intro.title }}</h2>
          <div v-for="(section, idx) in learningModules.intro.sections" :key="idx" style="margin-bottom: 2rem;">
             <h3 style="margin-bottom: 0.5rem;">{{ section.title }}</h3>
             <p style="white-space: pre-line; color: var(--c-text-primary);">{{ section.content }}</p>
          </div>

          <div class="flow-grid" style="display:grid; gap:1rem; grid-template-columns: repeat(2, 1fr); margin-top:3rem;">
            <div 
              v-for="(tab, index) in tabs.slice(1)" 
              :key="tab.id" 
              class="card"
              @click="goToStep(tab.id)"
              style="cursor:pointer; border-color:var(--c-border);"
            >
               <p style="font-size:0.75rem; color: #94a3b8; margin:0">Next Up</p>
               <h4 style="margin:0.25rem 0">{{ tab.label }}</h4>
               <p style="font-size:0.9rem; margin:0">{{ tab.goal }}</p>
            </div>
          </div>
          
          <div style="margin-top: 2rem; text-align: center;">
             <button class="btn btn-primary" style="padding: 0.75rem 2rem; font-size: 1rem;" @click="goToNextStep">
                Start Module 1 →
             </button>
          </div>
        </div>

        <!-- MODULE 1: TREE -->
        <div v-if="activeTab === 'tree'" class="split-pane">
          <!-- Left: Editor & Controls -->
          <div class="pane">
            <div class="pane-header">
               <span>Resource JSON</span>
               <select v-model="selectedResourceType" class="input-select" style="padding: 0.2rem 2rem 0.2rem 0.5rem; min-width: 140px;">
                  <option value="Questionnaire">Questionnaire</option>
                  <option value="QuestionnaireResponse">Response</option>
               </select>
            </div>
            <!-- LEARNING TIP -->
            <div style="background: #eff6ff; padding: 0.75rem; border-bottom: 1px solid #dbeafe; font-size: 0.9rem; color: #1e40af;">
                <strong>Tip:</strong> {{ learningModules.structure.sections[0].content }}
            </div>
            <div class="pane-body">
              <JsonTooltipEditor
                :model-value="selectedResourceType === 'Questionnaire' ? questionnaireJson : responseJson"
                :resource-type="selectedResourceType"
                @update:model-value="updateSelectedResourceJson"
                style="height: 100%; border: none;"
              />
            </div>
          </div>
          
          <!-- Right: Visual Tree -->
          <div class="pane">
            <div class="pane-header">
               <span>Interactive Tree</span>
               <div class="btn-row" style="gap: 0.5rem">
                  <button class="btn btn-sm" @click="expandAllTreeNodes">Expand</button>
                  <button class="btn btn-sm" @click="collapseAllTreeNodes">Collapse</button>
               </div>
            </div>
            <div class="pane-body tree-shell">
              <ul v-if="!selectedParsed.error">
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
            
            <div v-if="selectedTreeNode" class="selected-node" style="padding: 1rem; border-top: 1px solid var(--c-border); background: #fdfdfd;">
               <h5 style="margin: 0 0 0.5rem 0; font-size: 0.9rem;">Selected: {{ selectedTreeNode.path }}</h5>
               <p class="hint-text" style="margin-bottom: 0.5rem;">{{ selectedTreeNode.tooltip || 'No tooltip available.' }}</p>
               <div class="btn-row">
                  <button class="btn btn-primary btn-sm" @click="useNodePathAsExpression">Query Path →</button>
               </div>
            </div>
          </div>
        </div>

        <!-- MODULE 2: FORM -->
        <div v-if="activeTab === 'form'" class="split-pane">
           <div class="pane">
              <div class="pane-header">Questionnaire Source</div>
              <!-- LEARNING TIP -->
              <div style="background: #eff6ff; padding: 0.75rem; border-bottom: 1px solid #dbeafe; font-size: 0.9rem; color: #1e40af;">
                  <strong>Rendering:</strong> {{ learningModules.rendering.sections[0].content }}
              </div>
              <div class="pane-body">
                <JsonTooltipEditor
                  v-model="questionnaireJson"
                  resource-type="Questionnaire"
                  style="height: 100%; border: none;"
                />
              </div>
           </div>

           <div class="pane" style="background: #f8fafc;">
              <div class="pane-header">
                 <span>Live Preview</span>
                 <span class="hint-text" style="font-size: 0.75rem;">Material UI theme</span>
              </div>
              <div class="pane-body" style="padding: 1.5rem;">
                 <DynamicQuestionnaireForm
                    :questionnaire="questionnaireParsed.value"
                    @response-updated="updateGeneratedResponse"
                 />
                 
                 <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--c-border);">
                    <h5 style="margin: 0 0 0.5rem 0;">Live Response JSON</h5>
                    <pre class="code-output" style="max-height: 200px; overflow: auto;">{{ JSON.stringify(generatedResponse, null, 2) }}</pre>
                 </div>
              </div>
           </div>
        </div>

        <!-- MODULE 3: FHIRPATH -->
        <div v-if="activeTab === 'fhirpath'" class="split-pane">
           <!-- Left -->
           <div class="flex-col gap-2" style="height: 100%;">
              <div class="pane" style="flex: 0 0 auto;">
                 <div class="pane-header">Target</div>
                 <div style="padding: 1rem;">
                    <select id="fhirpath-target" v-model="selectedFhirPathResource" class="input-select w-full">
                      <option value="Questionnaire">Questionnaire (Source)</option>
                      <option value="QuestionnaireResponse">Sample Response</option>
                      <option value="GeneratedResponse">Generated Form Response</option>
                    </select>
                 </div>
              </div>

              <div class="pane" style="flex: 1;">
                 <div class="pane-header">Expression</div>
                 <!-- LEARNING TIP -->
                <div style="background: #eff6ff; padding: 0.75rem; border-bottom: 1px solid #dbeafe; font-size: 0.9rem; color: #1e40af;">
                    <strong>Logic:</strong> {{ learningModules.logic.sections[0].content }}
                </div>
                 <div class="pane-body">
                    <textarea 
                       v-model="fhirPathExpression" 
                       class="editor" 
                       style="width: 100%; height: 100%; border: none; padding: 1rem; font-family: monospace; resize: none; outline: none;" 
                       placeholder="e.g. item.where(linkId='q1').answer.valueString"
                    />
                 </div>
              </div>
           </div>

           <!-- Right -->
           <div class="flex-col gap-2" style="height: 100%;">
              <div class="pane" style="flex: 1;">
                 <div class="pane-header">Result</div>
                 <div class="pane-body" style="padding: 0;">
                    <div v-if="fhirPathError" class="error-text">{{ fhirPathError }}</div>
                    <pre v-else class="code-output" style="height: 100%; margin: 0; border-radius: 0;">{{ fhirPathResult || '// Result will appear here' }}</pre>
                 </div>
              </div>
              
              <div class="pane" style="flex: 0 0 auto;">
                 <div class="pane-header">Examples</div>
                 <div class="example-grid">
                    <button
                      v-for="example in activeFhirPathExamples"
                      :key="example.label"
                      type="button"
                      class="btn btn-sm"
                      @click="applyExample(example.expression)"
                    >
                      {{ example.label }}
                    </button>
                 </div>
              </div>
           </div>
        </div>
        
        <!-- MODULE 4: QUIZ (Interactive) -->
        <div v-if="activeTab === 'quiz'" class="card" style="max-width: 800px; margin: 0 auto;">
           <h2>Module 4: Knowledge Check</h2>
           <p class="hint-text" style="margin-bottom: 2rem;">Test your mastery of SDC concepts.</p>
           
           <div v-if="!quizSubmitted">
              <div v-for="(q, idx) in quizQuestions" :key="idx" style="margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--c-border);">
                 <p style="font-weight: 600; margin-bottom: 1rem;">{{ idx + 1 }}. {{ q.question }}</p>
                 <div style="display: grid; gap: 0.5rem;">
                    <label v-for="(opt, optIdx) in q.options" :key="optIdx" style="display: flex; gap: 0.5rem; align-items: flex-start; cursor: pointer;">
                       <input type="radio" :name="'q' + idx" :value="optIdx" v-model="quizAnswers[idx]" style="margin-top: 4px;">
                       <span>{{ opt }}</span>
                    </label>
                 </div>
              </div>
              
              <button class="btn btn-primary" @click="submitQuiz">Submit Quiz</button>
           </div>
           
           <div v-else style="text-align: center; padding: 2rem;">
              <h3 style="margin-bottom: 1rem;">Results</h3>
              <div style="font-size: 3rem; font-weight: bold; color: var(--c-accent);">{{ quizPercentage }}%</div>
              <p style="margin-bottom: 2rem;">You scored {{ quizScore }} out of {{ quizQuestions.length }}.</p>
              
              <button class="btn btn-sm" @click="resetQuiz">Try Again</button>
           </div>
        </div>
        
        <!-- MODULE 5: REFERENCE -->
        <div v-if="activeTab === 'authoring'" class="card">
            <div class="tabs" style="border-bottom: 1px solid var(--c-border); padding-bottom: 1rem; margin-bottom: 1rem;">
                <button
                  v-for="section in authoringSections"
                  :key="section.id"
                  type="button"
                  class="tab-btn"
                  :class="{ active: authoringSection === section.id }"
                  @click="authoringSection = section.id"
                  style="border: none; background: none; font-weight: 600; cursor: pointer; padding: 0.5rem 1rem;"
                >
                  <span :style="{ color: authoringSection === section.id ? 'var(--c-accent)' : 'var(--c-text-secondary)' }">
                     {{ section.label }}
                  </span>
                  <div v-if="authoringSection === section.id" style="height: 2px; background: var(--c-accent); margin-top: 4px;"></div>
                </button>
            </div>
            
            <template v-if="authoringSection === 'basics'">
               <h4>How to Write Questionnaire JSON (R4)</h4>
               <ol class="steps" style="line-height: 1.8; color: var(--c-text-primary);">
                 <li>Start with required metadata: <strong>resourceType</strong>, <strong>status</strong>, <strong>item</strong>.</li>
               </ol>
            </template>
            
            <template v-if="authoringSection === 'prepopulation'">
               <div class="reference-grid">
                  <article v-for="example in prepopulationExamples" :key="example.title" class="reference-card">
                     <h5>{{ example.title }}</h5>
                     <pre class="code-output" style="font-size: 0.75rem;">{{ example.snippet }}</pre>
                  </article>
               </div>
            </template>

            <template v-if="authoringSection === 'fhirpath'">
               <div style="margin-bottom: 1rem;">
                  <input v-model="cheatSheetQuery" class="input-select w-full" placeholder="Search..." style="max-width: 400px;">
               </div>
               <div class="reference-grid compact">
                  <article v-for="op in filteredFhirPathOperators" :key="op.symbol" class="reference-card">
                     <h5>{{ op.symbol }}</h5>
                     <p class="hint-text">{{ op.meaning }}</p>
                  </article>
               </div>
            </template>
            
            <template v-if="authoringSection === 'sdc-context'">
                <div class="reference-grid">
                  <article v-for="entry in sdcExpressionContextCheatSheet" :key="entry.area" class="reference-card">
                     <h5>{{ entry.area }}</h5>
                    <p class="hint-text">{{ entry.notes }}</p>
                  </article>
                </div>
            </template>
        </div>

      </div>
    </main>
  </div>
</template>
