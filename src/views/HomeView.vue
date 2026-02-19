<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import fhirpath from 'fhirpath'
import r4Model from 'fhirpath/fhir-context/r4'
import DynamicQuestionnaireForm from '@/components/DynamicQuestionnaireForm.vue'
import FhirPathEditor from '@/components/FhirPathEditor.vue'
import FhirServerPanel from '@/components/FhirServerPanel.vue'
import JsonTooltipEditor from '@/components/JsonTooltipEditor.vue'
import ResourceTreeNode from '@/components/ResourceTreeNode.vue'
import { getPropertyGuide } from '@/data/fhirPropertyTooltips'
import { learningModules } from '@/data/learningModules'
import { renderMarkdown } from '@/utils/renderMarkdown'
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
  renderingExtensionsCatalog,
  behaviorExamples,
  populationMethodExamples,
  extractionMethodExamples,
  modularFormsExamples,
  adaptiveFormsExamples,
  workflowRoles,
  conformanceProfiles,
  questionnaireSearchParams,
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
    goal: 'Build forms & rendering extensions.',
    icon: 'form'
  },
  {
    id: 'fhirpath',
    label: 'Module 3: Logic Lab',
    goal: 'Test extraction & calculation.',
    icon: 'code'
  },
  {
    id: 'behavior',
    label: 'Module 4: Behavior',
    goal: 'Constraints, scoring & enableWhen.',
    icon: '⚙️'
  },
  {
    id: 'population',
    label: 'Module 5: Population',
    goal: 'Pre-fill forms from FHIR data.',
    icon: '📥'
  },
  {
    id: 'extraction',
    label: 'Module 6: Extraction',
    goal: 'Convert responses to resources.',
    icon: '📤'
  },
  {
    id: 'modular',
    label: 'Module 7: Modular Forms',
    goal: 'Compose from sub-questionnaires.',
    icon: '🧩'
  },
  {
    id: 'adaptive',
    label: 'Module 8: Adaptive Forms',
    goal: 'Dynamic question delivery.',
    icon: '🔄'
  },
  {
    id: 'workflow',
    label: 'Module 9: Workflow',
    goal: 'Roles, conformance & search.',
    icon: '🔧'
  },
  {
    id: 'server',
    label: 'FHIR Server',
    goal: 'Connect to real servers.',
    icon: '🌐'
  },
  {
    id: 'playground',
    label: 'Playground',
    goal: 'Experiment freely.',
    icon: '🧪'
  },
  {
    id: 'quiz',
    label: 'Quiz',
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

// ── FHIR Server Status ──
import { loadServers as _loadServers, getActiveServer as _getActiveServer } from '@/utils/fhirClient'

function initServerStatus() {
  const servers = _loadServers()
  for (const type of ['fhir', 'terminology']) {
    if (!servers.find(s => s.type === type && s.active)) {
      const first = servers.find(s => s.type === type)
      if (first) first.active = true
    }
  }
  const fhir = _getActiveServer(servers, 'fhir')
  const tx = _getActiveServer(servers, 'terminology')
  return {
    fhir: fhir ? { name: fhir.name, url: fhir.url, connected: false } : null,
    terminology: tx ? { name: tx.name, url: tx.url, connected: false } : null,
  }
}

const serverStatus = ref(initServerStatus())

function onServerStatusChange(status) {
  serverStatus.value = status
}
function onLoadQuestionnaireFromServer(jsonStr) {
  pgJson.value = jsonStr
  pgSelectedTemplate.value = 'blank'
  activeTab.value = 'playground'
}
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

// ── Accordion / Collapsible State ──
const expandedSections = ref({})
function toggleSection(moduleId, idx) {
  const key = `${moduleId}-${idx}`
  expandedSections.value[key] = !expandedSections.value[key]
}
function isSectionOpen(moduleId, idx) {
  const key = `${moduleId}-${idx}`
  // First section defaults open
  return expandedSections.value[key] ?? (idx === 0)
}

// ── Progress Tracker ──
const visitedModules = ref(new Set())
function loadProgress() {
  try {
    const saved = localStorage.getItem('fhirsdc-progress')
    if (saved) visitedModules.value = new Set(JSON.parse(saved))
  } catch { /* ignore */ }
}
function saveProgress() {
  try {
    localStorage.setItem('fhirsdc-progress', JSON.stringify([...visitedModules.value]))
  } catch { /* ignore */ }
}
watch(activeTab, (tabId) => {
  visitedModules.value.add(tabId)
  saveProgress()
}, { immediate: true })
onMounted(loadProgress)

// ── Playground State ──
const playgroundTemplates = [
  {
    id: 'blank',
    label: 'Blank Questionnaire',
    json: {
      resourceType: 'Questionnaire',
      id: 'my-form',
      url: 'http://example.org/fhir/Questionnaire/my-form',
      status: 'draft',
      title: 'My Custom Form',
      item: [
        { linkId: 'q1', text: 'Your first question', type: 'string' },
      ],
    },
  },
  {
    id: 'enablewhen',
    label: 'EnableWhen Demo',
    json: {
      resourceType: 'Questionnaire',
      id: 'enablewhen-demo',
      status: 'active',
      title: 'EnableWhen Playground',
      item: [
        {
          linkId: 'has-allergy',
          text: 'Do you have any allergies?',
          type: 'boolean',
        },
        {
          linkId: 'allergy-detail',
          text: 'Describe your allergies',
          type: 'text',
          enableWhen: [{ question: 'has-allergy', operator: '=', answerBoolean: true }],
        },
        {
          linkId: 'severity',
          text: 'Severity',
          type: 'choice',
          enableWhen: [{ question: 'has-allergy', operator: '=', answerBoolean: true }],
          answerOption: [
            { valueCoding: { code: 'mild', display: 'Mild' } },
            { valueCoding: { code: 'moderate', display: 'Moderate' } },
            { valueCoding: { code: 'severe', display: 'Severe' } },
          ],
        },
      ],
    },
  },
  {
    id: 'calculated',
    label: 'Calculated Expression',
    json: {
      resourceType: 'Questionnaire',
      id: 'calc-demo',
      status: 'active',
      title: 'BMI Calculator',
      item: [
        { linkId: 'height', text: 'Height (cm)', type: 'integer', required: true },
        { linkId: 'weight', text: 'Weight (kg)', type: 'integer', required: true },
        {
          linkId: 'bmi',
          text: 'BMI (auto-calculated)',
          type: 'decimal',
          readOnly: true,
          extension: [
            {
              url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression',
              valueExpression: {
                language: 'text/fhirpath',
                expression:
                  "let h := item.where(linkId='height').answer.valueInteger.first(); let w := item.where(linkId='weight').answer.valueInteger.first(); iif(h.exists() and w.exists() and h > 0, (w / ((h/100) * (h/100))).round(1), {})",
              },
            },
          ],
        },
      ],
    },
  },
  {
    id: 'scoring',
    label: 'PHQ-2 Scoring',
    json: {
      resourceType: 'Questionnaire',
      id: 'phq2-demo',
      status: 'active',
      title: 'PHQ-2 Depression Screen',
      item: [
        {
          linkId: 'phq1',
          text: 'Little interest or pleasure in doing things?',
          type: 'choice',
          answerOption: [
            { valueCoding: { code: '0', display: 'Not at all' } },
            { valueCoding: { code: '1', display: 'Several days' } },
            { valueCoding: { code: '2', display: 'More than half the days' } },
            { valueCoding: { code: '3', display: 'Nearly every day' } },
          ],
        },
        {
          linkId: 'phq2',
          text: 'Feeling down, depressed, or hopeless?',
          type: 'choice',
          answerOption: [
            { valueCoding: { code: '0', display: 'Not at all' } },
            { valueCoding: { code: '1', display: 'Several days' } },
            { valueCoding: { code: '2', display: 'More than half the days' } },
            { valueCoding: { code: '3', display: 'Nearly every day' } },
          ],
        },
        {
          linkId: 'total',
          text: 'Total Score',
          type: 'integer',
          readOnly: true,
          extension: [
            {
              url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression',
              valueExpression: {
                language: 'text/fhirpath',
                expression:
                  "let a := item.where(linkId='phq1').answer.valueCoding.code.first().toInteger(); let b := item.where(linkId='phq2').answer.valueCoding.code.first().toInteger(); iif(a.exists() and b.exists(), a + b, {})",
              },
            },
          ],
        },
      ],
    },
  },
  {
    id: 'validation',
    label: 'Custom Validation',
    json: {
      resourceType: 'Questionnaire',
      id: 'validation-demo',
      status: 'active',
      title: 'Custom Validation Demo',
      item: [
        {
          linkId: 'dob',
          text: 'Date of Birth',
          type: 'date',
          required: true,
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-constraint',
              extension: [
                { url: 'key', valueId: 'dob-past' },
                { url: 'severity', valueCode: 'error' },
                { url: 'human', valueString: 'Date of Birth must be in the past.' },
                {
                  url: 'expression',
                  valueString:
                    "%resource.item.where(linkId='dob').answer.valueDate.empty() or %resource.item.where(linkId='dob').answer.valueDate <= today()",
                },
              ],
            },
          ],
        },
        {
          linkId: 'systolic',
          text: 'Systolic BP (mmHg)',
          type: 'integer',
          required: true,
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-constraint',
              extension: [
                { url: 'key', valueId: 'bp-sys-range' },
                { url: 'severity', valueCode: 'error' },
                { url: 'human', valueString: 'Systolic BP must be between 60 and 300 mmHg.' },
                {
                  url: 'expression',
                  valueString:
                    "%resource.item.where(linkId='systolic').answer.valueInteger.empty() or (%resource.item.where(linkId='systolic').answer.valueInteger >= 60 and %resource.item.where(linkId='systolic').answer.valueInteger <= 300)",
                },
              ],
            },
          ],
        },
        {
          linkId: 'diastolic',
          text: 'Diastolic BP (mmHg)',
          type: 'integer',
          required: true,
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-constraint',
              extension: [
                { url: 'key', valueId: 'bp-dia-range' },
                { url: 'severity', valueCode: 'error' },
                { url: 'human', valueString: 'Diastolic BP must be between 40 and 200 mmHg.' },
                {
                  url: 'expression',
                  valueString:
                    "%resource.item.where(linkId='diastolic').answer.valueInteger.empty() or (%resource.item.where(linkId='diastolic').answer.valueInteger >= 40 and %resource.item.where(linkId='diastolic').answer.valueInteger <= 200)",
                },
              ],
            },
            {
              url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-constraint',
              extension: [
                { url: 'key', valueId: 'bp-cross' },
                { url: 'severity', valueCode: 'error' },
                {
                  url: 'human',
                  valueString: 'Systolic BP must be greater than Diastolic BP.',
                },
                {
                  url: 'expression',
                  valueString:
                    "%resource.item.where(linkId='systolic').answer.valueInteger.empty() or %resource.item.where(linkId='diastolic').answer.valueInteger.empty() or (%resource.item.where(linkId='systolic').answer.valueInteger > %resource.item.where(linkId='diastolic').answer.valueInteger)",
                },
              ],
            },
          ],
        },
        {
          linkId: 'email',
          text: 'Contact email',
          type: 'string',
          maxLength: 50,
          extension: [
            {
              url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-constraint',
              extension: [
                { url: 'key', valueId: 'email-at' },
                { url: 'severity', valueCode: 'warning' },
                { url: 'human', valueString: 'Email should contain an @ symbol.' },
                {
                  url: 'expression',
                  valueString:
                    "%resource.item.where(linkId='email').answer.valueString.empty() or %resource.item.where(linkId='email').answer.valueString.contains('@')",
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'mixed',
    label: 'All Item Types',
    json: {
      resourceType: 'Questionnaire',
      id: 'all-types',
      status: 'active',
      title: 'All Item Types Demo',
      item: [
        { linkId: 'grp', text: 'Patient Info', type: 'group', item: [
          { linkId: 'name', text: 'Full name', type: 'string', required: true },
          { linkId: 'notes', text: 'Additional notes', type: 'text' },
          { linkId: 'age', text: 'Age', type: 'integer' },
          { linkId: 'temp', text: 'Temperature (°C)', type: 'decimal' },
          { linkId: 'visit-date', text: 'Visit date', type: 'date' },
          { linkId: 'consent', text: 'I consent to data collection', type: 'boolean' },
        ]},
        { linkId: 'priority', text: 'Priority', type: 'choice', answerOption: [
          { valueCoding: { code: 'low', display: 'Low' } },
          { valueCoding: { code: 'medium', display: 'Medium' } },
          { valueCoding: { code: 'high', display: 'High' } },
        ]},
      ],
    },
  },
]

const pgSelectedTemplate = ref('blank')
const pgJson = ref(JSON.stringify(playgroundTemplates[0].json, null, 2))
const pgFhirPathExpr = ref('')
const pgFhirPathResult = ref('')
const pgFhirPathError = ref('')
const pgGeneratedResponse = ref(null)
const pgOutputTab = ref('form')

const pgParsed = computed(() => safeParse(pgJson.value))

function formatPgJson() {
  try {
    const parsed = JSON.parse(pgJson.value)
    pgJson.value = JSON.stringify(parsed, null, 2)
  } catch { /* ignore invalid JSON */ }
}

const pgValidationIssues = computed(() => {
  if (pgParsed.value.error) return ['JSON is not valid: ' + pgParsed.value.error]
  return validateQuestionnaire(pgParsed.value.value)
})

function pgLoadTemplate(templateId) {
  const tpl = playgroundTemplates.find((t) => t.id === templateId)
  if (!tpl) return
  pgSelectedTemplate.value = templateId
  pgJson.value = JSON.stringify(tpl.json, null, 2)
  pgGeneratedResponse.value = null
  pgFhirPathExpr.value = ''
  pgFhirPathResult.value = ''
  pgFhirPathError.value = ''
}

function pgUpdateResponse(resp) {
  pgGeneratedResponse.value = resp
}

// ── Server-Side Operations from Playground ──
import { validateResource as _validateResource, createResource as _createResource, updateResource as _updateResource, populateQuestionnaire as _populateQuestionnaire, extractResponse as _extractResponse } from '@/utils/fhirClient'
const pgServerValidateResult = ref(null)
const pgServerValidateLoading = ref(false)
const pgServerValidateError = ref('')
const pgUploadLoading = ref(false)
const pgUploadResult = ref('')

// ── Populate & Extract State ──
const pgPopulateLoading = ref(false)
const pgPopulateResult = ref(null)
const pgPopulateError = ref('')
const pgPopulateSubject = ref('Patient/example')
const pgExtractLoading = ref(false)
const pgExtractResult = ref(null)
const pgExtractError = ref('')

const hasActiveServer = computed(() => !!serverStatus.value.fhir)

async function pgValidateOnServer() {
  if (!hasActiveServer.value) {
    pgServerValidateError.value = 'No FHIR server configured. Go to the FHIR Server tab to add one, then click "🔌 Test" to connect.'
    pgOutputTab.value = 'validate'
    return
  }
  pgServerValidateLoading.value = true
  pgServerValidateError.value = ''
  pgServerValidateResult.value = null
  pgOutputTab.value = 'validate'
  try {
    const servers = _loadServers()
    const activeServer = _getActiveServer(servers, 'fhir')
    if (!activeServer) throw new Error('No active FHIR server')
    const resource = JSON.parse(pgJson.value)
    pgServerValidateResult.value = await _validateResource(activeServer, resource)
  } catch (err) {
    pgServerValidateError.value = err.message
  }
  pgServerValidateLoading.value = false
}

async function pgUploadToServer() {
  if (!hasActiveServer.value) {
    pgUploadResult.value = '❌ No FHIR server configured. Go to the FHIR Server tab to add one.'
    return
  }
  pgUploadLoading.value = true
  pgUploadResult.value = ''
  try {
    const servers = _loadServers()
    const activeServer = _getActiveServer(servers, 'fhir')
    if (!activeServer) throw new Error('No active FHIR server')
    const resource = JSON.parse(pgJson.value)
    let result
    if (resource.id) {
      result = await _updateResource(activeServer, resource)
      pgUploadResult.value = `✅ Updated ${result.resourceType}/${result.id} on server`
    } else {
      result = await _createResource(activeServer, resource)
      pgUploadResult.value = `✅ Created ${result.resourceType}/${result.id} on server`
    }
  } catch (err) {
    pgUploadResult.value = `❌ ${err.message}`
  }
  pgUploadLoading.value = false
}

function pgRunFhirPath() {
  pgFhirPathError.value = ''
  pgFhirPathResult.value = ''
  if (!pgGeneratedResponse.value || !pgFhirPathExpr.value.trim()) return
  try {
    const result = evaluateWithLetSupport(pgGeneratedResponse.value, pgFhirPathExpr.value)
    pgFhirPathResult.value = JSON.stringify(result, null, 2)
  } catch (err) {
    pgFhirPathError.value = err instanceof Error ? err.message : 'FHIRPath evaluation failed.'
  }
}

watch(pgFhirPathExpr, () => { pgRunFhirPath() })
watch(pgGeneratedResponse, () => { pgRunFhirPath() })

// ── Populate: call $populate on the server ──
async function pgPopulate() {
  if (!hasActiveServer.value) {
    pgPopulateError.value = 'No FHIR server configured. Go to the FHIR Server tab to add one.'
    pgOutputTab.value = 'populate'
    return
  }
  pgPopulateLoading.value = true
  pgPopulateError.value = ''
  pgPopulateResult.value = null
  pgOutputTab.value = 'populate'
  try {
    const servers = _loadServers()
    const activeServer = _getActiveServer(servers, 'fhir')
    if (!activeServer) throw new Error('No active FHIR server')
    const q = JSON.parse(pgJson.value)
    const result = await _populateQuestionnaire(activeServer, {
      questionnaireId: q.id || undefined,
      questionnaireResource: q,
      subjectRef: pgPopulateSubject.value || undefined,
    })
    pgPopulateResult.value = result
  } catch (err) {
    pgPopulateError.value = err.message
  }
  pgPopulateLoading.value = false
}

// ── Extract: call $extract on the server ──
async function pgExtract() {
  if (!hasActiveServer.value) {
    pgExtractError.value = 'No FHIR server configured. Go to the FHIR Server tab to add one.'
    pgOutputTab.value = 'extract'
    return
  }
  if (!pgGeneratedResponse.value) {
    pgExtractError.value = 'No QuestionnaireResponse available — fill the form first.'
    pgOutputTab.value = 'extract'
    return
  }
  pgExtractLoading.value = true
  pgExtractError.value = ''
  pgExtractResult.value = null
  pgOutputTab.value = 'extract'
  try {
    const servers = _loadServers()
    const activeServer = _getActiveServer(servers, 'fhir')
    if (!activeServer) throw new Error('No active FHIR server')
    const result = await _extractResponse(activeServer, pgGeneratedResponse.value)
    pgExtractResult.value = result
  } catch (err) {
    pgExtractError.value = err.message
  }
  pgExtractLoading.value = false
}

// ── Playground Mode ──
const pgMode = ref('form') // 'form' | 'fhirpath'

// ── FHIRPath Explorer State ──
const fpSampleResources = {
  Patient: {
    resourceType: 'Patient', id: 'example',
    name: [{ use: 'official', family: 'Chalmers', given: ['Peter', 'James'] }, { use: 'usual', given: ['Jim'] }],
    telecom: [{ system: 'phone', value: '(03) 5555 6473', use: 'work', rank: 1 }, { system: 'phone', value: '(03) 3410 5613', use: 'mobile', rank: 2 }],
    gender: 'male', birthDate: '1974-12-25', active: true,
    address: [{ use: 'home', type: 'both', text: '534 Erewhon St PeasantVille, Rainbow, Vic  3999', line: ['534 Erewhon St'], city: 'PleasantVille', district: 'Rainbow', state: 'Vic', postalCode: '3999', period: { start: '1974-12-25' } }],
    managingOrganization: { reference: 'Organization/1' },
  },
  Observation: {
    resourceType: 'Observation', id: 'blood-pressure', status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs', display: 'Vital Signs' }] }],
    code: { coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }] },
    subject: { reference: 'Patient/example' }, effectiveDateTime: '2024-09-17',
    component: [
      { code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] }, valueQuantity: { value: 120, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' } },
      { code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }] }, valueQuantity: { value: 80, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' } },
    ],
  },
  Questionnaire: {
    resourceType: 'Questionnaire', id: 'example', status: 'active', title: 'Example Questionnaire', url: 'http://example.org/fhir/Questionnaire/example',
    item: [
      { linkId: 'name', text: 'What is your name?', type: 'string', required: true },
      { linkId: 'dob', text: 'Date of birth', type: 'date' },
      { linkId: 'allergy', text: 'Do you have allergies?', type: 'boolean' },
      { linkId: 'allergy-detail', text: 'Describe your allergies', type: 'text', enableWhen: [{ question: 'allergy', operator: '=', answerBoolean: true }] },
    ],
  },
  QuestionnaireResponse: {
    resourceType: 'QuestionnaireResponse', id: 'example-response', status: 'completed',
    questionnaire: 'http://example.org/fhir/Questionnaire/example', authored: '2024-09-17T14:00:00Z',
    item: [
      { linkId: 'name', answer: [{ valueString: 'Jane Doe' }] },
      { linkId: 'dob', answer: [{ valueDate: '1990-03-15' }] },
      { linkId: 'allergy', answer: [{ valueBoolean: true }] },
      { linkId: 'allergy-detail', answer: [{ valueString: 'Peanuts, shellfish' }] },
    ],
  },
  Bundle: {
    resourceType: 'Bundle', id: 'example-bundle', type: 'searchset', total: 2,
    entry: [
      { fullUrl: 'http://example.org/fhir/Patient/1', resource: { resourceType: 'Patient', id: '1', name: [{ family: 'Smith', given: ['John'] }], gender: 'male', birthDate: '1985-01-15' } },
      { fullUrl: 'http://example.org/fhir/Patient/2', resource: { resourceType: 'Patient', id: '2', name: [{ family: 'Doe', given: ['Jane'] }], gender: 'female', birthDate: '1990-03-20' } },
    ],
  },
  Condition: {
    resourceType: 'Condition', id: 'example',
    clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
    verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }] },
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis', display: 'Encounter Diagnosis' }] }],
    code: { coding: [{ system: 'http://snomed.info/sct', code: '386661006', display: 'Fever' }], text: 'Fever' },
    subject: { reference: 'Patient/example' }, onsetDateTime: '2024-09-10', recordedDate: '2024-09-12',
  },
}

const fpQuickExamples = {
  Patient: [
    { label: 'Official name', expr: "name.where(use='official').given" },
    { label: 'Family name', expr: 'name.first().family' },
    { label: 'Is active?', expr: 'active' },
    { label: 'Birth year', expr: 'birthDate.substring(0,4)' },
    { label: 'Phone numbers', expr: "telecom.where(system='phone').value" },
    { label: 'Home address city', expr: "address.where(use='home').city" },
    { label: 'Has multiple names?', expr: 'name.count() > 1' },
    { label: 'All given names', expr: 'name.given' },
  ],
  Observation: [
    { label: 'Status', expr: 'status' },
    { label: 'LOINC code', expr: 'code.coding.code' },
    { label: 'Systolic value', expr: "component.where(code.coding.code='8480-6').valueQuantity.value" },
    { label: 'Diastolic value', expr: "component.where(code.coding.code='8462-4').valueQuantity.value" },
    { label: 'All component values', expr: 'component.valueQuantity.value' },
    { label: 'Category display', expr: 'category.coding.display' },
  ],
  Questionnaire: [
    { label: 'All linkIds', expr: 'item.linkId' },
    { label: 'Required items', expr: 'item.where(required=true).text' },
    { label: 'Item types', expr: 'item.type' },
    { label: 'Count items', expr: 'item.count()' },
    { label: 'Has enableWhen?', expr: 'item.where(enableWhen.exists()).text' },
  ],
  QuestionnaireResponse: [
    { label: 'All answers', expr: 'item.answer' },
    { label: 'Name answer', expr: "item.where(linkId='name').answer.valueString" },
    { label: 'DOB answer', expr: "item.where(linkId='dob').answer.valueDate" },
    { label: 'Answered items', expr: 'item.where(answer.exists()).linkId' },
    { label: 'Answer count', expr: 'item.answer.count()' },
  ],
  Bundle: [
    { label: 'Total', expr: 'total' },
    { label: 'All resource types', expr: 'entry.resource.resourceType' },
    { label: 'All patient names', expr: 'entry.resource.name.family' },
    { label: 'First entry ID', expr: 'entry.first().resource.id' },
    { label: 'Entry count', expr: 'entry.count()' },
  ],
  Condition: [
    { label: 'Clinical status', expr: 'clinicalStatus.coding.code' },
    { label: 'SNOMED code', expr: 'code.coding.code' },
    { label: 'Display text', expr: 'code.text' },
    { label: 'Onset date', expr: 'onsetDateTime' },
    { label: 'Is confirmed?', expr: "verificationStatus.coding.code = 'confirmed'" },
  ],
}

const fpSelectedResource = ref('Patient')
const fpResourceJson = ref(JSON.stringify(fpSampleResources.Patient, null, 2))
const fpExpression = ref("name.where(use='official').given")
const fpResult = ref('')
const fpResultError = ref('')
const fpResultType = ref('')
const fpEvalTimeMs = ref(0)
const fpVariables = ref([])
const fpShowVars = ref(false)
const fpHistory = ref([])
const fpShowHistory = ref(false)

const fpParsedResource = computed(() => {
  try { return { value: JSON.parse(fpResourceJson.value), error: null } }
  catch (e) { return { value: null, error: e.message } }
})
const fpCurrentExamples = computed(() => fpQuickExamples[fpSelectedResource.value] || [])
const fpJsonLineCount = computed(() => fpResourceJson.value.split('\n').length)

function fpLoadSampleResource(type) {
  fpSelectedResource.value = type
  const sample = fpSampleResources[type]
  if (sample) fpResourceJson.value = JSON.stringify(sample, null, 2)
  const examples = fpQuickExamples[type]
  if (examples?.length) fpExpression.value = examples[0].expr
  fpResult.value = ''
  fpResultError.value = ''
  fpResultType.value = ''
}

function fpEvaluate() {
  fpResultError.value = ''
  fpResult.value = ''
  fpResultType.value = ''
  fpEvalTimeMs.value = 0
  if (!fpExpression.value.trim()) return
  if (fpParsedResource.value.error) {
    fpResultError.value = 'Cannot evaluate — the resource JSON is invalid.'
    fpResultType.value = 'error'
    return
  }
  const env = {}
  for (const v of fpVariables.value) {
    if (v.name && v.value.trim()) {
      try { env[v.name] = JSON.parse(v.value) } catch { env[v.name] = v.value }
    }
  }
  const start = performance.now()
  try {
    const letPattern = /^let\s+(\w+)\s*:=\s*(.+?);\s*/
    let remaining = fpExpression.value.trim()
    const varNames = []
    while (letPattern.test(remaining)) {
      const match = remaining.match(letPattern)
      const varResult = fhirpath.evaluate(fpParsedResource.value.value, match[2], env, r4Model)
      env[match[1]] = varResult.length === 1 ? varResult[0] : varResult
      varNames.push(match[1])
      remaining = remaining.substring(match[0].length)
    }
    const sortedNames = [...varNames].sort((a, b) => b.length - a.length)
    for (const name of sortedNames) {
      remaining = remaining.replace(new RegExp(`(?<!%)\\b${name}\\b`, 'g'), `%${name}`)
    }
    const res = fhirpath.evaluate(fpParsedResource.value.value, remaining, env, r4Model)
    fpEvalTimeMs.value = Math.round((performance.now() - start) * 100) / 100
    if (res.length === 0) {
      fpResult.value = '[]  (empty result)'
      fpResultType.value = 'empty'
    } else {
      fpResult.value = JSON.stringify(res, null, 2)
      fpResultType.value = 'success'
    }
    // History
    const existing = fpHistory.value.findIndex((h) => h.expression === fpExpression.value)
    if (existing !== -1) fpHistory.value.splice(existing, 1)
    fpHistory.value.unshift({ expression: fpExpression.value, resultCount: res.length, timestamp: new Date().toLocaleTimeString() })
    if (fpHistory.value.length > 30) fpHistory.value.pop()
  } catch (e) {
    fpEvalTimeMs.value = Math.round((performance.now() - start) * 100) / 100
    fpResultError.value = e.message || 'Evaluation failed.'
    fpResultType.value = 'error'
  }
}

function fpApplyExample(expr) { fpExpression.value = expr; fpEvaluate() }
function fpApplyFromHistory(entry) { fpExpression.value = entry.expression; fpShowHistory.value = false; fpEvaluate() }
function fpAddVariable() { fpVariables.value.push({ name: '', value: '' }) }
function fpRemoveVariable(idx) { fpVariables.value.splice(idx, 1) }
function fpFormatJson() { try { fpResourceJson.value = JSON.stringify(JSON.parse(fpResourceJson.value), null, 2) } catch {} }
function fpHandleLoadFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try { const json = JSON.parse(e.target.result); fpResourceJson.value = JSON.stringify(json, null, 2); if (json.resourceType && fpSampleResources[json.resourceType]) fpSelectedResource.value = json.resourceType } catch { fpResourceJson.value = e.target.result }
  }
  reader.readAsText(file)
}

let fpEvalTimer = null
watch(fpExpression, () => { clearTimeout(fpEvalTimer); fpEvalTimer = setTimeout(() => fpEvaluate(), 400) })
watch(fpResourceJson, () => { clearTimeout(fpEvalTimer); fpEvalTimer = setTimeout(() => fpEvaluate(), 600) })

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
    answer: 1,
    explanation: "SDC extends the base Questionnaire and QuestionnaireResponse with extensions for population, rendering, behavior, extraction, modular and adaptive forms. See Module 0."
  },
  {
    question: "Which `item.type` in a FHIR Questionnaire represents a question with a set of allowed answers where multiple selections may be permitted?",
    options: [
      "group",
      "string",
      "choice",
      "boolean"
    ],
    answer: 2,
    explanation: "`choice` type allows selection from a defined set of answers (answerOption or answerValueSet). With `repeats: true`, multiple selections are allowed. See Module 1."
  },
  {
    question: "In a FHIRPath expression used within an SDC Questionnaire, what does `%resource` typically refer to?",
    options: [
      "The FHIR server's root URL",
      "The QuestionnaireResponse currently being populated or authored",
      "The Patient resource associated with the form",
      "The structure definition of the Questionnaire"
    ],
    answer: 1,
    explanation: "%resource refers to the QuestionnaireResponse being authored. Other SDC variables include %questionnaire, %qitem, and launch context variables like %patient. See Module 3."
  },
  {
    question: "Which extension is used to specify that a Questionnaire item should be hidden until a specific condition is met?",
    options: [
      "enableWhen",
      "initialExpression",
      "variable",
      "itemControl"
    ],
    answer: 0,
    explanation: "enableWhen conditions control item visibility based on answers to other questions. enableWhenExpression offers a FHIRPath alternative for complex logic. See Module 4."
  },
  {
    question: "How are `linkId` elements used effectively in a QuestionnaireResponse?",
    options: [
      "They link to external web pages for help text",
      "They are optional labels for human readability only",
      "They must uniquely correspond to the `linkId` of the items in the defining Questionnaire to map answers back to questions",
      "They are automatically generated hashes used for security"
    ],
    answer: 2,
    explanation: "linkId values must be unique within a Questionnaire and are used to map QuestionnaireResponse answers back to their defining question items. See Module 1."
  },
  {
    question: "Which SDC extension controls the UI widget type (e.g., radio buttons vs dropdown) for a Questionnaire item?",
    options: [
      "rendering-style",
      "questionnaire-itemControl",
      "entryFormat",
      "displayCategory"
    ],
    answer: 1,
    explanation: "The questionnaire-itemControl extension specifies the UI widget type — radio-button, drop-down, slider, autocomplete, check-box, etc. See Module 2."
  },
  {
    question: "What is the purpose of the `rendering-xhtml` extension in SDC?",
    options: [
      "To add inline CSS styles to item labels",
      "To specify a placeholder text for empty fields",
      "To provide rich XHTML content instead of plain text for item display",
      "To set the widget type for rendering"
    ],
    answer: 2,
    explanation: "rendering-xhtml provides rich HTML content instead of plain text for item labels/instructions, enabling formatted text display. See Module 2."
  },
  {
    question: "When multiple `enableWhen` conditions exist on an item, what does `enableBehavior: 'any'` mean?",
    options: [
      "All conditions must be true for the item to show",
      "At least one condition must be true for the item to show",
      "The conditions are evaluated randomly",
      "The item is always visible regardless of conditions"
    ],
    answer: 1,
    explanation: "enableBehavior 'any' means at least one condition must be true (OR logic). 'all' means every condition must be true (AND logic). See Module 4."
  },
  {
    question: "Which SDC extension assigns numeric scoring weights to answer options (e.g., for PHQ-9)?",
    options: [
      "calculatedExpression",
      "ordinalValue (itemWeight)",
      "answerExpression",
      "targetConstraint"
    ],
    answer: 1,
    explanation: "ordinalValue (itemWeight) assigns numeric weights to answer codings, enabling standardized scoring like PHQ-9 and GAD-7. See Module 4."
  },
  {
    question: "What is the key difference between `calculatedExpression` and `initialExpression`?",
    options: [
      "They are identical in behavior",
      "calculatedExpression is evaluated once; initialExpression is continuous",
      "calculatedExpression is continuously re-evaluated as the form changes; initialExpression is evaluated once at form load",
      "initialExpression can only use CQL, not FHIRPath"
    ],
    answer: 2,
    explanation: "calculatedExpression is re-evaluated continuously as the form changes; initialExpression is evaluated only once when the form is first opened. See Module 4."
  },
  {
    question: "Which SDC population method uses `observationLinkPeriod` to automatically pre-fill items from recent Observations?",
    options: [
      "Expression-based population",
      "StructureMap-based population",
      "Observation-based population",
      "Template-based population"
    ],
    answer: 2,
    explanation: "Observation-based population uses observationLinkPeriod to automatically pre-fill items from recent Observations matching the item's code. See Module 5."
  },
  {
    question: "What does the `launchContext` extension declare in an SDC Questionnaire?",
    options: [
      "The URL of the FHIR server to connect to",
      "Named context variables (%patient, %encounter, etc.) that the form filler must supply",
      "The default locale for form rendering",
      "The list of required user permissions"
    ],
    answer: 1,
    explanation: "launchContext declares named context variables (%patient, %encounter, %user) that the form filler must supply when launching the form. See Module 5."
  },
  {
    question: "In observation-based extraction, which extension flags an item for extraction as a FHIR Observation?",
    options: [
      "targetStructureMap",
      "templateExtract",
      "sdc-questionnaire-observationExtract",
      "definition"
    ],
    answer: 2,
    explanation: "sdc-questionnaire-observationExtract flags an item so that its answer is extracted as a FHIR Observation resource. See Module 6."
  },
  {
    question: "Definition-based extraction maps items to target resources using which Questionnaire item property?",
    options: [
      "code",
      "definition (URL to StructureDefinition element)",
      "answerValueSet",
      "extension.url"
    ],
    answer: 1,
    explanation: "Definition-based extraction uses the item's definition URL pointing to a StructureDefinition element to map answers to resource properties. See Module 6."
  },
  {
    question: "What SDC operation assembles a modular Questionnaire with sub-questionnaire references into a flat form?",
    options: [
      "$populate",
      "$extract",
      "$assemble",
      "$next-question"
    ],
    answer: 2,
    explanation: "$assemble takes a modular Questionnaire with subQuestionnaire references and inlines all sub-questionnaires into a single flat form. See Module 7."
  },
  {
    question: "In a modular form, which item type carries the `subQuestionnaire` extension?",
    options: [
      "group",
      "string",
      "display",
      "choice"
    ],
    answer: 2,
    explanation: "A display-type item carries the subQuestionnaire extension. At assembly time, it is replaced by the items from the referenced sub-questionnaire. See Module 7."
  },
  {
    question: "How does the adaptive form `$next-question` operation work?",
    options: [
      "The entire form is downloaded at once and questions are hidden client-side",
      "The form filler repeatedly calls $next-question, sending answered items; the server returns the next question(s)",
      "The server sends all questions in random order",
      "It only works with paper forms"
    ],
    answer: 1,
    explanation: "$next-question is an iterative operation: the form filler sends answered items and the server returns the next question(s) based on scoring logic. See Module 8."
  },
  {
    question: "What is Computerized Adaptive Testing (CAT) in the context of SDC adaptive forms?",
    options: [
      "A method to automatically translate forms into multiple languages",
      "An Item Response Theory approach where each question is chosen to maximize measurement precision based on prior answers",
      "A technique to compress questionnaires for faster download",
      "A way to automatically generate enableWhen conditions"
    ],
    answer: 1,
    explanation: "CAT uses Item Response Theory (IRT) to select questions that maximize measurement precision based on prior answers, reducing the number of questions needed. See Module 8."
  },
  {
    question: "Which SDC system role is responsible for rendering forms, supporting population, and capturing responses?",
    options: [
      "Form Designer",
      "Form Manager",
      "Form Filler",
      "Form Archiver"
    ],
    answer: 2,
    explanation: "The Form Filler is the client application that renders forms, supports population, captures user responses, and submits them. See Module 9."
  },
  {
    question: "Which of these is NOT one of the four SDC extraction methods?",
    options: [
      "Observation-based",
      "Definition-based",
      "CQL-based",
      "Template-based"
    ],
    answer: 2,
    explanation: "The four SDC extraction methods are: Observation-based, Definition-based, StructureMap-based, and Template-based. CQL is an expression language, not an extraction method. See Module 6."
  },
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
  { id: 'rendering-ext', label: 'Rendering Extensions' },
  { id: 'behavior-ext', label: 'Behavior Patterns' },
  { id: 'search-params', label: 'Search Parameters' },
  { id: 'conformance', label: 'Conformance Profiles' },
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

/**
 * Evaluate a FHIRPath expression that may contain `let var := expr;` bindings.
 * fhirpath.js does not natively support the `let` syntax, so we pre-process
 * the expression: each `let` binding is evaluated in sequence, and the resulting
 * value is injected into the environment so the final expression can reference
 * it via `%varName`.
 */
function evaluateWithLetSupport(resource, expression) {
  const letPattern = /^let\s+(\w+)\s*:=\s*(.+?);\s*/
  const env = {}
  const varNames = []
  let remaining = expression.trim()

  while (letPattern.test(remaining)) {
    const match = remaining.match(letPattern)
    const varName = match[1]
    const varExpr = match[2]

    const varResult = fhirpath.evaluate(resource, varExpr, env)
    env[varName] = varResult.length === 1 ? varResult[0] : varResult
    varNames.push(varName)

    remaining = remaining.substring(match[0].length)
  }

  // Rewrite bare variable references to %variable so fhirpath.js resolves them
  // from the environment. Process longer names first to avoid partial replacement.
  const sortedNames = [...varNames].sort((a, b) => b.length - a.length)
  for (const name of sortedNames) {
    remaining = remaining.replace(new RegExp(`(?<!%)\\b${name}\\b`, 'g'), `%${name}`)
  }

  return fhirpath.evaluate(resource, remaining, env)
}

function runFhirPath() {
  fhirPathError.value = ''
  fhirPathResult.value = ''

  const resource = fhirPathTargetResource.value
  if (!resource || !fhirPathExpression.value.trim()) {
    return
  }

  try {
    const result = evaluateWithLetSupport(resource, fhirPathExpression.value)
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

function isJsonSnippet(snippet) {
  // Returns true if the snippet looks like JSON (starts with { or [)
  return /^\s*[\[{]/.test(snippet)
}

function tryInPlayground(snippet) {
  // Load a JSON snippet into the playground and navigate there
  if (!isJsonSnippet(snippet)) {
    // Non-JSON snippets (HTTP requests, etc.) — show as-is but can't render form
    pgJson.value = snippet
    pgSelectedTemplate.value = 'blank'
    activeTab.value = 'playground'
    return
  }

  try {
    const parsed = JSON.parse(snippet)

    // If it's already a full Questionnaire resource, use as-is
    if (parsed.resourceType === 'Questionnaire') {
      pgJson.value = JSON.stringify(parsed, null, 2)
    }
    // If it's a Questionnaire item fragment (has linkId), wrap in a Questionnaire envelope
    else if (parsed.linkId) {
      const wrapped = {
        resourceType: 'Questionnaire',
        id: 'playground-example',
        status: 'active',
        title: parsed.text || 'Playground Example',
        item: [parsed],
      }
      pgJson.value = JSON.stringify(wrapped, null, 2)
    }
    // If it's a Questionnaire-level extension (e.g. launchContext), wrap with the extension
    else if (parsed.url && parsed.extension) {
      const wrapped = {
        resourceType: 'Questionnaire',
        id: 'playground-example',
        status: 'active',
        title: 'Playground Example',
        extension: [parsed],
        item: [
          { linkId: 'example-item', text: 'Example item', type: 'string' },
        ],
      }
      pgJson.value = JSON.stringify(wrapped, null, 2)
    }
    // Any other valid JSON (e.g. QuestionnaireResponse, Parameters) — load as-is
    else {
      pgJson.value = JSON.stringify(parsed, null, 2)
    }
  } catch {
    pgJson.value = snippet
  }

  pgSelectedTemplate.value = 'blank'
  activeTab.value = 'playground'
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
  <div class="app-shell">
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
          
          <!-- Server Status Indicator -->
          <div v-if="serverStatus.fhir || serverStatus.terminology" class="server-status-pills">
            <span v-if="serverStatus.fhir" class="server-pill" :class="{ connected: serverStatus.fhir.connected }" @click="goToStep('server')" title="Click to manage servers">
              🏥 {{ serverStatus.fhir.connected ? '●' : '○' }}
            </span>
            <span v-if="serverStatus.terminology" class="server-pill" :class="{ connected: serverStatus.terminology.connected }" @click="goToStep('server')" title="Click to manage servers">
              📖 {{ serverStatus.terminology.connected ? '●' : '○' }}
            </span>
          </div>

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
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
            <h2 style="margin: 0;">{{ learningModules.intro.title }}</h2>
            <a :href="learningModules.intro.specUrl" target="_blank" rel="noopener" class="spec-link">📖 Official HL7 SDC IG</a>
          </div>

          <!-- SDC Lifecycle Diagram -->
          <div class="lifecycle-diagram">
            <template v-for="(step, sIdx) in [
              { icon: '✏️', label: 'Author', sub: 'Design & publish', bg: '#dbeafe', color: '#1e40af' },
              { icon: '🔍', label: 'Find', sub: 'Search & discover', bg: '#e0e7ff', color: '#3730a3' },
              { icon: '🎨', label: 'Render', sub: 'Present form UI', bg: '#fce7f3', color: '#9d174d' },
              { icon: '📥', label: 'Populate', sub: 'Pre-fill answers', bg: '#dcfce7', color: '#166534' },
              { icon: '⚙️', label: 'Behave', sub: 'Logic & scoring', bg: '#fef3c7', color: '#92400e' },
              { icon: '📝', label: 'Complete', sub: 'User fills form', bg: '#f3e8ff', color: '#6b21a8' },
              { icon: '📤', label: 'Extract', sub: 'Create resources', bg: '#ffedd5', color: '#9a3412' },
            ]" :key="sIdx">
              <div class="lifecycle-step">
                <div class="lifecycle-icon" :style="{ background: step.bg, color: step.color }">{{ step.icon }}</div>
                <div class="lifecycle-label">{{ step.label }}</div>
                <div class="lifecycle-sublabel">{{ step.sub }}</div>
              </div>
              <div v-if="sIdx < 6" class="lifecycle-arrow">→</div>
            </template>
          </div>

          <!-- Collapsible sections with markdown rendering -->
          <div v-for="(section, idx) in learningModules.intro.sections" :key="idx" class="accordion-section">
            <button class="accordion-header" @click="toggleSection('intro', idx)">
              <span class="accordion-chevron" :class="{ open: isSectionOpen('intro', idx) }">▶</span>
              {{ section.title }}
            </button>
            <div v-if="isSectionOpen('intro', idx)" class="accordion-body">
              <div class="md-content" v-html="renderMarkdown(section.content)"></div>
            </div>
          </div>

          <!-- Progress indicator -->
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 2rem; margin-bottom: 1rem;">
            <span style="font-size: 0.8rem; color: var(--c-text-secondary); font-weight: 600;">Your Progress:</span>
            <div v-for="tab in tabs" :key="tab.id" class="progress-dot" :class="{ visited: visitedModules.has(tab.id) }" :title="tab.label"></div>
          </div>

          <div class="flow-grid" style="display:grid; gap:1rem; grid-template-columns: repeat(2, 1fr); margin-top:1rem;">
            <div 
              v-for="(tab, index) in tabs.slice(1)" 
              :key="tab.id" 
              class="card"
              @click="goToStep(tab.id)"
              style="cursor:pointer; border-color:var(--c-border);"
            >
               <div style="display: flex; align-items: center; gap: 0.5rem;">
                 <div class="progress-dot" :class="{ visited: visitedModules.has(tab.id) }"></div>
                 <p style="font-size:0.75rem; color: #94a3b8; margin:0">{{ visitedModules.has(tab.id) ? '✓ Visited' : 'Next Up' }}</p>
               </div>
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
                    <FhirPathEditor
                       :model-value="fhirPathExpression"
                       @update:model-value="fhirPathExpression = $event"
                       placeholder="e.g. item.where(linkId='q1').answer.valueString"
                       style="height: 100%;"
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

        <!-- MODULE 4: BEHAVIOR -->
        <div v-if="activeTab === 'behavior'" class="card" style="max-width: 900px; margin: 0 auto;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
            <h2 style="margin: 0;">{{ learningModules.behavior.title }}</h2>
            <a :href="learningModules.behavior.specUrl" target="_blank" rel="noopener" class="spec-link">📖 HL7 Spec</a>
          </div>

          <div v-for="(section, idx) in learningModules.behavior.sections" :key="idx" class="accordion-section">
            <button class="accordion-header" @click="toggleSection('behavior', idx)">
              <span class="accordion-chevron" :class="{ open: isSectionOpen('behavior', idx) }">▶</span>
              {{ section.title }}
            </button>
            <div v-if="isSectionOpen('behavior', idx)" class="accordion-body">
              <div class="md-content" v-html="renderMarkdown(section.content)"></div>
            </div>
          </div>

          <hr style="margin: 2rem 0; border-color: var(--c-border);" />
          <h3 style="margin-bottom: 1rem;">Interactive Examples</h3>
          <p class="hint-text" style="margin-bottom: 1.5rem;">Click any example to view the JSON structure. Copy these patterns into your own Questionnaires.</p>

          <div class="reference-grid">
            <article v-for="example in behaviorExamples" :key="example.title" class="reference-card">
              <h5>{{ example.title }}</h5>
              <p class="hint-text" style="margin-bottom: 0.5rem;">{{ example.description }}</p>
              <pre class="code-output" style="font-size: 0.75rem; max-height: 250px; overflow: auto;">{{ example.snippet }}</pre>
              <button v-if="isJsonSnippet(example.snippet)" class="btn btn-sm" style="margin-top: 0.5rem;" @click="tryInPlayground(example.snippet)">🧪 Try in Playground</button>
            </article>
          </div>
        </div>

        <!-- MODULE 5: POPULATION -->
        <div v-if="activeTab === 'population'" class="card" style="max-width: 900px; margin: 0 auto;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
            <h2 style="margin: 0;">{{ learningModules.population.title }}</h2>
            <a :href="learningModules.population.specUrl" target="_blank" rel="noopener" class="spec-link">📖 HL7 Spec</a>
          </div>

          <div v-for="(section, idx) in learningModules.population.sections" :key="idx" class="accordion-section">
            <button class="accordion-header" @click="toggleSection('population', idx)">
              <span class="accordion-chevron" :class="{ open: isSectionOpen('population', idx) }">▶</span>
              {{ section.title }}
            </button>
            <div v-if="isSectionOpen('population', idx)" class="accordion-body">
              <div class="md-content" v-html="renderMarkdown(section.content)"></div>
            </div>
          </div>

          <hr style="margin: 2rem 0; border-color: var(--c-border);" />
          <h3 style="margin-bottom: 1rem;">Population Method Examples</h3>
          
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
            <span style="padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; background: #dbeafe; color: #1e40af;">Observation</span>
            <span style="padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; background: #dcfce7; color: #166534;">Expression</span>
            <span style="padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; background: #fef3c7; color: #92400e;">StructureMap</span>
            <span style="padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; background: #f3e8ff; color: #6b21a8;">Operation</span>
          </div>

          <div class="reference-grid">
            <article v-for="example in populationMethodExamples" :key="example.title" class="reference-card">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <h5 style="margin: 0;">{{ example.title }}</h5>
                <span style="padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; background: var(--c-bg-app); border: 1px solid var(--c-border);">{{ example.method }}</span>
              </div>
              <p class="hint-text" style="margin-bottom: 0.5rem;">{{ example.description }}</p>
              <pre class="code-output" style="font-size: 0.75rem; max-height: 300px; overflow: auto;">{{ example.snippet }}</pre>
              <button v-if="isJsonSnippet(example.snippet)" class="btn btn-sm" style="margin-top: 0.5rem;" @click="tryInPlayground(example.snippet)">🧪 Try in Playground</button>
            </article>
          </div>
        </div>

        <!-- MODULE 6: EXTRACTION -->
        <div v-if="activeTab === 'extraction'" class="card" style="max-width: 900px; margin: 0 auto;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
            <h2 style="margin: 0;">{{ learningModules.extraction.title }}</h2>
            <a :href="learningModules.extraction.specUrl" target="_blank" rel="noopener" class="spec-link">📖 HL7 Spec</a>
          </div>

          <div v-for="(section, idx) in learningModules.extraction.sections" :key="idx" class="accordion-section">
            <button class="accordion-header" @click="toggleSection('extraction', idx)">
              <span class="accordion-chevron" :class="{ open: isSectionOpen('extraction', idx) }">▶</span>
              {{ section.title }}
            </button>
            <div v-if="isSectionOpen('extraction', idx)" class="accordion-body">
              <div class="md-content" v-html="renderMarkdown(section.content)"></div>
            </div>
          </div>

          <hr style="margin: 2rem 0; border-color: var(--c-border);" />
          <h3 style="margin-bottom: 1rem;">Extraction Method Examples</h3>
          
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
            <span style="padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; background: #dbeafe; color: #1e40af;">Observation</span>
            <span style="padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; background: #dcfce7; color: #166534;">Definition</span>
            <span style="padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; background: #fef3c7; color: #92400e;">StructureMap</span>
            <span style="padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; background: #f3e8ff; color: #6b21a8;">Template</span>
          </div>

          <div class="reference-grid">
            <article v-for="example in extractionMethodExamples" :key="example.title" class="reference-card">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <h5 style="margin: 0;">{{ example.title }}</h5>
                <span style="padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.7rem; font-weight: 600; background: var(--c-bg-app); border: 1px solid var(--c-border);">{{ example.method }}</span>
              </div>
              <p class="hint-text" style="margin-bottom: 0.5rem;">{{ example.description }}</p>
              <pre class="code-output" style="font-size: 0.75rem; max-height: 300px; overflow: auto;">{{ example.snippet }}</pre>
              <button v-if="isJsonSnippet(example.snippet)" class="btn btn-sm" style="margin-top: 0.5rem;" @click="tryInPlayground(example.snippet)">🧪 Try in Playground</button>
            </article>
          </div>

          <hr style="margin: 2rem 0; border-color: var(--c-border);" />
          <h3 style="margin-bottom: 1rem;">Live Extraction Preview (Current Scenario)</h3>
          <p class="hint-text" style="margin-bottom: 1rem;">These mappings are evaluated against the active scenario's QuestionnaireResponse using FHIRPath.</p>
          <div class="reference-grid compact">
            <article v-for="mapping in extractionPreview" :key="mapping.name" class="reference-card">
              <h5>{{ mapping.name }}</h5>
              <p class="hint-text" style="font-size: 0.8rem;">Target: {{ mapping.target }}</p>
              <p v-if="mapping.error" style="color: var(--c-danger); font-size: 0.85rem;">{{ mapping.error }}</p>
              <p v-else style="font-weight: 600; color: var(--c-accent);">{{ mapping.value ?? '(empty)' }}</p>
            </article>
          </div>
        </div>

        <!-- MODULE 7: MODULAR FORMS -->
        <div v-if="activeTab === 'modular'" class="card" style="max-width: 900px; margin: 0 auto;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
            <h2 style="margin: 0;">{{ learningModules.modular.title }}</h2>
            <a :href="learningModules.modular.specUrl" target="_blank" rel="noopener" class="spec-link">📖 HL7 Spec</a>
          </div>

          <div v-for="(section, idx) in learningModules.modular.sections" :key="idx" class="accordion-section">
            <button class="accordion-header" @click="toggleSection('modular', idx)">
              <span class="accordion-chevron" :class="{ open: isSectionOpen('modular', idx) }">▶</span>
              {{ section.title }}
            </button>
            <div v-if="isSectionOpen('modular', idx)" class="accordion-body">
              <div class="md-content" v-html="renderMarkdown(section.content)"></div>
            </div>
          </div>

          <hr style="margin: 2rem 0; border-color: var(--c-border);" />
          <h3 style="margin-bottom: 1rem;">Assembly Visualization</h3>
          <div style="background: var(--c-bg-pane-header); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--c-border); margin-bottom: 2rem;">
            <div style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1rem;">
              <div style="text-align: center;">
                <div style="background: #dbeafe; color: #1e40af; padding: 1rem; border-radius: 8px; font-weight: 600; margin-bottom: 0.5rem;">Root Questionnaire</div>
                <div style="font-size: 0.8rem; color: var(--c-text-secondary);">Contains subQuestionnaire references</div>
                <div style="margin-top: 0.75rem; display: grid; gap: 0.5rem;">
                  <div style="background: #eff6ff; padding: 0.5rem; border-radius: 6px; font-size: 0.8rem; border: 1px dashed #93c5fd;">📎 demographics-module|1.0</div>
                  <div style="background: #eff6ff; padding: 0.5rem; border-radius: 6px; font-size: 0.8rem; border: 1px dashed #93c5fd;">📎 vitals-module|2.1</div>
                  <div style="background: #f0fdf4; padding: 0.5rem; border-radius: 6px; font-size: 0.8rem; border: 1px solid #86efac;">📝 Local: Review of Systems</div>
                </div>
              </div>
              <div style="font-size: 2rem; color: var(--c-accent);">→<br><span style="font-size: 0.8rem;">$assemble</span></div>
              <div style="text-align: center;">
                <div style="background: #dcfce7; color: #166534; padding: 1rem; border-radius: 8px; font-weight: 600; margin-bottom: 0.5rem;">Assembled Questionnaire</div>
                <div style="font-size: 0.8rem; color: var(--c-text-secondary);">All items inlined, ready to render</div>
                <div style="margin-top: 0.75rem; display: grid; gap: 0.5rem;">
                  <div style="background: #f0fdf4; padding: 0.5rem; border-radius: 6px; font-size: 0.8rem; border: 1px solid #86efac;">📝 first-name, last-name, dob, gender</div>
                  <div style="background: #f0fdf4; padding: 0.5rem; border-radius: 6px; font-size: 0.8rem; border: 1px solid #86efac;">📝 height, weight, bp, bmi</div>
                  <div style="background: #f0fdf4; padding: 0.5rem; border-radius: 6px; font-size: 0.8rem; border: 1px solid #86efac;">📝 ros-cardio, ros-respiratory</div>
                </div>
              </div>
            </div>
          </div>

          <h3 style="margin-bottom: 1rem;">Code Examples</h3>
          <div class="reference-grid">
            <article v-for="example in modularFormsExamples" :key="example.title" class="reference-card">
              <h5>{{ example.title }}</h5>
              <p class="hint-text" style="margin-bottom: 0.5rem;">{{ example.description }}</p>
              <pre class="code-output" style="font-size: 0.75rem; max-height: 300px; overflow: auto;">{{ example.snippet }}</pre>
              <button v-if="isJsonSnippet(example.snippet)" class="btn btn-sm" style="margin-top: 0.5rem;" @click="tryInPlayground(example.snippet)">🧪 Try in Playground</button>
            </article>
          </div>
        </div>

        <!-- MODULE 8: ADAPTIVE FORMS -->
        <div v-if="activeTab === 'adaptive'" class="card" style="max-width: 900px; margin: 0 auto;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
            <h2 style="margin: 0;">{{ learningModules.adaptive.title }}</h2>
            <a :href="learningModules.adaptive.specUrl" target="_blank" rel="noopener" class="spec-link">📖 HL7 Spec</a>
          </div>

          <div v-for="(section, idx) in learningModules.adaptive.sections" :key="idx" class="accordion-section">
            <button class="accordion-header" @click="toggleSection('adaptive', idx)">
              <span class="accordion-chevron" :class="{ open: isSectionOpen('adaptive', idx) }">▶</span>
              {{ section.title }}
            </button>
            <div v-if="isSectionOpen('adaptive', idx)" class="accordion-body">
              <div class="md-content" v-html="renderMarkdown(section.content)"></div>
            </div>
          </div>

          <hr style="margin: 2rem 0; border-color: var(--c-border);" />
          <h3 style="margin-bottom: 1rem;">$next-question Flow</h3>
          <div style="background: var(--c-bg-pane-header); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--c-border); margin-bottom: 2rem;">
            <div style="display: grid; gap: 1rem;">
              <div v-for="(step, stepIdx) in [
                { label: '1. Initial Call', desc: 'Form filler sends empty QuestionnaireResponse', arrow: true },
                { label: '2. Server Returns Q1', desc: 'Server appends first unanswered question item', arrow: true },
                { label: '3. User Answers Q1', desc: 'Form filler adds answer to the item and calls again', arrow: true },
                { label: '4. Server Returns Q2', desc: 'Server evaluates, appends next question', arrow: true },
                { label: '5. Repeat...', desc: 'Continue until server sets status = completed', arrow: true },
                { label: '6. Complete', desc: 'Server returns final score/summary, status = completed', arrow: false },
              ]" :key="stepIdx" style="display: flex; align-items: center; gap: 1rem;">
                <div style="min-width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;"
                     :style="{ background: stepIdx === 5 ? '#dcfce7' : '#dbeafe', color: stepIdx === 5 ? '#166534' : '#1e40af' }">
                  {{ stepIdx + 1 }}
                </div>
                <div style="flex: 1;">
                  <div style="font-weight: 600; font-size: 0.9rem;">{{ step.label }}</div>
                  <div style="font-size: 0.8rem; color: var(--c-text-secondary);">{{ step.desc }}</div>
                </div>
              </div>
            </div>
          </div>

          <h3 style="margin-bottom: 1rem;">Code Examples</h3>
          <div class="reference-grid">
            <article v-for="example in adaptiveFormsExamples" :key="example.title" class="reference-card">
              <h5>{{ example.title }}</h5>
              <p class="hint-text" style="margin-bottom: 0.5rem;">{{ example.description }}</p>
              <pre class="code-output" style="font-size: 0.75rem; max-height: 300px; overflow: auto;">{{ example.snippet }}</pre>
              <button v-if="isJsonSnippet(example.snippet)" class="btn btn-sm" style="margin-top: 0.5rem;" @click="tryInPlayground(example.snippet)">🧪 Try in Playground</button>
            </article>
          </div>
        </div>

        <!-- MODULE 9: WORKFLOW & CONFORMANCE -->
        <div v-if="activeTab === 'workflow'" class="card" style="max-width: 900px; margin: 0 auto;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
            <h2 style="margin: 0;">{{ learningModules.workflow.title }}</h2>
            <a :href="learningModules.workflow.specUrl" target="_blank" rel="noopener" class="spec-link">📖 HL7 Spec</a>
          </div>

          <div v-for="(section, idx) in learningModules.workflow.sections" :key="idx" class="accordion-section">
            <button class="accordion-header" @click="toggleSection('workflow', idx)">
              <span class="accordion-chevron" :class="{ open: isSectionOpen('workflow', idx) }">▶</span>
              {{ section.title }}
            </button>
            <div v-if="isSectionOpen('workflow', idx)" class="accordion-body">
              <div class="md-content" v-html="renderMarkdown(section.content)"></div>
            </div>
          </div>

          <hr style="margin: 2rem 0; border-color: var(--c-border);" />
          <h3 style="margin-bottom: 1rem;">System Roles</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
            <div v-for="role in workflowRoles" :key="role.role" style="background: var(--c-bg-pane-header); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--c-border);">
              <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">{{ role.icon }}</div>
              <h5 style="margin: 0 0 0.35rem 0;">{{ role.role }}</h5>
              <p class="hint-text" style="font-size: 0.8rem; margin-bottom: 0.5rem;">{{ role.description }}</p>
              <div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">
                <span v-for="op in role.operations" :key="op" style="font-size: 0.7rem; padding: 0.15rem 0.5rem; background: #fff; border: 1px solid var(--c-border); border-radius: 999px;">{{ op }}</span>
              </div>
            </div>
          </div>

          <h3 style="margin-bottom: 1rem;">Conformance Profiles</h3>
          <div style="overflow-x: auto; margin-bottom: 2rem;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="background: var(--c-bg-pane-header); border-bottom: 2px solid var(--c-border);">
                  <th style="text-align: left; padding: 0.75rem;">Profile</th>
                  <th style="text-align: left; padding: 0.75rem;">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in conformanceProfiles" :key="p.profile" style="border-bottom: 1px solid var(--c-border);">
                  <td style="padding: 0.6rem 0.75rem; font-weight: 600;">{{ p.profile }}</td>
                  <td style="padding: 0.6rem 0.75rem; color: var(--c-text-secondary);">{{ p.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 style="margin-bottom: 1rem;">Questionnaire Search Parameters</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="background: var(--c-bg-pane-header); border-bottom: 2px solid var(--c-border);">
                  <th style="text-align: left; padding: 0.75rem;">Parameter</th>
                  <th style="text-align: left; padding: 0.75rem;">Type</th>
                  <th style="text-align: left; padding: 0.75rem;">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="sp in questionnaireSearchParams" :key="sp.param" style="border-bottom: 1px solid var(--c-border);">
                  <td style="padding: 0.6rem 0.75rem; font-family: monospace; font-weight: 600;">{{ sp.param }}</td>
                  <td style="padding: 0.6rem 0.75rem; color: var(--c-accent);">{{ sp.type }}</td>
                  <td style="padding: 0.6rem 0.75rem; color: var(--c-text-secondary);">{{ sp.description }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- FHIR SERVER -->
        <div v-if="activeTab === 'server'" class="card" style="max-width: 1100px; margin: 0 auto; padding: 0; overflow: hidden;">
          <FhirServerPanel
            @server-status-change="onServerStatusChange"
            @load-questionnaire="onLoadQuestionnaireFromServer"
          />
        </div>

        <!-- PLAYGROUND -->
        <div v-if="activeTab === 'playground'" class="playground-shell">
          <!-- Mode Switcher -->
          <div class="pg-mode-bar">
            <div class="pg-mode-tabs">
              <button class="pg-mode-tab" :class="{ active: pgMode === 'form' }" @click="pgMode = 'form'">📝 Form Builder</button>
              <button class="pg-mode-tab" :class="{ active: pgMode === 'fhirpath' }" @click="pgMode = 'fhirpath'; fpEvaluate()">🔬 FHIRPath Explorer</button>
            </div>
            <!-- Form mode toolbar -->
            <div v-if="pgMode === 'form'" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <label style="font-weight: 600; font-size: 0.8rem; color: var(--c-text-secondary);">Template:</label>
              <select class="input-select" style="font-size: 0.8rem;" :value="pgSelectedTemplate" @change="pgLoadTemplate($event.target.value)">
                <option v-for="tpl in playgroundTemplates" :key="tpl.id" :value="tpl.id">{{ tpl.label }}</option>
              </select>
            </div>
            <!-- FHIRPath mode toolbar -->
            <div v-if="pgMode === 'fhirpath'" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <select class="input-select" style="font-size: 0.8rem;" :value="fpSelectedResource" @change="fpLoadSampleResource($event.target.value)">
                <option v-for="key in Object.keys(fpSampleResources)" :key="key" :value="key">{{ key }}</option>
              </select>
              <label class="btn btn-sm" style="cursor: pointer;">📂 Load file<input type="file" accept=".json" hidden @change="fpHandleLoadFile" /></label>
              <button class="btn btn-sm" @click="fpFormatJson">Format</button>
              <button class="btn btn-sm" @click="fpShowHistory = !fpShowHistory">🕐 History <span v-if="fpHistory.length" style="font-size: 0.7rem; background: var(--c-accent); color: #fff; padding: 0 0.35rem; border-radius: 999px; margin-left: 0.2rem;">{{ fpHistory.length }}</span></button>
            </div>
          </div>

          <!-- FHIRPath History Dropdown -->
          <div v-if="pgMode === 'fhirpath' && fpShowHistory && fpHistory.length" class="fp-history-panel">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.75rem; border-bottom: 1px solid var(--c-border); font-size: 0.78rem; font-weight: 600;">
              <span>Expression History</span>
              <button class="btn btn-sm" style="font-size: 0.7rem;" @click="fpHistory = []; fpShowHistory = false;">Clear</button>
            </div>
            <div style="max-height: 200px; overflow: auto;">
              <button v-for="(entry, idx) in fpHistory" :key="idx" class="fp-history-item" @click="fpApplyFromHistory(entry)">
                <code>{{ entry.expression }}</code>
                <span style="color: var(--c-text-tertiary); font-size: 0.7rem; white-space: nowrap;">{{ entry.resultCount }} result{{ entry.resultCount !== 1 ? 's' : '' }} · {{ entry.timestamp }}</span>
              </button>
            </div>
          </div>

          <!-- ═══ FORM BUILDER MODE ═══ -->
          <div v-if="pgMode === 'form'" class="split-pane" style="height: calc(100vh - var(--header-height) - 7rem);">
            <!-- Left: JSON Editor -->
            <div class="pane">
              <div class="pane-header">
                <span>Questionnaire JSON</span>
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <button class="btn btn-sm" @click="formatPgJson" title="Format JSON (Shift+Alt+F)">Format</button>
                  <button class="btn btn-sm" :class="{ 'btn-primary': hasActiveServer }" @click="pgValidateOnServer" :disabled="pgServerValidateLoading || pgParsed.error || !hasActiveServer" :title="hasActiveServer ? 'Validate against FHIR server' : 'No FHIR server configured — go to FHIR Server tab'">
                    {{ pgServerValidateLoading ? '⏳' : '🏥' }} Validate
                  </button>
                  <button class="btn btn-sm" :class="{ 'btn-primary': hasActiveServer }" @click="pgUploadToServer" :disabled="pgUploadLoading || pgParsed.error || !hasActiveServer" :title="hasActiveServer ? 'Upload to FHIR server' : 'No FHIR server configured — go to FHIR Server tab'">
                    {{ pgUploadLoading ? '⏳' : '☁️' }} Upload
                  </button>
                  <button class="btn btn-sm" :class="{ 'btn-primary': hasActiveServer }" @click="pgPopulate" :disabled="pgPopulateLoading || pgParsed.error || !hasActiveServer" :title="hasActiveServer ? 'Pre-populate via $populate' : 'No FHIR server configured'">
                    {{ pgPopulateLoading ? '⏳' : '📥' }} Populate
                  </button>
                  <button class="btn btn-sm" :class="{ 'btn-primary': hasActiveServer }" @click="pgExtract" :disabled="pgExtractLoading || !pgGeneratedResponse || !hasActiveServer" :title="hasActiveServer ? 'Extract resources via $extract' : 'No FHIR server configured'">
                    {{ pgExtractLoading ? '⏳' : '📤' }} Extract
                  </button>
                  <span v-if="pgParsed.error" style="color: var(--c-danger); font-size: 0.75rem;">Invalid JSON</span>
                  <span v-else style="color: var(--c-success); font-size: 0.75rem;">Valid</span>
                  <span v-if="!hasActiveServer" style="color: var(--c-warning, #b45309); font-size: 0.7rem; opacity: 0.8;" title="Configure a FHIR server in the FHIR Server tab to enable server features">⚠️ No server</span>
                </div>
              </div>
              <div v-if="pgUploadResult" style="padding: 0.4rem 0.75rem; font-size: 0.8rem; border-bottom: 1px solid var(--c-border);" :style="{ background: pgUploadResult.startsWith('✅') ? '#f0fdf4' : '#fef2f2', color: pgUploadResult.startsWith('✅') ? '#166534' : '#991b1b' }">
                {{ pgUploadResult }}
                <button style="border: none; background: none; cursor: pointer; float: right; font-size: 0.8rem;" @click="pgUploadResult = ''">✕</button>
              </div>
              <div class="pane-body">
                <JsonTooltipEditor
                  v-model="pgJson"
                  resource-type="Questionnaire"
                  style="height: 100%; border: none;"
                />
              </div>
            </div>

            <!-- Right: Output panels -->
            <div class="pane" style="display: flex; flex-direction: column;">
              <div class="pane-header" style="gap: 0;">
                <div style="display: flex; gap: 0;">
                  <button
                    v-for="ot in [
                      { id: 'form', label: 'Live Form' },
                      { id: 'response', label: 'Response JSON' },
                      { id: 'fhirpath', label: 'FHIRPath' },
                      { id: 'populate', label: 'Populate' },
                      { id: 'extract', label: 'Extract' },
                      { id: 'validate', label: 'Validation' },
                    ]"
                    :key="ot.id"
                    style="border: none; background: none; font-weight: 600; cursor: pointer; padding: 0 0.75rem; font-size: 0.8rem; height: 100%;"
                    :style="{ color: pgOutputTab === ot.id ? 'var(--c-accent)' : 'var(--c-text-secondary)', borderBottom: pgOutputTab === ot.id ? '2px solid var(--c-accent)' : '2px solid transparent' }"
                    @click="pgOutputTab = ot.id"
                  >{{ ot.label }}</button>
                </div>
              </div>

              <!-- Live Form -->
              <div v-if="pgOutputTab === 'form'" class="pane-body" style="padding: 1.5rem; overflow: auto;">
                <DynamicQuestionnaireForm
                  v-if="pgParsed.value"
                  :questionnaire="pgParsed.value"
                  @response-updated="pgUpdateResponse"
                />
                <p v-else class="hint-text" style="font-style: italic;">Fix JSON errors to see the live form.</p>
              </div>

              <!-- Response JSON -->
              <div v-if="pgOutputTab === 'response'" class="pane-body" style="padding: 0;">
                <pre class="code-output" style="height: 100%; margin: 0; border-radius: 0;">{{ pgGeneratedResponse ? JSON.stringify(pgGeneratedResponse, null, 2) : '// Fill the form to see the response' }}</pre>
              </div>

              <!-- FHIRPath Tester -->
              <div v-if="pgOutputTab === 'fhirpath'" class="pane-body" style="display: flex; flex-direction: column; padding: 0;">
                <div style="padding: 0.75rem; border-bottom: 1px solid var(--c-border);">
                  <label style="font-size: 0.8rem; font-weight: 600; color: var(--c-text-secondary); display: block; margin-bottom: 0.35rem;">FHIRPath Expression (evaluated against generated response)</label>
                  <FhirPathEditor
                    v-model="pgFhirPathExpr"
                    resource-type="QuestionnaireResponse"
                    placeholder="e.g. item.where(linkId='q1').answer.valueString"
                    @evaluate="pgRunFhirPath"
                  />
                </div>
                <div style="flex: 1; overflow: auto;">
                  <div v-if="pgFhirPathError" class="error-text">{{ pgFhirPathError }}</div>
                  <pre v-else class="code-output" style="height: 100%; margin: 0; border-radius: 0;">{{ pgFhirPathResult || '// Result will appear here' }}</pre>
                </div>
              </div>

              <!-- Populate -->
              <div v-if="pgOutputTab === 'populate'" class="pane-body" style="padding: 1.5rem; overflow: auto;">
                <h4 style="margin: 0 0 0.75rem 0;">📥 Pre-Population ($populate)</h4>
                <p style="font-size: 0.85rem; color: var(--c-text-secondary); margin-bottom: 1rem;">
                  Calls <code>Questionnaire/$populate</code> on the configured FHIR server to pre-fill a QuestionnaireResponse using the patient's existing data.
                </p>
                <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap;">
                  <label style="font-size: 0.8rem; font-weight: 600; white-space: nowrap;">Subject Reference:</label>
                  <input v-model="pgPopulateSubject" class="input-select" style="font-size: 0.8rem; min-width: 200px; flex: 1; max-width: 320px;" placeholder="e.g. Patient/123" />
                  <button class="btn btn-sm btn-primary" @click="pgPopulate" :disabled="pgPopulateLoading || pgParsed.error || !hasActiveServer">
                    {{ pgPopulateLoading ? '⏳ Populating...' : '▶ Run $populate' }}
                  </button>
                </div>
                <div v-if="!hasActiveServer" style="padding: 0.75rem; border-radius: 6px; background: #fffbeb; color: #92400e; font-size: 0.85rem; margin-bottom: 1rem; border-left: 3px solid #f59e0b;">
                  ⚠️ No FHIR server configured. Go to the <strong>FHIR Server</strong> tab to connect one.
                </div>
                <div v-if="pgPopulateError" style="padding: 0.75rem; border-radius: 6px; background: #fef2f2; color: #991b1b; font-size: 0.85rem; margin-bottom: 1rem; border-left: 3px solid #dc2626;">
                  ❌ {{ pgPopulateError }}
                </div>
                <div v-if="pgPopulateResult">
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <span style="color: #166534; font-weight: 600;">✅ Population successful</span>
                    <span style="font-size: 0.75rem; color: var(--c-text-tertiary);">{{ pgPopulateResult.resourceType }}</span>
                  </div>
                  <pre class="code-output" style="margin: 0; max-height: 400px; overflow: auto;">{{ JSON.stringify(pgPopulateResult, null, 2) }}</pre>
                </div>
                <div v-if="!pgPopulateResult && !pgPopulateError && !pgPopulateLoading" style="color: var(--c-text-tertiary); font-size: 0.85rem; font-style: italic;">
                  Click <strong>📥 Populate</strong> or <strong>▶ Run $populate</strong> to pre-populate this questionnaire from server data.
                </div>
                <details style="margin-top: 1.5rem;">
                  <summary style="cursor: pointer; font-size: 0.85rem; font-weight: 600; color: var(--c-text-secondary);">ℹ️ How $populate works</summary>
                  <ul style="color: var(--c-text-secondary); font-size: 0.82rem; line-height: 1.8; padding-left: 1.2rem; margin-top: 0.5rem;">
                    <li>The FHIR server takes the Questionnaire URL and a subject reference.</li>
                    <li>It queries for existing data (Observations, Conditions, etc.) matching <code>code</code>, <code>initialExpression</code>, or <code>observationLinkPeriod</code>.</li>
                    <li>Returns a pre-filled <code>QuestionnaireResponse</code> with <code>status: in-progress</code>.</li>
                    <li>Requires the Questionnaire to already exist on the server — use <strong>☁️ Upload</strong> first.</li>
                  </ul>
                </details>
              </div>

              <!-- Extract -->
              <div v-if="pgOutputTab === 'extract'" class="pane-body" style="padding: 1.5rem; overflow: auto;">
                <h4 style="margin: 0 0 0.75rem 0;">📤 Data Extraction ($extract)</h4>
                <p style="font-size: 0.85rem; color: var(--c-text-secondary); margin-bottom: 1rem;">
                  Calls <code>QuestionnaireResponse/$extract</code> on the configured FHIR server to generate FHIR resources (Observations, Conditions, etc.) from the completed form answers.
                </p>
                <div style="margin-bottom: 1rem;">
                  <button class="btn btn-sm btn-primary" @click="pgExtract" :disabled="pgExtractLoading || !pgGeneratedResponse || !hasActiveServer">
                    {{ pgExtractLoading ? '⏳ Extracting...' : '▶ Run $extract' }}
                  </button>
                  <span v-if="!pgGeneratedResponse" style="font-size: 0.78rem; color: var(--c-text-tertiary); margin-left: 0.5rem;">Fill the form first to generate a response.</span>
                </div>
                <div v-if="!hasActiveServer" style="padding: 0.75rem; border-radius: 6px; background: #fffbeb; color: #92400e; font-size: 0.85rem; margin-bottom: 1rem; border-left: 3px solid #f59e0b;">
                  ⚠️ No FHIR server configured. Go to the <strong>FHIR Server</strong> tab to connect one.
                </div>
                <div v-if="pgExtractError" style="padding: 0.75rem; border-radius: 6px; background: #fef2f2; color: #991b1b; font-size: 0.85rem; margin-bottom: 1rem; border-left: 3px solid #dc2626;">
                  ❌ {{ pgExtractError }}
                </div>
                <div v-if="pgExtractResult">
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <span style="color: #166534; font-weight: 600;">✅ Extraction successful</span>
                    <span v-if="pgExtractResult.resourceType === 'Bundle'" style="font-size: 0.75rem; color: var(--c-text-tertiary);">{{ pgExtractResult.entry?.length || 0 }} resource(s) extracted</span>
                    <span v-else style="font-size: 0.75rem; color: var(--c-text-tertiary);">{{ pgExtractResult.resourceType }}</span>
                  </div>
                  <template v-if="pgExtractResult.resourceType === 'Bundle' && pgExtractResult.entry?.length">
                    <div v-for="(entry, idx) in pgExtractResult.entry" :key="idx" style="margin-bottom: 1rem;">
                      <div style="font-size: 0.8rem; font-weight: 600; color: var(--c-accent); margin-bottom: 0.25rem;">{{ entry.resource?.resourceType || 'Resource' }} #{{ idx + 1 }}</div>
                      <pre class="code-output" style="margin: 0; max-height: 250px; overflow: auto;">{{ JSON.stringify(entry.resource || entry, null, 2) }}</pre>
                    </div>
                  </template>
                  <pre v-else class="code-output" style="margin: 0; max-height: 400px; overflow: auto;">{{ JSON.stringify(pgExtractResult, null, 2) }}</pre>
                </div>
                <div v-if="!pgExtractResult && !pgExtractError && !pgExtractLoading" style="color: var(--c-text-tertiary); font-size: 0.85rem; font-style: italic;">
                  Click <strong>📤 Extract</strong> or <strong>▶ Run $extract</strong> to extract FHIR resources from the current form response.
                </div>
                <details style="margin-top: 1.5rem;">
                  <summary style="cursor: pointer; font-size: 0.85rem; font-weight: 600; color: var(--c-text-secondary);">ℹ️ How $extract works</summary>
                  <ul style="color: var(--c-text-secondary); font-size: 0.82rem; line-height: 1.8; padding-left: 1.2rem; margin-top: 0.5rem;">
                    <li>The server reads the QuestionnaireResponse and its linked Questionnaire.</li>
                    <li>Items tagged with <code>observationExtract</code> become Observations.</li>
                    <li>Items with <code>definition</code> URLs map to the target resource elements.</li>
                    <li>StructureMap-based extraction transforms the entire response via a FHIR Mapping Language map.</li>
                    <li>Returns a <code>Bundle</code> of created/proposed resources (Observations, Conditions, etc.).</li>
                  </ul>
                </details>
              </div>

              <!-- Validation -->
              <div v-if="pgOutputTab === 'validate'" class="pane-body" style="padding: 1.5rem; overflow: auto;">
                <h4 style="margin: 0 0 1rem 0;">Structural Validation</h4>
                <div v-for="(issue, idx) in pgValidationIssues" :key="idx" style="display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem; padding: 0.5rem 0.75rem; border-radius: 6px;"
                     :style="{ background: issue.startsWith('No structural') ? '#f0fdf4' : '#fef2f2', color: issue.startsWith('No structural') ? '#166534' : '#991b1b' }">
                  <span style="font-size: 1rem;">{{ issue.startsWith('No structural') ? '✓' : '✗' }}</span>
                  <span style="font-size: 0.85rem;">{{ issue }}</span>
                </div>

                <!-- Server Validation Results -->
                <template v-if="pgServerValidateResult || pgServerValidateError">
                  <h4 style="margin: 2rem 0 0.75rem 0;">🏥 Server Validation</h4>
                  <div v-if="pgServerValidateError" style="display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem; padding: 0.5rem 0.75rem; border-radius: 6px; background: #fef2f2; color: #991b1b;">
                    <span style="font-size: 1rem;">✗</span>
                    <span style="font-size: 0.85rem;">{{ pgServerValidateError }}</span>
                  </div>
                  <div v-if="pgServerValidateResult?.issue?.length" v-for="(issue, idx) in pgServerValidateResult.issue" :key="'sv-' + idx"
                    style="display: flex; flex-direction: column; gap: 0.2rem; margin-bottom: 0.5rem; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem;"
                    :style="{
                      background: issue.severity === 'error' || issue.severity === 'fatal' ? '#fef2f2' : issue.severity === 'warning' ? '#fffbeb' : '#f0fdf4',
                      color: issue.severity === 'error' || issue.severity === 'fatal' ? '#991b1b' : issue.severity === 'warning' ? '#92400e' : '#166534',
                      borderLeft: `3px solid ${issue.severity === 'error' || issue.severity === 'fatal' ? '#dc2626' : issue.severity === 'warning' ? '#f59e0b' : '#16a34a'}`
                    }">
                    <span style="font-weight: 600; text-transform: capitalize;">{{ issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : '✅' }} {{ issue.severity }}</span>
                    <span>{{ issue.diagnostics || issue.details?.text || 'No details' }}</span>
                    <span v-if="issue.location?.length" style="font-family: monospace; font-size: 0.75rem; opacity: 0.7;">{{ issue.location.join(', ') }}</span>
                  </div>
                  <div v-if="pgServerValidateResult && !pgServerValidateResult.issue?.length && !pgServerValidateError"
                    style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; border-radius: 6px; background: #f0fdf4; color: #166534;">
                    ✅ Server validation passed — no issues found!
                  </div>
                </template>

                <h4 style="margin: 2rem 0 0.75rem 0;">Quick Tips</h4>
                <ul style="color: var(--c-text-secondary); font-size: 0.85rem; line-height: 1.8; padding-left: 1.2rem;">
                  <li>Every item needs a unique <strong>linkId</strong> and a <strong>type</strong>.</li>
                  <li>The Questionnaire must have <strong>status</strong> (draft, active, retired).</li>
                  <li>Use <strong>required: true</strong> on mandatory items.</li>
                  <li>Add <strong>enableWhen</strong> for conditional visibility.</li>
                  <li>Use <strong>readOnly: true</strong> on calculated items.</li>
                  <li>Add the <strong>constraint</strong> extension for custom validation with a <strong>human</strong> error message.</li>
                  <li>Click <strong>🏥 Validate</strong> in the editor toolbar to check against a real FHIR server.</li>
                  <li>Click <strong>☁️ Upload</strong> to push your Questionnaire to the connected server.</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- ═══ FHIRPATH EXPLORER MODE ═══ -->
          <div v-if="pgMode === 'fhirpath'" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">
            <!-- Expression Bar -->
            <div style="padding: 0.75rem 0; border-bottom: 1px solid var(--c-border); margin-bottom: 0.75rem;">
              <label style="font-size: 0.75rem; font-weight: 600; color: var(--c-text-secondary); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.3rem; display: block;">FHIRPath Expression</label>
              <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
                <FhirPathEditor
                  v-model="fpExpression"
                  :resource-type="fpSelectedResource"
                  placeholder="e.g. name.where(use='official').given"
                  style="flex: 1;"
                  @evaluate="fpEvaluate"
                />
                <button class="btn btn-primary" style="padding: 0.55rem 1rem; white-space: nowrap;" @click="fpEvaluate">▶ Evaluate</button>
              </div>
              <div style="display: flex; gap: 1.5rem; margin-top: 0.3rem; font-size: 0.7rem; color: var(--c-text-tertiary);">
                <span>Press <kbd style="background: var(--c-bg-secondary); border: 1px solid var(--c-border); border-radius: 3px; padding: 0 0.3rem; font-size: 0.7rem;">Enter</kbd> to evaluate</span>
                <span>Supports <code style="font-family: monospace; font-size: 0.7rem;">let var := expr;</code> bindings</span>
                <span v-if="fpEvalTimeMs">{{ fpEvalTimeMs }}ms</span>
                <span style="margin-left: auto; font-size: 0.7rem; opacity: 0.7;">fhirpath.js v4.8.5 · FHIR R4</span>
              </div>
            </div>

            <!-- Two-column: Resource Editor | Result + Vars + Examples -->
            <div class="split-pane" style="flex: 1; min-height: 0;">
              <!-- Left: Resource Editor -->
              <div class="pane" style="min-height: 300px;">
                <div class="pane-header">
                  <span>Context Resource — {{ fpSelectedResource }}</span>
                </div>
                <div class="pane-body" style="display: flex; flex-direction: column;">
                  <div style="display: flex; flex: 1; min-height: 0;">
                    <div class="fp-line-numbers" aria-hidden="true">
                      <div v-for="n in fpJsonLineCount" :key="n">{{ n }}</div>
                    </div>
                    <textarea
                      v-model="fpResourceJson"
                      spellcheck="false"
                      wrap="off"
                      class="fp-editor-textarea"
                    />
                  </div>
                  <div style="padding: 0.3rem 0.75rem; font-size: 0.7rem; border-top: 1px solid var(--c-border); background: var(--c-bg-secondary);">
                    <span v-if="fpParsedResource.error" style="color: #dc2626;">✗ Invalid JSON</span>
                    <span v-else style="color: #059669;">✓ Valid {{ fpParsedResource.value?.resourceType || 'JSON' }}</span>
                  </div>
                </div>
              </div>

              <!-- Right: Result + Vars + Examples -->
              <div style="display: flex; flex-direction: column; gap: 0.75rem; overflow: auto;">
                <!-- Result -->
                <div class="pane" style="min-height: 140px;">
                  <div class="pane-header">
                    <span>Result</span>
                    <span v-if="fpResultType === 'success'" style="font-size: 0.7rem; color: var(--c-text-secondary); font-weight: 400;">{{ JSON.parse(fpResult).length }} item{{ JSON.parse(fpResult).length !== 1 ? 's' : '' }}</span>
                  </div>
                  <div class="pane-body" style="padding: 0;">
                    <div v-if="fpResultError" style="padding: 0.75rem; color: #dc2626; font-size: 0.82rem; display: flex; gap: 0.4rem; align-items: flex-start;"><strong>✗</strong> {{ fpResultError }}</div>
                    <pre v-else-if="fpResultType === 'empty'" class="code-output" style="height: 100%; margin: 0; border-radius: 0; color: var(--c-text-tertiary);">{{ fpResult }}</pre>
                    <pre v-else-if="fpResult" class="code-output" style="height: 100%; margin: 0; border-radius: 0; color: #059669;">{{ fpResult }}</pre>
                    <div v-else style="padding: 0.75rem; color: var(--c-text-tertiary); font-style: italic; font-size: 0.82rem;">Result will appear here</div>
                  </div>
                </div>

                <!-- Variables -->
                <div class="pane">
                  <div class="pane-header">
                    <span>Environment Variables <button class="btn btn-sm" style="margin-left: 0.4rem; font-size: 0.7rem;" @click="fpShowVars = !fpShowVars">{{ fpShowVars ? '▾ Hide' : '▸ Show' }}</button></span>
                    <button v-if="fpShowVars" class="btn btn-sm" style="font-size: 0.7rem;" @click="fpAddVariable">+ Add</button>
                  </div>
                  <div v-if="fpShowVars" style="padding: 0.5rem 0.75rem;">
                    <div v-if="!fpVariables.length" style="font-size: 0.8rem; color: var(--c-text-secondary); line-height: 1.6;">No custom variables. Click <strong>+ Add</strong> to create one. Use as <code style="font-family: monospace;">%varName</code>.</div>
                    <div v-for="(v, idx) in fpVariables" :key="idx" style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.35rem;">
                      <span style="font-family: monospace; color: var(--c-accent); font-weight: 600;">%</span>
                      <input v-model="v.name" placeholder="varName" spellcheck="false" style="width: 110px; font-family: monospace; font-size: 0.8rem; padding: 0.3rem 0.4rem; border: 1px solid var(--c-border); border-radius: 4px; outline: none;" />
                      <input v-model="v.value" placeholder="JSON or string" spellcheck="false" style="flex: 1; font-family: monospace; font-size: 0.8rem; padding: 0.3rem 0.4rem; border: 1px solid var(--c-border); border-radius: 4px; outline: none;" />
                      <button class="btn btn-sm" @click="fpRemoveVariable(idx)" title="Remove">✕</button>
                    </div>
                  </div>
                </div>

                <!-- Quick Examples -->
                <div class="pane">
                  <div class="pane-header"><span>Quick Examples — {{ fpSelectedResource }}</span></div>
                  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.4rem; padding: 0.6rem 0.75rem;">
                    <button
                      v-for="ex in fpCurrentExamples"
                      :key="ex.label"
                      class="fp-example-btn"
                      :class="{ active: fpExpression === ex.expr }"
                      @click="fpApplyExample(ex.expr)"
                    >
                      <span style="font-size: 0.75rem; font-weight: 600;">{{ ex.label }}</span>
                      <code style="font-family: monospace; font-size: 0.68rem; color: var(--c-accent); word-break: break-all;">{{ ex.expr }}</code>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- QUIZ (Interactive) -->
        <div v-if="activeTab === 'quiz'" class="card" style="max-width: 800px; margin: 0 auto;">
           <h2>Knowledge Check</h2>
           <p class="hint-text" style="margin-bottom: 2rem;">Test your mastery of SDC concepts. {{ quizQuestions.length }} questions covering all modules.</p>
           
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
           
           <div v-else>
              <div style="text-align: center; padding: 1.5rem; margin-bottom: 2rem; background: var(--c-bg-pane-header); border-radius: 10px;">
                <div style="font-size: 3rem; font-weight: bold; color: var(--c-accent);">{{ quizPercentage }}%</div>
                <p style="margin-bottom: 0.5rem;">You scored {{ quizScore }} out of {{ quizQuestions.length }}.</p>
                <p v-if="quizPercentage >= 80" style="color: var(--c-success); font-weight: 600;">🎉 Excellent! You have a strong understanding of SDC.</p>
                <p v-else-if="quizPercentage >= 50" style="color: #d97706; font-weight: 600;">📚 Good effort! Review the modules linked below to improve.</p>
                <p v-else style="color: var(--c-danger); font-weight: 600;">🔄 Keep learning! Review each module and try again.</p>
                <button class="btn btn-sm" style="margin-top: 0.75rem;" @click="resetQuiz">Try Again</button>
              </div>
              
              <h3 style="margin-bottom: 1rem;">Answer Review</h3>
              <div v-for="(q, idx) in quizQuestions" :key="idx" style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--c-border);">
                <p style="font-weight: 600; margin-bottom: 0.5rem;">
                  <span :style="{ color: quizAnswers[idx] === q.answer ? 'var(--c-success)' : 'var(--c-danger)' }">
                    {{ quizAnswers[idx] === q.answer ? '✓' : '✗' }}
                  </span>
                  {{ idx + 1 }}. {{ q.question }}
                </p>
                <div v-if="quizAnswers[idx] !== q.answer" class="quiz-answer-review incorrect">
                  <div><strong>Your answer:</strong> {{ q.options[quizAnswers[idx]] || '(not answered)' }}</div>
                  <div><strong>Correct answer:</strong> {{ q.options[q.answer] }}</div>
                </div>
                <div v-else class="quiz-answer-review correct">
                  <strong>Correct!</strong> {{ q.options[q.answer] }}
                </div>
                <div v-if="q.explanation" style="margin-top: 0.5rem; padding: 0.5rem 0.75rem; background: var(--c-accent-light); border-radius: 6px; font-size: 0.85rem; color: var(--c-text-secondary);">
                  💡 {{ q.explanation }}
                </div>
              </div>
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

            <template v-if="authoringSection === 'rendering-ext'">
                <h4>SDC Rendering Extensions Catalog</h4>
                <p class="hint-text" style="margin-bottom: 1.5rem;">Complete list of extensions that control how items appear visually.</p>
                <div class="reference-grid">
                  <article v-for="ext in renderingExtensionsCatalog" :key="ext.name" class="reference-card">
                    <h5>{{ ext.name }}</h5>
                    <p class="hint-text" style="margin-bottom: 0.25rem;">{{ ext.purpose }}</p>
                    <p style="font-size: 0.75rem; color: var(--c-text-secondary); margin-bottom: 0.5rem;">Applies to: {{ ext.appliesTo }} | Value: {{ ext.valueType }}</p>
                    <div v-if="ext.codes.length" style="display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.5rem;">
                      <span v-for="c in ext.codes" :key="c" style="font-size: 0.7rem; padding: 0.1rem 0.4rem; background: var(--c-accent-light); border-radius: 4px; color: var(--c-accent);">{{ c }}</span>
                    </div>
                    <pre class="code-output" style="font-size: 0.7rem; max-height: 150px; overflow: auto;">{{ ext.snippet }}</pre>
                  </article>
                </div>
            </template>

            <template v-if="authoringSection === 'behavior-ext'">
                <h4>Behavior Extension Patterns</h4>
                <p class="hint-text" style="margin-bottom: 1.5rem;">Common patterns for constraints, scoring, and dynamic logic.</p>
                <div class="reference-grid">
                  <article v-for="example in behaviorExamples" :key="example.title" class="reference-card">
                    <h5>{{ example.title }}</h5>
                    <p class="hint-text" style="margin-bottom: 0.5rem;">{{ example.description }}</p>
                    <pre class="code-output" style="font-size: 0.7rem; max-height: 200px; overflow: auto;">{{ example.snippet }}</pre>
                  </article>
                </div>
            </template>

            <template v-if="authoringSection === 'search-params'">
                <h4>Questionnaire Search Parameters</h4>
                <p class="hint-text" style="margin-bottom: 1rem;">Use these parameters to search for Questionnaires on a FHIR server (Form Manager).</p>
                <div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                    <thead>
                      <tr style="background: var(--c-bg-pane-header); border-bottom: 2px solid var(--c-border);">
                        <th style="text-align: left; padding: 0.75rem;">Parameter</th>
                        <th style="text-align: left; padding: 0.75rem;">Type</th>
                        <th style="text-align: left; padding: 0.75rem;">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="sp in questionnaireSearchParams" :key="sp.param" style="border-bottom: 1px solid var(--c-border);">
                        <td style="padding: 0.6rem 0.75rem; font-family: monospace; font-weight: 600;">{{ sp.param }}</td>
                        <td style="padding: 0.6rem 0.75rem; color: var(--c-accent);">{{ sp.type }}</td>
                        <td style="padding: 0.6rem 0.75rem; color: var(--c-text-secondary);">{{ sp.description }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
            </template>

            <template v-if="authoringSection === 'conformance'">
                <h4>SDC Conformance Profiles</h4>
                <p class="hint-text" style="margin-bottom: 1rem;">SDC defines Questionnaire profiles at different conformance levels for different capabilities.</p>
                <div style="overflow-x: auto; margin-bottom: 2rem;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                    <thead>
                      <tr style="background: var(--c-bg-pane-header); border-bottom: 2px solid var(--c-border);">
                        <th style="text-align: left; padding: 0.75rem;">Profile</th>
                        <th style="text-align: left; padding: 0.75rem;">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="p in conformanceProfiles" :key="p.profile" style="border-bottom: 1px solid var(--c-border);">
                        <td style="padding: 0.6rem 0.75rem; font-weight: 600;">{{ p.profile }}</td>
                        <td style="padding: 0.6rem 0.75rem; color: var(--c-text-secondary);">{{ p.description }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h4 style="margin-top: 2rem;">System Roles Summary</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem;">
                  <div v-for="role in workflowRoles" :key="role.role" style="background: var(--c-bg-pane-header); padding: 1rem; border-radius: 8px; border: 1px solid var(--c-border);">
                    <div style="font-size: 1.25rem; margin-bottom: 0.25rem;">{{ role.icon }}</div>
                    <h5 style="margin: 0 0 0.25rem 0; font-size: 0.85rem;">{{ role.role }}</h5>
                    <p class="hint-text" style="font-size: 0.75rem;">{{ role.description }}</p>
                  </div>
                </div>
            </template>
        </div>

      </div>
    </main>
  </div>
</template>
