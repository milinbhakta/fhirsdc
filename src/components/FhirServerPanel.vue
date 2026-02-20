<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import {
  loadServers,
  saveServers,
  createServerConfig,
  testConnection,
  getActiveServer,
  searchQuestionnaires,
  fetchQuestionnaireById,
  validateResource,
  expandValueSet,
  lookupCode,
  searchValueSets,
  searchCodeSystems,
  searchResources,
  assembleQuestionnaire,
  assembleLocal,
} from '@/utils/fhirClient'

const emit = defineEmits(['load-questionnaire', 'server-status-change'])

// ── Server Management ──
const servers = ref([])
const showAddForm = ref(false)
const newServer = ref({ name: '', url: '', type: 'fhir', auth: 'none', token: '', corsProxy: false, corsProxyUrl: '' })
const connectionResults = ref({}) // { [serverId]: { ok, fhirVersion, software, error } }
const testingId = ref(null)

onMounted(() => {
  servers.value = loadServers()
  // Mark first of each type as active if none are
  for (const type of ['fhir', 'terminology']) {
    if (!servers.value.find(s => s.type === type && s.active)) {
      const first = servers.value.find(s => s.type === type)
      if (first) first.active = true
    }
  }
  persist()
})

function persist() {
  saveServers(servers.value)
  emitStatus()
}

function emitStatus() {
  const fhir = getActiveServer(servers.value, 'fhir')
  const tx = getActiveServer(servers.value, 'terminology')
  emit('server-status-change', {
    fhir: fhir ? { name: fhir.name, url: fhir.url, connected: connectionResults.value[fhir.id]?.ok === true } : null,
    terminology: tx ? { name: tx.name, url: tx.url, connected: connectionResults.value[tx.id]?.ok === true } : null,
  })
}

function addServer() {
  if (!newServer.value.name || !newServer.value.url) return
  const cfg = createServerConfig(newServer.value)
  servers.value.push(cfg)
  persist()
  newServer.value = { name: '', url: '', type: 'fhir', auth: 'none', token: '', corsProxy: false, corsProxyUrl: '' }
  showAddForm.value = false
}

function removeServer(id) {
  servers.value = servers.value.filter(s => s.id !== id)
  persist()
}

function setActive(server) {
  servers.value.forEach(s => {
    if (s.type === server.type) s.active = (s.id === server.id)
  })
  persist()
}

function onCorsToggle(server) {
  if (server.corsProxy && !server.corsProxyUrl) {
    server.corsProxyUrl = 'https://corsproxy.io/?'
  }
  persist()
}

async function testServer(server) {
  testingId.value = server.id
  connectionResults.value[server.id] = { testing: true }
  try {
    const result = await testConnection(server)
    connectionResults.value[server.id] = result
  } catch (err) {
    connectionResults.value[server.id] = { ok: false, error: err.message }
  }
  testingId.value = null
  emitStatus()
}

const activeFhirServer = computed(() => getActiveServer(servers.value, 'fhir'))
const activeTermServer = computed(() => getActiveServer(servers.value, 'terminology'))

// ── Active Tab ──
const activePanel = ref('servers') // 'servers' | 'browse' | 'terminology' | 'validate' | 'operations'

// ── Browse Questionnaires ──
const browseQuery = ref('')
const browseResults = ref(null)
const browseLoading = ref(false)
const browseError = ref('')

async function browseSearch() {
  if (!activeFhirServer.value) { browseError.value = 'No active FHIR server'; return }
  browseLoading.value = true
  browseError.value = ''
  browseResults.value = null
  try {
    const params = {}
    if (browseQuery.value.trim()) {
      params['title:contains'] = browseQuery.value.trim()
    }
    const bundle = await searchQuestionnaires(activeFhirServer.value, params)
    browseResults.value = bundle
  } catch (err) {
    browseError.value = err.message
  }
  browseLoading.value = false
}

async function loadFromServer(entry) {
  try {
    const q = entry.resource || await fetchQuestionnaireById(activeFhirServer.value, entry.id)
    emit('load-questionnaire', JSON.stringify(q, null, 2))
  } catch (err) {
    browseError.value = err.message
  }
}

// ── $assemble ──
const assembleLoading = ref(null) // holds entry id while loading
const assembleError = ref('')
const assembleProgress = ref('') // progress messages for local assemble
const assembleMode = ref('') // 'server' | 'local' — which method is running

/**
 * Check if a Questionnaire is a modular root (has subQuestionnaire references)
 * or has assemble-expectation extension.
 */
function isModularRoot(resource) {
  if (!resource) return false
  // Check for assemble-expectation extension on the questionnaire
  const hasAssembleExt = resource.extension?.some(e =>
    e.url?.includes('assemble-expectation') && e.valueCode === 'assemble-root'
  )
  if (hasAssembleExt) return true
  // Check items recursively for subQuestionnaire extension
  function hasSubQ(items) {
    if (!items) return false
    return items.some(item =>
      item.extension?.some(e => e.url?.includes('subQuestionnaire')) ||
      hasSubQ(item.item)
    )
  }
  return hasSubQ(resource.item)
}

/** Check if a Questionnaire is already assembled (has assembledFrom extension) */
function isAssembled(resource) {
  return resource?.extension?.some(e => e.url?.includes('assembledFrom')) || false
}

async function runAssemble(entry) {
  if (!activeFhirServer.value) { assembleError.value = 'No active FHIR server'; return }
  const resourceId = entry.resource?.id || entry.id
  assembleLoading.value = resourceId
  assembleMode.value = 'server'
  assembleError.value = ''
  assembleProgress.value = ''
  try {
    const result = await assembleQuestionnaire(activeFhirServer.value, { questionnaireId: resourceId })
    // The result could be a Parameters resource wrapping the assembled Q, or the Q directly
    let assembled = result
    if (result.resourceType === 'Parameters') {
      const qParam = result.parameter?.find(p => p.name === 'return' || p.resource?.resourceType === 'Questionnaire')
      assembled = qParam?.resource || result
    }
    emit('load-questionnaire', JSON.stringify(assembled, null, 2))
  } catch (err) {
    assembleError.value = `Server $assemble failed: ${err.message}. Try “Assemble (Client)” instead — it fetches sub-questionnaires and assembles locally.`
  }
  assembleLoading.value = null
  assembleMode.value = ''
}

async function runAssembleLocal(entry) {
  if (!activeFhirServer.value) { assembleError.value = 'No active FHIR server'; return }
  assembleError.value = ''
  assembleProgress.value = ''
  const resourceId = entry.resource?.id || entry.id
  assembleLoading.value = resourceId
  assembleMode.value = 'local'
  try {
    // Fetch the full resource if we only have a summary
    const fullQ = entry.resource?.item
      ? entry.resource
      : await fetchQuestionnaireById(activeFhirServer.value, resourceId)
    const assembled = await assembleLocal(
      activeFhirServer.value,
      fullQ,
      (msg) => { assembleProgress.value = msg }
    )
    emit('load-questionnaire', JSON.stringify(assembled, null, 2))
    assembleProgress.value = ''
  } catch (err) {
    assembleError.value = `Client-side assembly failed: ${err.message}`
  }
  assembleLoading.value = null
  assembleMode.value = ''
}

// ── Validate ──
const validateInput = ref('')
const validateResult = ref(null)
const validateLoading = ref(false)
const validateError = ref('')

async function runValidate() {
  if (!activeFhirServer.value) { validateError.value = 'No active FHIR server'; return }
  validateLoading.value = true
  validateError.value = ''
  validateResult.value = null
  try {
    const resource = JSON.parse(validateInput.value)
    validateResult.value = await validateResource(activeFhirServer.value, resource)
  } catch (err) {
    validateError.value = err.message
  }
  validateLoading.value = false
}

// ── Terminology ──
const txMode = ref('expand') // 'expand' | 'lookup' | 'browse-vs' | 'browse-cs'
const txExpandUrl = ref('')
const txExpandFilter = ref('')
const txExpandResult = ref(null)
const txLookupSystem = ref('')
const txLookupCode = ref('')
const txLookupResult = ref(null)
const txBrowseResults = ref(null)
const txLoading = ref(false)
const txError = ref('')

function getTermServer() {
  return activeTermServer.value || activeFhirServer.value
}

async function runExpand() {
  const srv = getTermServer()
  if (!srv) { txError.value = 'No terminology server configured'; return }
  txLoading.value = true
  txError.value = ''
  txExpandResult.value = null
  try {
    txExpandResult.value = await expandValueSet(srv, txExpandUrl.value, txExpandFilter.value)
  } catch (err) {
    txError.value = err.message
  }
  txLoading.value = false
}

async function runLookup() {
  const srv = getTermServer()
  if (!srv) { txError.value = 'No terminology server configured'; return }
  txLoading.value = true
  txError.value = ''
  txLookupResult.value = null
  try {
    txLookupResult.value = await lookupCode(srv, txLookupSystem.value, txLookupCode.value)
  } catch (err) {
    txError.value = err.message
  }
  txLoading.value = false
}

async function browseTermResources(type) {
  const srv = getTermServer()
  if (!srv) { txError.value = 'No terminology server configured'; return }
  txLoading.value = true
  txError.value = ''
  txBrowseResults.value = null
  try {
    if (type === 'ValueSet') {
      txBrowseResults.value = await searchValueSets(srv)
    } else {
      txBrowseResults.value = await searchCodeSystems(srv)
    }
  } catch (err) {
    txError.value = err.message
  }
  txLoading.value = false
}

// ── Operations ──
const opsMode = ref('custom') // 'custom'
const opsMethod = ref('GET')
const opsPath = ref('/metadata?_summary=true')
const opsBody = ref('')
const opsResult = ref(null)
const opsLoading = ref(false)
const opsError = ref('')

async function runOperation() {
  if (!activeFhirServer.value) { opsError.value = 'No active FHIR server'; return }
  opsLoading.value = true
  opsError.value = ''
  opsResult.value = null
  try {
    const url = `${activeFhirServer.value.url}${opsPath.value}`
    const options = {
      method: opsMethod.value,
      headers: {
        Accept: 'application/fhir+json',
        'Content-Type': 'application/fhir+json',
      },
    }
    if (activeFhirServer.value.auth === 'bearer' && activeFhirServer.value.token) {
      options.headers.Authorization = `Bearer ${activeFhirServer.value.token}`
    }
    if (['POST', 'PUT'].includes(opsMethod.value) && opsBody.value.trim()) {
      options.body = opsBody.value
    }
    const resp = await fetch(url, options)
    const ct = resp.headers.get('content-type') || ''
    opsResult.value = ct.includes('json') ? await resp.json() : await resp.text()
  } catch (err) {
    opsError.value = err.message
  }
  opsLoading.value = false
}

// ── Expose for parent ──
defineExpose({ activeFhirServer, activeTermServer, browseSearch })
</script>

<template>
  <div class="fhir-server-panel">
    <!-- Sub-tabs -->
    <div class="server-tabs">
      <button
        v-for="tab in [
          { id: 'servers', label: '⚙️ Servers', },
          { id: 'browse', label: '📂 Browse' },
          { id: 'terminology', label: '📖 Terminology' },
          { id: 'validate', label: '✅ Validate' },
          { id: 'operations', label: '🔧 REST Client' },
        ]"
        :key="tab.id"
        class="server-tab"
        :class="{ active: activePanel === tab.id }"
        @click="activePanel = tab.id"
      >{{ tab.label }}</button>
    </div>

    <!-- ═══ SERVERS TAB ═══ -->
    <div v-if="activePanel === 'servers'" class="server-section">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h3 style="margin: 0;">Server Connections</h3>
        <button class="btn btn-sm" @click="showAddForm = !showAddForm">
          {{ showAddForm ? '✕ Cancel' : '＋ Add Server' }}
        </button>
      </div>

      <!-- Add Server Form -->
      <div v-if="showAddForm" class="add-server-form">
        <div class="form-row">
          <label>Name</label>
          <input v-model="newServer.name" class="input-field" placeholder="My FHIR Server" />
        </div>
        <div class="form-row">
          <label>URL</label>
          <input v-model="newServer.url" class="input-field" placeholder="https://hapi.fhir.org/baseR4" />
        </div>
        <div class="form-row">
          <label>Type</label>
          <select v-model="newServer.type" class="input-select">
            <option value="fhir">FHIR Server</option>
            <option value="terminology">Terminology Server</option>
          </select>
        </div>
        <div class="form-row">
          <label>Auth</label>
          <select v-model="newServer.auth" class="input-select">
            <option value="none">None</option>
            <option value="bearer">Bearer Token</option>
          </select>
        </div>
        <div v-if="newServer.auth === 'bearer'" class="form-row">
          <label>Token</label>
          <input v-model="newServer.token" class="input-field" type="password" placeholder="Bearer token" />
        </div>
        <div class="form-row" style="align-items: center;">
          <label>CORS&nbsp;Proxy</label>
          <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.85rem;">
            <input type="checkbox" v-model="newServer.corsProxy" />
            Enable CORS proxy (for servers that block browser requests)
          </label>
        </div>
        <div v-if="newServer.corsProxy" class="form-row">
          <label>Proxy URL</label>
          <input v-model="newServer.corsProxyUrl" class="input-field" placeholder="https://corsproxy.io/?" />
          <span style="font-size: 0.72rem; color: var(--c-text-tertiary); margin-top: 0.25rem; display: block;">Public: <code>https://corsproxy.io/?</code> · Self-hosted: run <code>npx cors-anywhere</code> → <code>http://localhost:8080</code></span>
        </div>
        <button class="btn" style="margin-top: 0.5rem;" @click="addServer">Add Server</button>
      </div>

      <!-- Server List -->
      <div class="server-list">
        <div v-for="server in servers" :key="server.id" class="server-card" :class="{ active: server.active }">
          <div class="server-card-header">
            <div>
              <span class="server-type-badge" :class="server.type">{{ server.type === 'fhir' ? '🏥 FHIR' : '📖 TX' }}</span>
              <strong>{{ server.name }}</strong>
              <span v-if="server.active" class="active-badge">Active</span>
            </div>
            <div style="display: flex; gap: 0.25rem;">
              <button class="btn btn-sm" @click="testServer(server)" :disabled="testingId === server.id">
                {{ testingId === server.id ? '⏳...' : '🔌 Test' }}
              </button>
              <button v-if="!server.active" class="btn btn-sm" @click="setActive(server)">Set Active</button>
              <button v-if="server.id.startsWith('custom-')" class="btn btn-sm btn-danger" @click="removeServer(server.id)">✕</button>
            </div>
          </div>
          <div class="server-card-url">
            {{ server.url }}
            <span v-if="server.corsProxy" class="cors-proxy-badge" title="CORS proxy enabled">🔀 Proxy</span>
          </div>
          <!-- Inline CORS proxy toggle for existing servers -->
          <div v-if="server.id.startsWith('custom-')" class="cors-toggle-row">
            <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.78rem; color: var(--c-text-secondary);">
              <input type="checkbox" v-model="server.corsProxy" @change="onCorsToggle(server)" />
              CORS Proxy
            </label>
            <input v-if="server.corsProxy" v-model="server.corsProxyUrl" class="input-field" style="flex: 1; font-size: 0.78rem; padding: 0.2rem 0.4rem;" placeholder="https://corsproxy.io/?" @change="persist()" />
          </div>
          <div v-if="connectionResults[server.id]" class="connection-status" :class="{ success: connectionResults[server.id].ok, error: connectionResults[server.id].ok === false }">
            <template v-if="connectionResults[server.id].testing">Testing connection...</template>
            <template v-else-if="connectionResults[server.id].ok">
              ✅ Connected — FHIR {{ connectionResults[server.id].fhirVersion }} · {{ connectionResults[server.id].software }}
              <span v-if="connectionResults[server.id].resourceTypes?.length" style="font-size: 0.75rem; color: var(--c-text-tertiary); display: block; margin-top: 0.25rem;">
                {{ connectionResults[server.id].resourceTypes.length }} resource types supported
              </span>
            </template>
            <template v-else>❌ {{ connectionResults[server.id].error }}</template>
          </div>
        </div>
      </div>

      <div class="hint-box" style="margin-top: 1.5rem;">
        <h4>💡 Public FHIR Servers for Testing</h4>
        <ul style="margin: 0.5rem 0 0; padding-left: 1.2rem; font-size: 0.85rem;">
          <li><strong>HAPI FHIR R4</strong>: <code>https://hapi.fhir.org/baseR4</code> — popular open-source test server</li>
          <li><strong>tx.fhir.org</strong>: <code>https://tx.fhir.org/r4</code> — HL7 official terminology server</li>
          <li><strong>Firely Server</strong>: <code>https://server.fire.ly</code> — .NET based FHIR server</li>
          <li><strong>SMART Health IT</strong>: <code>https://r4.smarthealthit.org</code> — synthetic patient data</li>
        </ul>
      </div>

      <div class="hint-box" style="margin-top: 1rem;">
        <h4>🔀 CORS Troubleshooting</h4>
        <p style="font-size: 0.85rem; margin: 0.5rem 0 0;">Getting <strong>"Failed to fetch"</strong> or <strong>CORS errors</strong>? The FHIR server is blocking browser requests.</p>
        <ul style="margin: 0.5rem 0 0; padding-left: 1.2rem; font-size: 0.85rem;">
          <li><strong>Azure FHIR</strong>: In Azure Portal → your FHIR service → <em>CORS</em> → add your site's origin (e.g. <code>http://localhost:5173</code> or <code>https://yoursite.com</code>), and set allowed headers to <code>*</code></li>
          <li><strong>Quick fix</strong>: Enable the CORS Proxy option on your server config, and use <code>https://corsproxy.io/?</code> as the proxy URL</li>
          <li><strong>Self-hosted proxy</strong>: Run <code>npx cors-anywhere</code> locally and use <code>http://localhost:8080</code></li>
        </ul>
      </div>
    </div>

    <!-- ═══ BROWSE TAB ═══ -->
    <div v-if="activePanel === 'browse'" class="server-section">
      <h3>Browse Questionnaires from Server</h3>
      <p class="hint-text" style="margin-bottom: 1rem;">Search the active FHIR server for Questionnaire resources and load them into the Playground.</p>

      <div v-if="!activeFhirServer" class="hint-box" style="background: var(--c-danger-bg, #fef2f2);">
        ⚠️ No active FHIR server. Go to the Servers tab to configure one.
      </div>

      <template v-else>
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
          <input v-model="browseQuery" class="input-field" style="flex: 1;" placeholder="Search by title..." @keyup.enter="browseSearch" />
          <button class="btn" @click="browseSearch" :disabled="browseLoading">
            {{ browseLoading ? '⏳ Searching...' : '🔍 Search' }}
          </button>
        </div>

        <div v-if="browseError" class="error-text">{{ browseError }}</div>
        <div v-if="assembleError" class="error-text" style="margin-bottom: 0.5rem;">{{ assembleError }}</div>
        <div v-if="assembleProgress" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; padding: 0.5rem 0.75rem; background: #dbeafe; border-radius: 6px; font-size: 0.8rem; color: #1e40af;">
          <span style="animation: spin 1s linear infinite; display: inline-block;">⚙️</span> {{ assembleProgress }}
        </div>

        <div v-if="browseResults" class="browse-results">
          <div class="result-summary">
            Found {{ browseResults.total ?? browseResults.entry?.length ?? 0 }} questionnaire(s)
          </div>
          <div v-if="!browseResults.entry?.length" class="hint-text" style="text-align: center; padding: 2rem;">
            No questionnaires found. Try a different search or check your server connection.
          </div>
          <div v-for="entry in (browseResults.entry || [])" :key="entry.resource?.id || entry.fullUrl" class="browse-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
              <div>
                <h5 style="margin: 0 0 0.25rem;">{{ entry.resource?.title || entry.resource?.name || entry.resource?.id }}</h5>
                <div style="font-size: 0.75rem; color: var(--c-text-tertiary);">
                  <span v-if="entry.resource?.url">{{ entry.resource.url }}</span>
                  <span v-if="entry.resource?.version"> · v{{ entry.resource.version }}</span>
                  <span v-if="entry.resource?.status"> · {{ entry.resource.status }}</span>
                </div>
                <p v-if="entry.resource?.description" style="font-size: 0.8rem; margin: 0.5rem 0 0; color: var(--c-text-secondary);">
                  {{ entry.resource.description.substring(0, 200) }}{{ entry.resource.description.length > 200 ? '...' : '' }}
                </p>
              </div>
              <div style="display: flex; gap: 0.25rem; flex-shrink: 0; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
                <span v-if="isAssembled(entry.resource)" class="browse-badge assembled" title="This form was assembled from sub-questionnaires">✅ Assembled</span>
                <span v-else-if="isModularRoot(entry.resource)" class="browse-badge modular" title="This form has subQuestionnaire references">📦 Modular Root</span>
                <button class="btn btn-sm" @click="loadFromServer(entry)" title="Load into Playground">📥 Load</button>
                <template v-if="isModularRoot(entry.resource)">
                  <button class="btn btn-sm" @click="runAssemble(entry)" :disabled="!!assembleLoading" title="Ask the FHIR server to run $assemble (requires server support)">
                    {{ assembleLoading === (entry.resource?.id || entry.id) && assembleMode === 'server' ? '⏳...' : '🏥 Server $assemble' }}
                  </button>
                  <button class="btn btn-sm" style="background: #dbeafe; border-color: #93c5fd; color: #1e40af;" @click="runAssembleLocal(entry)" :disabled="!!assembleLoading" title="Fetch sub-questionnaires from server and assemble in the browser — works with any FHIR server">
                    {{ assembleLoading === (entry.resource?.id || entry.id) && assembleMode === 'local' ? '⏳...' : '🔧 Client $assemble' }}
                  </button>
                </template>
              </div>
            </div>
            <div v-if="entry.resource?.item" style="font-size: 0.75rem; color: var(--c-text-tertiary); margin-top: 0.5rem;">
              {{ entry.resource.item.length }} top-level item(s)
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ═══ TERMINOLOGY TAB ═══ -->
    <div v-if="activePanel === 'terminology'" class="server-section">
      <h3>Terminology Services</h3>
      <p class="hint-text" style="margin-bottom: 1rem;">
        Use your configured terminology server (or FHIR server) to expand ValueSets, look up codes, and browse terminology resources.
      </p>

      <div class="server-tabs" style="margin-bottom: 1rem;">
        <button class="server-tab" :class="{ active: txMode === 'expand' }" @click="txMode = 'expand'">$expand</button>
        <button class="server-tab" :class="{ active: txMode === 'lookup' }" @click="txMode = 'lookup'">$lookup</button>
        <button class="server-tab" :class="{ active: txMode === 'browse-vs' }" @click="txMode = 'browse-vs'; browseTermResources('ValueSet')">Browse ValueSets</button>
        <button class="server-tab" :class="{ active: txMode === 'browse-cs' }" @click="txMode = 'browse-cs'; browseTermResources('CodeSystem')">Browse CodeSystems</button>
      </div>

      <!-- $expand -->
      <div v-if="txMode === 'expand'">
        <div class="form-row">
          <label>ValueSet URL</label>
          <input v-model="txExpandUrl" class="input-field" placeholder="http://hl7.org/fhir/ValueSet/condition-code" />
        </div>
        <div class="form-row">
          <label>Filter (optional)</label>
          <input v-model="txExpandFilter" class="input-field" placeholder="diabetes" @keyup.enter="runExpand" />
        </div>
        <button class="btn" @click="runExpand" :disabled="txLoading" style="margin-top: 0.5rem;">
          {{ txLoading ? '⏳ Expanding...' : '🔍 Expand ValueSet' }}
        </button>

        <div v-if="txError" class="error-text" style="margin-top: 0.5rem;">{{ txError }}</div>

        <div v-if="txExpandResult?.expansion?.contains?.length" class="tx-results" style="margin-top: 1rem;">
          <div class="result-summary">
            {{ txExpandResult.expansion.total ?? txExpandResult.expansion.contains.length }} concept(s)
          </div>
          <table class="tx-table">
            <thead>
              <tr><th>Code</th><th>Display</th><th>System</th></tr>
            </thead>
            <tbody>
              <tr v-for="(concept, i) in txExpandResult.expansion.contains" :key="i">
                <td><code>{{ concept.code }}</code></td>
                <td>{{ concept.display }}</td>
                <td style="font-size: 0.75rem; color: var(--c-text-tertiary);">{{ concept.system }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else-if="txExpandResult && !txError" class="hint-text" style="margin-top: 1rem; text-align: center; padding: 1rem;">
          No concepts found in expansion.
        </div>
      </div>

      <!-- $lookup -->
      <div v-if="txMode === 'lookup'">
        <div class="form-row">
          <label>CodeSystem URL</label>
          <input v-model="txLookupSystem" class="input-field" placeholder="http://loinc.org" />
        </div>
        <div class="form-row">
          <label>Code</label>
          <input v-model="txLookupCode" class="input-field" placeholder="8480-6" @keyup.enter="runLookup" />
        </div>
        <button class="btn" @click="runLookup" :disabled="txLoading" style="margin-top: 0.5rem;">
          {{ txLoading ? '⏳ Looking up...' : '🔍 Lookup Code' }}
        </button>

        <div v-if="txError" class="error-text" style="margin-top: 0.5rem;">{{ txError }}</div>

        <div v-if="txLookupResult" class="tx-results" style="margin-top: 1rem;">
          <pre class="code-output" style="max-height: 400px; overflow: auto;">{{ JSON.stringify(txLookupResult, null, 2) }}</pre>
        </div>
      </div>

      <!-- Browse ValueSets / CodeSystems -->
      <div v-if="txMode === 'browse-vs' || txMode === 'browse-cs'">
        <div v-if="txLoading" class="hint-text" style="text-align: center; padding: 2rem;">⏳ Loading...</div>
        <div v-if="txError" class="error-text">{{ txError }}</div>
        <div v-if="txBrowseResults?.entry?.length" class="browse-results">
          <div class="result-summary">{{ txBrowseResults.total ?? txBrowseResults.entry.length }} result(s)</div>
          <div v-for="entry in txBrowseResults.entry" :key="entry.resource?.id || entry.fullUrl" class="browse-card">
            <h5 style="margin: 0 0 0.25rem;">{{ entry.resource?.title || entry.resource?.name || entry.resource?.id }}</h5>
            <div style="font-size: 0.75rem; color: var(--c-text-tertiary);">
              <code>{{ entry.resource?.url }}</code>
              <span v-if="entry.resource?.version"> · v{{ entry.resource.version }}</span>
              <span v-if="entry.resource?.status"> · {{ entry.resource.status }}</span>
            </div>
            <p v-if="entry.resource?.description" style="font-size: 0.8rem; margin: 0.5rem 0 0; color: var(--c-text-secondary);">
              {{ entry.resource.description.substring(0, 200) }}{{ entry.resource.description.length > 200 ? '...' : '' }}
            </p>
            <button v-if="txMode === 'browse-vs'" class="btn btn-sm" style="margin-top: 0.5rem;" 
              @click="txExpandUrl = entry.resource?.url; txMode = 'expand'">
              🔍 Expand this ValueSet
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ VALIDATE TAB ═══ -->
    <div v-if="activePanel === 'validate'" class="server-section">
      <h3>Server-Side $validate</h3>
      <p class="hint-text" style="margin-bottom: 1rem;">Paste a FHIR resource (Questionnaire, QuestionnaireResponse, etc.) and validate it against the FHIR server's profiles.</p>

      <div v-if="!activeFhirServer" class="hint-box" style="background: var(--c-danger-bg, #fef2f2);">
        ⚠️ No active FHIR server. Go to the Servers tab to configure one.
      </div>

      <template v-else>
        <textarea
          v-model="validateInput"
          class="input-field"
          style="width: 100%; height: 250px; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.8rem; resize: vertical;"
          placeholder='Paste a FHIR resource JSON here...'
        ></textarea>
        <button class="btn" @click="runValidate" :disabled="validateLoading" style="margin-top: 0.5rem;">
          {{ validateLoading ? '⏳ Validating...' : '✅ Validate on Server' }}
        </button>

        <div v-if="validateError" class="error-text" style="margin-top: 0.5rem;">{{ validateError }}</div>

        <div v-if="validateResult" class="validate-results" style="margin-top: 1rem;">
          <div v-for="(issue, i) in (validateResult.issue || [])" :key="i" class="validate-issue" :class="issue.severity">
            <span class="issue-severity">{{ issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️' }} {{ issue.severity }}</span>
            <span class="issue-message">{{ issue.diagnostics || issue.details?.text || 'No details' }}</span>
            <span v-if="issue.location?.length" class="issue-location">{{ issue.location.join(', ') }}</span>
          </div>
          <div v-if="!validateResult.issue?.length" class="hint-text" style="padding: 1rem; text-align: center;">
            ✅ No issues found — resource is valid!
          </div>
        </div>
      </template>
    </div>

    <!-- ═══ REST CLIENT TAB ═══ -->
    <div v-if="activePanel === 'operations'" class="server-section">
      <h3>FHIR REST Client</h3>
      <p class="hint-text" style="margin-bottom: 1rem;">
        Execute arbitrary FHIR REST calls against the active server. Great for exploring the API interactively.
      </p>

      <div v-if="!activeFhirServer" class="hint-box" style="background: var(--c-danger-bg, #fef2f2);">
        ⚠️ No active FHIR server. Go to the Servers tab to configure one.
      </div>

      <template v-else>
        <div class="rest-client-bar">
          <select v-model="opsMethod" class="input-select" style="width: 100px;">
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
          <div class="rest-url-display">
            <span class="rest-base">{{ activeFhirServer.url }}</span>
            <input v-model="opsPath" class="input-field rest-path-input" placeholder="/Questionnaire?_count=5" @keyup.enter="runOperation" />
          </div>
          <button class="btn" @click="runOperation" :disabled="opsLoading">
            {{ opsLoading ? '⏳' : '▶ Send' }}
          </button>
        </div>

        <div class="rest-quick-links" style="margin: 0.5rem 0;">
          <span style="font-size: 0.75rem; color: var(--c-text-tertiary);">Quick:</span>
          <button class="btn btn-sm" @click="opsMethod='GET'; opsPath='/metadata?_summary=true'">Metadata</button>
          <button class="btn btn-sm" @click="opsMethod='GET'; opsPath='/Questionnaire?_count=5&_sort=-_lastUpdated'">Questionnaires</button>
          <button class="btn btn-sm" @click="opsMethod='GET'; opsPath='/ValueSet?_count=5'">ValueSets</button>
          <button class="btn btn-sm" @click="opsMethod='GET'; opsPath='/Patient?_count=5'">Patients</button>
          <button class="btn btn-sm" @click="opsMethod='GET'; opsPath='/Observation?_count=5'">Observations</button>
        </div>

        <div v-if="['POST', 'PUT'].includes(opsMethod)" style="margin-top: 0.5rem;">
          <label style="font-size: 0.8rem; font-weight: 600; color: var(--c-text-secondary);">Request Body</label>
          <textarea
            v-model="opsBody"
            class="input-field"
            style="width: 100%; height: 150px; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.8rem; resize: vertical; margin-top: 0.25rem;"
            placeholder='{"resourceType": "..."}'
          ></textarea>
        </div>

        <div v-if="opsError" class="error-text" style="margin-top: 0.5rem;">{{ opsError }}</div>

        <div v-if="opsResult" style="margin-top: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--c-text-secondary);">Response</span>
            <button class="btn btn-sm" @click="opsResult = null">Clear</button>
          </div>
          <pre class="code-output" style="max-height: 500px; overflow: auto; font-size: 0.75rem;">{{ typeof opsResult === 'string' ? opsResult : JSON.stringify(opsResult, null, 2) }}</pre>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.fhir-server-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.server-tabs {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--c-border);
  padding: 0 1rem;
  flex-shrink: 0;
  overflow-x: auto;
}

.server-tab {
  border: none;
  background: none;
  padding: 0.6rem 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--c-text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  white-space: nowrap;
  transition: all 0.15s;
}
.server-tab:hover {
  color: var(--c-text-primary);
  background: var(--c-bg-hover, rgba(0,0,0,0.03));
}
.server-tab.active {
  color: var(--c-accent);
  border-bottom-color: var(--c-accent);
}

.server-section {
  flex: 1;
  overflow: auto;
  padding: 1.5rem;
}

.add-server-form {
  background: var(--c-bg-app);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.form-row label {
  font-size: 0.8rem;
  font-weight: 600;
  width: 80px;
  flex-shrink: 0;
  color: var(--c-text-secondary);
}
.form-row .input-field,
.form-row .input-select {
  flex: 1;
}

.server-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.server-card {
  border: 1px solid var(--c-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  background: var(--c-bg-card, #fff);
  transition: border-color 0.15s;
}
.server-card.active {
  border-color: var(--c-accent);
  box-shadow: 0 0 0 1px var(--c-accent);
}

.server-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.server-type-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  margin-right: 0.35rem;
}

.active-badge {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--c-success, #16a34a);
  background: var(--c-success-bg, #dcfce7);
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  margin-left: 0.35rem;
}

.server-card-url {
  font-size: 0.75rem;
  color: var(--c-text-tertiary);
  margin-top: 0.25rem;
  font-family: 'SF Mono', 'Fira Code', monospace;
  word-break: break-all;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.cors-proxy-badge {
  display: inline-block;
  font-size: 0.65rem;
  background: var(--c-info-bg, #eff6ff);
  color: var(--c-info, #1e40af);
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  font-family: system-ui, sans-serif;
  white-space: nowrap;
}

.cors-toggle-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.35rem;
  flex-wrap: wrap;
}

.connection-status {
  font-size: 0.8rem;
  margin-top: 0.5rem;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
}
.connection-status.success {
  background: var(--c-success-bg, #dcfce7);
  color: var(--c-success, #166534);
}
.connection-status.error {
  background: var(--c-danger-bg, #fef2f2);
  color: var(--c-danger, #991b1b);
}

.hint-box {
  background: var(--c-bg-app);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  padding: 1rem;
}

.browse-results {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.result-summary {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--c-text-secondary);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--c-border);
}

.browse-card {
  border: 1px solid var(--c-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  background: var(--c-bg-card, #fff);
  transition: background 0.15s;
}
.browse-card:hover {
  background: var(--c-bg-hover, rgba(0,0,0,0.02));
}

.browse-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  white-space: nowrap;
}
.browse-badge.assembled {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}
.browse-badge.modular {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
}

.tx-results {
  border: 1px solid var(--c-border);
  border-radius: 8px;
  overflow: hidden;
}

.tx-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}
.tx-table th {
  background: var(--c-bg-app);
  text-align: left;
  padding: 0.5rem 0.75rem;
  font-weight: 600;
  color: var(--c-text-secondary);
  border-bottom: 1px solid var(--c-border);
}
.tx-table td {
  padding: 0.4rem 0.75rem;
  border-bottom: 1px solid var(--c-border);
}
.tx-table tr:last-child td {
  border-bottom: none;
}

.validate-results {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.validate-issue {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.6rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
}
.validate-issue.error {
  background: var(--c-danger-bg, #fef2f2);
  border-left: 3px solid var(--c-danger, #dc2626);
}
.validate-issue.warning {
  background: #fffbeb;
  border-left: 3px solid #f59e0b;
}
.validate-issue.information {
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
}

.issue-severity {
  font-weight: 600;
  text-transform: capitalize;
}
.issue-message {
  color: var(--c-text-primary);
}
.issue-location {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
  color: var(--c-text-tertiary);
}

.rest-client-bar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.rest-url-display {
  flex: 1;
  display: flex;
  align-items: center;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  overflow: hidden;
  background: var(--c-bg-card, #fff);
}

.rest-base {
  background: var(--c-bg-app);
  padding: 0.45rem 0.5rem;
  font-size: 0.75rem;
  font-family: 'SF Mono', 'Fira Code', monospace;
  color: var(--c-text-tertiary);
  border-right: 1px solid var(--c-border);
  white-space: nowrap;
}

.rest-path-input {
  border: none !important;
  border-radius: 0 !important;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.8rem;
}

.rest-quick-links {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  flex-wrap: wrap;
}

.btn-danger {
  color: var(--c-danger, #dc2626) !important;
}
.btn-danger:hover {
  background: var(--c-danger-bg, #fef2f2) !important;
}

.error-text {
  color: var(--c-danger, #dc2626);
  font-size: 0.85rem;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
