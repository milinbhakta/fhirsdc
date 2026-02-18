<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import fhirpath from 'fhirpath'
import r4Model from 'fhirpath/fhir-context/r4'

// ── Sample Resources ──
const sampleResources = {
  Patient: {
    resourceType: 'Patient',
    id: 'example',
    name: [
      {
        use: 'official',
        family: 'Chalmers',
        given: ['Peter', 'James'],
      },
      {
        use: 'usual',
        given: ['Jim'],
      },
    ],
    telecom: [
      { system: 'phone', value: '(03) 5555 6473', use: 'work', rank: 1 },
      { system: 'phone', value: '(03) 3410 5613', use: 'mobile', rank: 2 },
    ],
    gender: 'male',
    birthDate: '1974-12-25',
    active: true,
    address: [
      {
        use: 'home',
        type: 'both',
        text: '534 Erewhon St PeasantVille, Rainbow, Vic  3999',
        line: ['534 Erewhon St'],
        city: 'PleasantVille',
        district: 'Rainbow',
        state: 'Vic',
        postalCode: '3999',
        period: { start: '1974-12-25' },
      },
    ],
    managingOrganization: { reference: 'Organization/1' },
  },
  Observation: {
    resourceType: 'Observation',
    id: 'blood-pressure',
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '85354-9',
          display: 'Blood pressure panel',
        },
      ],
    },
    subject: { reference: 'Patient/example' },
    effectiveDateTime: '2024-09-17',
    component: [
      {
        code: {
          coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }],
        },
        valueQuantity: { value: 120, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
      },
      {
        code: {
          coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }],
        },
        valueQuantity: { value: 80, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
      },
    ],
  },
  Questionnaire: {
    resourceType: 'Questionnaire',
    id: 'example',
    status: 'active',
    title: 'Example Questionnaire',
    url: 'http://example.org/fhir/Questionnaire/example',
    item: [
      {
        linkId: 'name',
        text: 'What is your name?',
        type: 'string',
        required: true,
      },
      {
        linkId: 'dob',
        text: 'Date of birth',
        type: 'date',
      },
      {
        linkId: 'allergy',
        text: 'Do you have allergies?',
        type: 'boolean',
      },
      {
        linkId: 'allergy-detail',
        text: 'Describe your allergies',
        type: 'text',
        enableWhen: [{ question: 'allergy', operator: '=', answerBoolean: true }],
      },
    ],
  },
  QuestionnaireResponse: {
    resourceType: 'QuestionnaireResponse',
    id: 'example-response',
    status: 'completed',
    questionnaire: 'http://example.org/fhir/Questionnaire/example',
    authored: '2024-09-17T14:00:00Z',
    item: [
      { linkId: 'name', answer: [{ valueString: 'Jane Doe' }] },
      { linkId: 'dob', answer: [{ valueDate: '1990-03-15' }] },
      { linkId: 'allergy', answer: [{ valueBoolean: true }] },
      { linkId: 'allergy-detail', answer: [{ valueString: 'Peanuts, shellfish' }] },
    ],
  },
  Bundle: {
    resourceType: 'Bundle',
    id: 'example-bundle',
    type: 'searchset',
    total: 2,
    entry: [
      {
        fullUrl: 'http://example.org/fhir/Patient/1',
        resource: {
          resourceType: 'Patient',
          id: '1',
          name: [{ family: 'Smith', given: ['John'] }],
          gender: 'male',
          birthDate: '1985-01-15',
        },
      },
      {
        fullUrl: 'http://example.org/fhir/Patient/2',
        resource: {
          resourceType: 'Patient',
          id: '2',
          name: [{ family: 'Doe', given: ['Jane'] }],
          gender: 'female',
          birthDate: '1990-03-20',
        },
      },
    ],
  },
  Condition: {
    resourceType: 'Condition',
    id: 'example',
    clinicalStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }],
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }],
    },
    category: [
      {
        coding: [
          { system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis', display: 'Encounter Diagnosis' },
        ],
      },
    ],
    code: {
      coding: [{ system: 'http://snomed.info/sct', code: '386661006', display: 'Fever' }],
      text: 'Fever',
    },
    subject: { reference: 'Patient/example' },
    onsetDateTime: '2024-09-10',
    recordedDate: '2024-09-12',
  },
}

// ── Quick FHIRPath Examples ──
const quickExamples = {
  Patient: [
    { label: 'Official name', expr: "name.where(use='official').given" },
    { label: 'Family name', expr: 'name.first().family' },
    { label: 'Is active?', expr: 'active' },
    { label: 'Birth year', expr: "birthDate.substring(0,4)" },
    { label: 'Phone numbers', expr: "telecom.where(system='phone').value" },
    { label: 'Home address city', expr: "address.where(use='home').city" },
    { label: 'Has multiple names?', expr: 'name.count() > 1' },
    { label: 'All given names', expr: 'name.given' },
    { label: 'Type check', expr: 'name.first().given.first() is String' },
  ],
  Observation: [
    { label: 'Status', expr: 'status' },
    { label: 'LOINC code', expr: 'code.coding.code' },
    { label: 'Systolic value', expr: "component.where(code.coding.code='8480-6').valueQuantity.value" },
    { label: 'Diastolic value', expr: "component.where(code.coding.code='8462-4').valueQuantity.value" },
    { label: 'All component values', expr: 'component.valueQuantity.value' },
    { label: 'BP difference', expr: "component.where(code.coding.code='8480-6').valueQuantity.value - component.where(code.coding.code='8462-4').valueQuantity.value" },
    { label: 'Category display', expr: 'category.coding.display' },
  ],
  Questionnaire: [
    { label: 'All linkIds', expr: 'item.linkId' },
    { label: 'Required items', expr: 'item.where(required=true).text' },
    { label: 'Item types', expr: 'item.type' },
    { label: 'Boolean items', expr: "item.where(type='boolean').text" },
    { label: 'Count items', expr: 'item.count()' },
    { label: 'Has enableWhen?', expr: 'item.where(enableWhen.exists()).text' },
  ],
  QuestionnaireResponse: [
    { label: 'All answers', expr: 'item.answer' },
    { label: 'Name answer', expr: "item.where(linkId='name').answer.valueString" },
    { label: 'DOB answer', expr: "item.where(linkId='dob').answer.valueDate" },
    { label: 'Boolean answer', expr: "item.where(linkId='allergy').answer.valueBoolean" },
    { label: 'Answered items', expr: 'item.where(answer.exists()).linkId' },
    { label: 'Answer count', expr: 'item.answer.count()' },
  ],
  Bundle: [
    { label: 'Total', expr: 'total' },
    { label: 'All resource types', expr: 'entry.resource.resourceType' },
    { label: 'All patient names', expr: 'entry.resource.name.family' },
    { label: 'First entry ID', expr: 'entry.first().resource.id' },
    { label: 'Female patients', expr: "entry.resource.where(gender='female').name.family" },
    { label: 'Entry count', expr: 'entry.count()' },
  ],
  Condition: [
    { label: 'Clinical status', expr: 'clinicalStatus.coding.code' },
    { label: 'SNOMED code', expr: 'code.coding.code' },
    { label: 'Display text', expr: 'code.text' },
    { label: 'Onset date', expr: 'onsetDateTime' },
    { label: 'Category', expr: 'category.coding.display' },
    { label: 'Is confirmed?', expr: "verificationStatus.coding.code = 'confirmed'" },
  ],
}

// ── State ──
const selectedResource = ref('Patient')
const resourceJson = ref(JSON.stringify(sampleResources.Patient, null, 2))
const expression = ref("name.where(use='official').given")
const result = ref('')
const resultError = ref('')
const resultType = ref('') // 'success' | 'error' | 'empty'
const evaluationTimeMs = ref(0)

const variables = ref([])
const showVariablePanel = ref(false)
const shareUrl = ref('')
const showShareToast = ref(false)
const expressionHistory = ref([])
const showHistory = ref(false)

// ── Computed ──
const parsedResource = computed(() => {
  try {
    return { value: JSON.parse(resourceJson.value), error: null }
  } catch (e) {
    return { value: null, error: e.message }
  }
})

const currentExamples = computed(() => quickExamples[selectedResource.value] || [])

const jsonLineCount = computed(() => {
  return resourceJson.value.split('\n').length
})

// ── Methods ──
function loadSampleResource(type) {
  selectedResource.value = type
  const sample = sampleResources[type]
  if (sample) {
    resourceJson.value = JSON.stringify(sample, null, 2)
  }
  const examples = quickExamples[type]
  if (examples?.length) {
    expression.value = examples[0].expr
  }
  result.value = ''
  resultError.value = ''
  resultType.value = ''
}

function evaluate() {
  resultError.value = ''
  result.value = ''
  resultType.value = ''
  evaluationTimeMs.value = 0

  if (!expression.value.trim()) return
  if (parsedResource.value.error) {
    resultError.value = 'Cannot evaluate — the resource JSON is invalid.'
    resultType.value = 'error'
    return
  }

  // Build environment from custom variables
  const env = {}
  for (const v of variables.value) {
    if (v.name && v.value.trim()) {
      try {
        env[v.name] = JSON.parse(v.value)
      } catch {
        env[v.name] = v.value
      }
    }
  }

  const start = performance.now()

  try {
    // Support let bindings
    const letPattern = /^let\s+(\w+)\s*:=\s*(.+?);\s*/
    let remaining = expression.value.trim()
    const varNames = []

    while (letPattern.test(remaining)) {
      const match = remaining.match(letPattern)
      const varName = match[1]
      const varExpr = match[2]
      const varResult = fhirpath.evaluate(parsedResource.value.value, varExpr, env, r4Model)
      env[varName] = varResult.length === 1 ? varResult[0] : varResult
      varNames.push(varName)
      remaining = remaining.substring(match[0].length)
    }

    const sortedNames = [...varNames].sort((a, b) => b.length - a.length)
    for (const name of sortedNames) {
      remaining = remaining.replace(new RegExp(`(?<!%)\\b${name}\\b`, 'g'), `%${name}`)
    }

    const res = fhirpath.evaluate(parsedResource.value.value, remaining, env, r4Model)
    evaluationTimeMs.value = Math.round((performance.now() - start) * 100) / 100

    if (res.length === 0) {
      result.value = '[]  (empty result)'
      resultType.value = 'empty'
    } else {
      result.value = JSON.stringify(res, null, 2)
      resultType.value = 'success'
    }

    // Add to history
    addToHistory(expression.value, res.length)
  } catch (e) {
    evaluationTimeMs.value = Math.round((performance.now() - start) * 100) / 100
    resultError.value = e.message || 'Evaluation failed.'
    resultType.value = 'error'
  }
}

function addToHistory(expr, count) {
  const existing = expressionHistory.value.findIndex((h) => h.expression === expr)
  if (existing !== -1) {
    expressionHistory.value.splice(existing, 1)
  }
  expressionHistory.value.unshift({
    expression: expr,
    resultCount: count,
    timestamp: new Date().toLocaleTimeString(),
  })
  if (expressionHistory.value.length > 30) {
    expressionHistory.value.pop()
  }
}

function applyExample(expr) {
  expression.value = expr
  evaluate()
}

function applyFromHistory(entry) {
  expression.value = entry.expression
  showHistory.value = false
  evaluate()
}

function addVariable() {
  variables.value.push({ name: '', value: '' })
}

function removeVariable(index) {
  variables.value.splice(index, 1)
}

function formatJson() {
  try {
    const parsed = JSON.parse(resourceJson.value)
    resourceJson.value = JSON.stringify(parsed, null, 2)
  } catch {
    // ignore
  }
}

function generateShareUrl() {
  try {
    const data = {
      r: selectedResource.value,
      e: expression.value,
    }
    const encoded = btoa(JSON.stringify(data))
    const url = `${window.location.origin}${window.location.pathname}#/fhirpath-lab?q=${encoded}`
    shareUrl.value = url
    navigator.clipboard.writeText(url).catch(() => {})
    showShareToast.value = true
    setTimeout(() => {
      showShareToast.value = false
    }, 2500)
  } catch {
    // ignore
  }
}

function handleLoadFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result)
      resourceJson.value = JSON.stringify(json, null, 2)
      if (json.resourceType && sampleResources[json.resourceType]) {
        selectedResource.value = json.resourceType
      }
    } catch {
      resourceJson.value = e.target.result
    }
  }
  reader.readAsText(file)
}

function handleExpressionKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    evaluate()
  }
}

// Auto-evaluate on expression change (debounced)
let evalTimer = null
watch(expression, () => {
  clearTimeout(evalTimer)
  evalTimer = setTimeout(() => evaluate(), 400)
})

// Re-evaluate when resource changes
watch(resourceJson, () => {
  clearTimeout(evalTimer)
  evalTimer = setTimeout(() => evaluate(), 600)
})

// Initial evaluation
import { onMounted } from 'vue'
onMounted(() => {
  evaluate()
})
</script>

<template>
  <div class="fplab">
    <!-- Top Bar -->
    <header class="fplab-header">
      <div class="fplab-header-left">
        <router-link to="/" class="fplab-back-link">← Back to SDC Lab</router-link>
        <h1 class="fplab-title">FHIRPath Lab</h1>
        <span class="fplab-version">fhirpath.js v4.8.5 · FHIR R4</span>
      </div>
      <div class="fplab-header-right">
        <button class="fplab-btn fplab-btn-ghost" @click="showHistory = !showHistory" title="Expression History">
          🕐 History <span v-if="expressionHistory.length" class="fplab-badge">{{ expressionHistory.length }}</span>
        </button>
        <button class="fplab-btn fplab-btn-ghost" @click="generateShareUrl" title="Share URL">
          🔗 Share
        </button>
      </div>
    </header>

    <!-- Share toast -->
    <div v-if="showShareToast" class="fplab-toast">URL copied to clipboard!</div>

    <!-- History Panel -->
    <div v-if="showHistory && expressionHistory.length" class="fplab-history-panel">
      <div class="fplab-history-header">
        <span>Expression History</span>
        <button class="fplab-btn fplab-btn-ghost" style="font-size: 0.75rem;" @click="expressionHistory = []; showHistory = false;">Clear</button>
      </div>
      <div class="fplab-history-list">
        <button
          v-for="(entry, idx) in expressionHistory"
          :key="idx"
          class="fplab-history-item"
          @click="applyFromHistory(entry)"
        >
          <code>{{ entry.expression }}</code>
          <span class="fplab-history-meta">{{ entry.resultCount }} result{{ entry.resultCount !== 1 ? 's' : '' }} · {{ entry.timestamp }}</span>
        </button>
      </div>
    </div>

    <!-- Expression Bar -->
    <div class="fplab-expression-bar">
      <label class="fplab-expr-label">FHIRPath Expression</label>
      <div class="fplab-expr-row">
        <textarea
          v-model="expression"
          class="fplab-expr-input"
          rows="2"
          placeholder="Enter a FHIRPath expression, e.g. name.where(use='official').given"
          spellcheck="false"
          @keydown="handleExpressionKeydown"
        />
        <button class="fplab-btn fplab-btn-primary" @click="evaluate" title="Evaluate (Enter)">
          ▶ Evaluate
        </button>
      </div>
      <div class="fplab-expr-hints">
        <span>Press <kbd>Enter</kbd> to evaluate</span>
        <span>Supports <code>let var := expr;</code> bindings</span>
        <span v-if="evaluationTimeMs">{{ evaluationTimeMs }}ms</span>
      </div>
    </div>

    <!-- Main Content -->
    <div class="fplab-main">
      <!-- Left: Resource Editor -->
      <div class="fplab-panel fplab-resource-panel">
        <div class="fplab-panel-header">
          <span>Context Resource</span>
          <div class="fplab-panel-actions">
            <select
              v-model="selectedResource"
              class="fplab-resource-select"
              @change="loadSampleResource(selectedResource)"
            >
              <option v-for="key in Object.keys(sampleResources)" :key="key" :value="key">
                {{ key }}
              </option>
            </select>
            <label class="fplab-btn fplab-btn-ghost fplab-btn-xs" title="Load from file">
              📂 Load
              <input type="file" accept=".json" hidden @change="handleLoadFile" />
            </label>
            <button class="fplab-btn fplab-btn-ghost fplab-btn-xs" @click="formatJson" title="Format JSON">
              { } Format
            </button>
          </div>
        </div>
        <div class="fplab-panel-body">
          <div class="fplab-editor-wrap">
            <div class="fplab-line-numbers" aria-hidden="true">
              <div v-for="n in jsonLineCount" :key="n">{{ n }}</div>
            </div>
            <textarea
              v-model="resourceJson"
              class="fplab-editor"
              spellcheck="false"
              wrap="off"
            />
          </div>
          <div class="fplab-resource-status">
            <span v-if="parsedResource.error" class="fplab-status-bad">✗ Invalid JSON</span>
            <span v-else class="fplab-status-ok">✓ Valid {{ parsedResource.value?.resourceType || 'JSON' }}</span>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="fplab-right-col">
        <!-- Result Panel -->
        <div class="fplab-panel fplab-result-panel">
          <div class="fplab-panel-header">
            <span>Result</span>
            <span v-if="resultType === 'success'" class="fplab-result-count">
              {{ JSON.parse(result).length }} item{{ JSON.parse(result).length !== 1 ? 's' : '' }}
            </span>
          </div>
          <div class="fplab-panel-body fplab-result-body">
            <div v-if="resultError" class="fplab-result-error">
              <span class="fplab-result-error-icon">✗</span>
              <span>{{ resultError }}</span>
            </div>
            <pre v-else-if="resultType === 'empty'" class="fplab-result-pre fplab-result-empty">{{ result }}</pre>
            <pre v-else-if="result" class="fplab-result-pre">{{ result }}</pre>
            <div v-else class="fplab-result-placeholder">Result will appear here</div>
          </div>
        </div>

        <!-- Variables Panel -->
        <div class="fplab-panel fplab-vars-panel">
          <div class="fplab-panel-header">
            <span>
              Environment Variables
              <button class="fplab-btn fplab-btn-ghost fplab-btn-xs" @click="showVariablePanel = !showVariablePanel" style="margin-left: 0.5rem;">
                {{ showVariablePanel ? '▾ Hide' : '▸ Show' }}
              </button>
            </span>
            <button v-if="showVariablePanel" class="fplab-btn fplab-btn-ghost fplab-btn-xs" @click="addVariable">+ Add Variable</button>
          </div>
          <div v-if="showVariablePanel" class="fplab-vars-body">
            <div v-if="!variables.length" class="fplab-vars-empty">
              No custom variables defined. Click <strong>+ Add Variable</strong> to create one.
              <br /><span style="color: var(--c-text-tertiary); font-size: 0.78rem;">Variables are accessible in expressions as <code>%varName</code>.</span>
            </div>
            <div v-for="(v, idx) in variables" :key="idx" class="fplab-var-row">
              <div class="fplab-var-name-wrap">
                <span class="fplab-var-prefix">%</span>
                <input v-model="v.name" class="fplab-var-input fplab-var-name" placeholder="variableName" spellcheck="false" />
              </div>
              <input v-model="v.value" class="fplab-var-input fplab-var-value" placeholder='Value (JSON or string)' spellcheck="false" />
              <button class="fplab-btn fplab-btn-ghost fplab-btn-xs" @click="removeVariable(idx)" title="Remove">✕</button>
            </div>
          </div>
        </div>

        <!-- Quick Examples -->
        <div class="fplab-panel fplab-examples-panel">
          <div class="fplab-panel-header">
            <span>Quick Examples — {{ selectedResource }}</span>
          </div>
          <div class="fplab-examples-grid">
            <button
              v-for="ex in currentExamples"
              :key="ex.label"
              class="fplab-example-btn"
              :class="{ active: expression === ex.expr }"
              @click="applyExample(ex.expr)"
            >
              <span class="fplab-example-label">{{ ex.label }}</span>
              <code class="fplab-example-code">{{ ex.expr }}</code>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ── */
.fplab {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--c-bg, #f8f9fa);
  color: var(--c-text-primary, #1a1a2e);
  font-family: Inter, system-ui, -apple-system, sans-serif;
}

/* ── Header ── */
.fplab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: var(--c-bg-secondary, #fff);
  border-bottom: 1px solid var(--c-border, #e2e8f0);
  gap: 1rem;
  flex-wrap: wrap;
}

.fplab-header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.fplab-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.fplab-back-link {
  font-size: 0.82rem;
  color: var(--c-accent, #6366f1);
  text-decoration: none;
  white-space: nowrap;
}

.fplab-back-link:hover {
  text-decoration: underline;
}

.fplab-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  white-space: nowrap;
}

.fplab-version {
  font-size: 0.75rem;
  color: var(--c-text-secondary, #64748b);
  background: var(--c-bg, #f1f5f9);
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  white-space: nowrap;
}

/* ── Buttons ── */
.fplab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 500;
  transition: all 0.15s;
  white-space: nowrap;
}

.fplab-btn-primary {
  background: var(--c-accent, #6366f1);
  color: #fff;
  padding: 0.6rem 1.2rem;
  font-size: 0.88rem;
}

.fplab-btn-primary:hover {
  background: var(--c-accent-hover, #4f46e5);
}

.fplab-btn-ghost {
  background: transparent;
  color: var(--c-text-secondary, #64748b);
  padding: 0.4rem 0.65rem;
}

.fplab-btn-ghost:hover {
  background: var(--c-bg, #f1f5f9);
  color: var(--c-text-primary, #1a1a2e);
}

.fplab-btn-xs {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.fplab-badge {
  background: var(--c-accent, #6366f1);
  color: #fff;
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  margin-left: 0.2rem;
}

/* ── Toast ── */
.fplab-toast {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background: #059669;
  color: #fff;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-size: 0.85rem;
  z-index: 1000;
  animation: fadeInOut 2.5s ease;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(-8px); }
  15% { opacity: 1; transform: translateY(0); }
  85% { opacity: 1; }
  100% { opacity: 0; }
}

/* ── History ── */
.fplab-history-panel {
  border-bottom: 1px solid var(--c-border, #e2e8f0);
  background: var(--c-bg-secondary, #fff);
  max-height: 250px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.fplab-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1.5rem;
  font-size: 0.82rem;
  font-weight: 600;
  border-bottom: 1px solid var(--c-border, #e2e8f0);
}

.fplab-history-list {
  overflow: auto;
  padding: 0.35rem 0;
}

.fplab-history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.4rem 1.5rem;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 0.82rem;
  gap: 1rem;
  color: var(--c-text-primary);
}

.fplab-history-item:hover {
  background: var(--c-bg, #f1f5f9);
}

.fplab-history-item code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: var(--c-accent, #6366f1);
}

.fplab-history-meta {
  color: var(--c-text-tertiary, #94a3b8);
  font-size: 0.72rem;
  white-space: nowrap;
}

/* ── Expression Bar ── */
.fplab-expression-bar {
  padding: 1rem 1.5rem;
  background: var(--c-bg-secondary, #fff);
  border-bottom: 1px solid var(--c-border, #e2e8f0);
}

.fplab-expr-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--c-text-secondary, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.35rem;
  display: block;
}

.fplab-expr-row {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.fplab-expr-input {
  flex: 1;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.95rem;
  padding: 0.65rem 0.85rem;
  border: 2px solid var(--c-border, #e2e8f0);
  border-radius: 8px;
  background: var(--c-bg, #f8f9fa);
  color: var(--c-text-primary, #1a1a2e);
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
  line-height: 1.5;
}

.fplab-expr-input:focus {
  border-color: var(--c-accent, #6366f1);
}

.fplab-expr-hints {
  display: flex;
  gap: 1.5rem;
  margin-top: 0.4rem;
  font-size: 0.72rem;
  color: var(--c-text-tertiary, #94a3b8);
}

.fplab-expr-hints kbd {
  background: var(--c-bg, #f1f5f9);
  border: 1px solid var(--c-border, #e2e8f0);
  border-radius: 3px;
  padding: 0 0.3rem;
  font-family: inherit;
  font-size: 0.72rem;
}

.fplab-expr-hints code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
}

/* ── Main Layout ── */
.fplab-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1rem 1.5rem;
  flex: 1;
  min-height: 0;
}

/* ── Panels ── */
.fplab-panel {
  border: 1px solid var(--c-border, #e2e8f0);
  border-radius: 10px;
  background: var(--c-bg-secondary, #fff);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fplab-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.85rem;
  font-size: 0.8rem;
  font-weight: 600;
  background: var(--c-bg, #f8f9fa);
  border-bottom: 1px solid var(--c-border, #e2e8f0);
  min-height: 36px;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.fplab-panel-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.fplab-panel-body {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

/* ── Resource Panel ── */
.fplab-resource-panel {
  min-height: 400px;
}

.fplab-resource-select {
  font-size: 0.78rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--c-border, #e2e8f0);
  border-radius: 5px;
  background: var(--c-bg-secondary, #fff);
  color: var(--c-text-primary);
  cursor: pointer;
}

.fplab-editor-wrap {
  display: flex;
  height: 100%;
  min-height: 350px;
}

.fplab-line-numbers {
  padding: 0.75rem 0;
  text-align: right;
  min-width: 3rem;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.78rem;
  line-height: 1.55;
  color: var(--c-text-tertiary, #94a3b8);
  background: var(--c-bg, #f8f9fa);
  border-right: 1px solid var(--c-border, #e2e8f0);
  user-select: none;
  overflow: hidden;
}

.fplab-line-numbers > div {
  padding-right: 0.6rem;
}

.fplab-editor {
  flex: 1;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.82rem;
  line-height: 1.55;
  padding: 0.75rem 0.85rem;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--c-text-primary, #1a1a2e);
  overflow: auto;
  white-space: pre;
  tab-size: 2;
}

.fplab-resource-status {
  padding: 0.35rem 0.85rem;
  font-size: 0.72rem;
  border-top: 1px solid var(--c-border, #e2e8f0);
  background: var(--c-bg, #f8f9fa);
}

.fplab-status-ok {
  color: #059669;
}

.fplab-status-bad {
  color: #dc2626;
}

/* ── Right Column ── */
.fplab-right-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Result Panel ── */
.fplab-result-panel {
  min-height: 180px;
}

.fplab-result-count {
  font-size: 0.72rem;
  color: var(--c-text-secondary, #64748b);
  font-weight: 400;
}

.fplab-result-body {
  padding: 0;
}

.fplab-result-pre {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.82rem;
  line-height: 1.55;
  padding: 0.85rem;
  margin: 0;
  background: transparent;
  color: #059669;
  white-space: pre-wrap;
  word-break: break-word;
}

.fplab-result-empty {
  color: var(--c-text-tertiary, #94a3b8);
}

.fplab-result-error {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.85rem;
  color: #dc2626;
  font-size: 0.85rem;
}

.fplab-result-error-icon {
  font-weight: 700;
  flex-shrink: 0;
}

.fplab-result-placeholder {
  padding: 0.85rem;
  color: var(--c-text-tertiary, #94a3b8);
  font-style: italic;
  font-size: 0.85rem;
}

/* ── Variables Panel ── */
.fplab-vars-body {
  padding: 0.65rem 0.85rem;
}

.fplab-vars-empty {
  font-size: 0.82rem;
  color: var(--c-text-secondary, #64748b);
  line-height: 1.6;
}

.fplab-var-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.fplab-var-name-wrap {
  display: flex;
  align-items: center;
  gap: 0;
}

.fplab-var-prefix {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.85rem;
  color: var(--c-accent, #6366f1);
  font-weight: 600;
}

.fplab-var-input {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.82rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--c-border, #e2e8f0);
  border-radius: 5px;
  background: var(--c-bg, #f8f9fa);
  color: var(--c-text-primary, #1a1a2e);
  outline: none;
}

.fplab-var-input:focus {
  border-color: var(--c-accent, #6366f1);
}

.fplab-var-name {
  width: 130px;
}

.fplab-var-value {
  flex: 1;
}

/* ── Examples Panel ── */
.fplab-examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.5rem;
  padding: 0.75rem 0.85rem;
}

.fplab-example-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--c-border, #e2e8f0);
  border-radius: 7px;
  background: var(--c-bg, #f8f9fa);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.fplab-example-btn:hover {
  border-color: var(--c-accent, #6366f1);
  background: #f5f3ff;
}

.fplab-example-btn.active {
  border-color: var(--c-accent, #6366f1);
  background: #ede9fe;
}

.fplab-example-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--c-text-primary, #1a1a2e);
}

.fplab-example-code {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
  color: var(--c-accent, #6366f1);
  word-break: break-all;
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .fplab-main {
    grid-template-columns: 1fr;
  }

  .fplab-header {
    padding: 0.5rem 1rem;
  }

  .fplab-expression-bar {
    padding: 0.75rem 1rem;
  }

  .fplab-main {
    padding: 0.75rem 1rem;
  }

  .fplab-expr-row {
    flex-direction: column;
  }
}
</style>
