/**
 * FHIR Client Utility
 *
 * Lightweight wrapper for FHIR REST operations against any FHIR R4 server
 * or terminology server. Persists server configurations in localStorage.
 */

const STORAGE_KEY = 'fhirsdc-servers'

// ── Default public FHIR servers ─────────────────────────────────────
const DEFAULT_SERVERS = [
  {
    id: 'hapi-r4',
    name: 'HAPI FHIR R4 (Public)',
    url: 'https://hapi.fhir.org/baseR4',
    type: 'fhir',
    auth: 'none',
    headers: {},
  },
  {
    id: 'tx-fhir-org',
    name: 'HL7 Terminology Server (tx.fhir.org)',
    url: 'https://tx.fhir.org/r4',
    type: 'terminology',
    auth: 'none',
    headers: {},
  },
]

// ── Server Config Management ────────────────────────────────────────

export function loadServers() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch { /* ignore */ }
  return [...DEFAULT_SERVERS]
}

export function saveServers(servers) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(servers))
  } catch { /* ignore */ }
}

export function getActiveServer(servers, type = 'fhir') {
  return servers.find(s => s.type === type && s.active) || servers.find(s => s.type === type) || null
}

export function createServerConfig({ name, url, type = 'fhir', auth = 'none', token = '', headers = {}, corsProxy = false, corsProxyUrl = '' }) {
  return {
    id: `custom-${Date.now()}`,
    name,
    url: url.replace(/\/+$/, ''), // strip trailing slashes
    type,
    auth,
    token,
    headers,
    corsProxy,
    corsProxyUrl: corsProxyUrl.replace(/\/+$/, ''),
    active: false,
  }
}

// ── Low-Level Fetch ─────────────────────────────────────────────────

function buildHeaders(server) {
  const h = {
    Accept: 'application/fhir+json',
    'Content-Type': 'application/fhir+json',
    ...server.headers,
  }
  if (server.auth === 'bearer' && server.token) {
    h.Authorization = `Bearer ${server.token}`
  }
  return h
}

/**
 * Build the final URL, optionally routing through a CORS proxy.
 * Supported proxy patterns:
 *   - Prefix style: "https://corsproxy.io/?"  → https://corsproxy.io/?https://myserver/path
 *   - Path style:   "https://myproxy.com"     → https://myproxy.com/https://myserver/path
 */
function buildUrl(server, path) {
  const target = `${server.url}${path.startsWith('/') ? '' : '/'}${path}`
  if (!server.corsProxy || !server.corsProxyUrl) return target
  const proxy = server.corsProxyUrl
  // If proxy URL ends with ? or &, append target as query param (corsproxy.io style)
  if (proxy.endsWith('?') || proxy.endsWith('&')) {
    return `${proxy}${encodeURIComponent(target)}`
  }
  // Otherwise use path style
  return `${proxy}/${target}`
}

async function fhirFetch(server, path, options = {}) {
  const url = buildUrl(server, path)
  let resp
  try {
    resp = await fetch(url, {
      ...options,
      headers: {
        ...buildHeaders(server),
        ...(options.headers || {}),
      },
    })
  } catch (networkErr) {
    // Network errors include CORS blocks, DNS failures, server unreachable
    const msg = networkErr.message || 'Network error'
    if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('CORS')) {
      const hint = server.corsProxy
        ? `CORS proxy is enabled but the request still failed. Check that the proxy URL is correct and running.`
        : `The server is blocking browser requests (CORS). Enable the CORS Proxy option in server settings, or if using Azure FHIR, enable CORS in Azure Portal → FHIR service → CORS settings.`
      throw new Error(`Network error — ${hint} Original: ${msg}`)
    }
    throw new Error(`Network error: ${msg}`)
  }

  const contentType = resp.headers.get('content-type') || ''
  let body = null
  if (contentType.includes('json')) {
    body = await resp.json()
  } else {
    body = await resp.text()
  }

  if (!resp.ok) {
    const message =
      body?.issue?.[0]?.diagnostics ||
      body?.issue?.[0]?.details?.text ||
      (typeof body === 'string' ? body : `HTTP ${resp.status}`)
    throw new Error(message)
  }

  return body
}

// ── Capability Statement / Metadata ─────────────────────────────────

export async function testConnection(server) {
  try {
    const meta = await fhirFetch(server, '/metadata?_summary=true')
    return {
      ok: true,
      fhirVersion: meta.fhirVersion || 'unknown',
      software: meta.software?.name || 'unknown',
      resourceTypes: (meta.rest?.[0]?.resource || []).map(r => r.type).sort(),
    }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

// ── CRUD Operations ─────────────────────────────────────────────────

export async function readResource(server, resourceType, id) {
  return fhirFetch(server, `/${resourceType}/${id}`)
}

export async function searchResources(server, resourceType, params = {}) {
  const qs = new URLSearchParams(params).toString()
  const path = `/${resourceType}${qs ? `?${qs}` : ''}`
  return fhirFetch(server, path)
}

export async function createResource(server, resource) {
  return fhirFetch(server, `/${resource.resourceType}`, {
    method: 'POST',
    body: JSON.stringify(resource),
  })
}

export async function updateResource(server, resource) {
  return fhirFetch(server, `/${resource.resourceType}/${resource.id}`, {
    method: 'PUT',
    body: JSON.stringify(resource),
  })
}

// ── Operations ($validate, $populate, $extract, $expand) ────────────

export async function validateResource(server, resource) {
  return fhirFetch(server, `/${resource.resourceType}/$validate`, {
    method: 'POST',
    body: JSON.stringify(resource),
  })
}

export async function expandValueSet(server, url, filter = '', count = 20) {
  const params = new URLSearchParams({ url, count: String(count) })
  if (filter) params.set('filter', filter)
  return fhirFetch(server, `/ValueSet/$expand?${params}`)
}

export async function lookupCode(server, system, code) {
  const params = new URLSearchParams({ system, code })
  return fhirFetch(server, `/CodeSystem/$lookup?${params}`)
}

/**
 * Call $populate on a FHIR server.
 * - If `questionnaireId` is provided, uses instance-level: Questionnaire/{id}/$populate
 * - Otherwise falls back to type-level with the questionnaire resource as a parameter.
 */
export async function populateQuestionnaire(server, { questionnaireId, questionnaireResource, subjectRef } = {}) {
  const params = { resourceType: 'Parameters', parameter: [] }
  if (subjectRef) {
    params.parameter.push({ name: 'subject', valueReference: { reference: subjectRef } })
  }

  // Prefer instance-level (most servers support this reliably)
  if (questionnaireId) {
    return fhirFetch(server, `/Questionnaire/${encodeURIComponent(questionnaireId)}/$populate`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  // Type-level: pass the questionnaire resource directly
  if (questionnaireResource) {
    params.parameter.push({ name: 'questionnaire', resource: questionnaireResource })
  }
  return fhirFetch(server, '/Questionnaire/$populate', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/**
 * Call $extract on a FHIR server.
 * Posts the QuestionnaireResponse directly to the $extract endpoint.
 */
export async function extractResponse(server, questionnaireResponse) {
  // Try instance-level if the QR has an id on the server
  if (questionnaireResponse.id && !questionnaireResponse.id.startsWith('urn:')) {
    try {
      return await fhirFetch(server, `/QuestionnaireResponse/${encodeURIComponent(questionnaireResponse.id)}/$extract`, {
        method: 'POST',
        body: JSON.stringify({ resourceType: 'Parameters', parameter: [] }),
      })
    } catch { /* fall through to type-level */ }
  }

  // Type-level: pass QR as a resource parameter
  const params = {
    resourceType: 'Parameters',
    parameter: [
      { name: 'questionnaire-response', resource: questionnaireResponse },
    ],
  }
  return fhirFetch(server, '/QuestionnaireResponse/$extract', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/**
 * Call $assemble on a FHIR server.
 * Takes a modular Questionnaire (with subQuestionnaire references) and returns
 * a fully assembled Questionnaire with all items inlined.
 * - Instance-level: Questionnaire/{id}/$assemble
 * - Type-level: Questionnaire/$assemble (with questionnaire as parameter)
 */
export async function assembleQuestionnaire(server, { questionnaireId, questionnaireResource } = {}) {
  // Prefer instance-level (most SDC servers support this)
  if (questionnaireId) {
    return fhirFetch(server, `/Questionnaire/${encodeURIComponent(questionnaireId)}/$assemble`, {
      method: 'POST',
      body: JSON.stringify({ resourceType: 'Parameters', parameter: [] }),
    })
  }

  // Type-level: pass the questionnaire resource directly
  if (questionnaireResource) {
    const params = {
      resourceType: 'Parameters',
      parameter: [
        { name: 'questionnaire', resource: questionnaireResource },
      ],
    }
    return fhirFetch(server, '/Questionnaire/$assemble', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  throw new Error('Either questionnaireId or questionnaireResource must be provided')
}

// ── Client-Side $assemble ───────────────────────────────────────────

const SUB_Q_EXT = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-subQuestionnaire'
const ASSEMBLED_FROM_EXT = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-assembledFrom'
const ASSEMBLE_EXPECT_EXT = 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-assemble-expectation'

/**
 * Fetch a Questionnaire from the server by canonical URL (url|version or just url).
 */
async function fetchByCanonical(server, canonical) {
  // Split url|version
  const [url, version] = canonical.split('|')
  const params = { url }
  if (version) params.version = version

  const bundle = await searchResources(server, 'Questionnaire', params)
  const entry = bundle?.entry?.[0]
  if (!entry?.resource) {
    throw new Error(`Sub-questionnaire not found on server: ${canonical}`)
  }
  return entry.resource
}

/**
 * Client-side $assemble implementation.
 *
 * Resolves all subQuestionnaire references by fetching them from the active FHIR
 * server, then inlines their items into the root questionnaire. This allows
 * assembly even when the server doesn't support $assemble natively.
 *
 * The algorithm:
 * 1. Walk all items recursively
 * 2. For each item with a subQuestionnaire extension → fetch the sub-Q
 * 3. Replace the placeholder item with the sub-Q's items
 * 4. Merge root-level extensions and variables from the sub-Q
 * 5. Add assembledFrom extensions for provenance
 * 6. Remove assemble-expectation extension from the output
 *
 * @param {Object} server - The active FHIR server config
 * @param {Object} rootQuestionnaire - The modular root Questionnaire resource
 * @param {Function} [onProgress] - Optional callback(message) for progress updates
 * @returns {Object} The assembled Questionnaire
 */
export async function assembleLocal(server, rootQuestionnaire, onProgress) {
  const root = JSON.parse(JSON.stringify(rootQuestionnaire)) // deep clone
  const assembledFromCanonicals = []
  const fetchCache = {} // canonical → resource (avoid duplicate fetches)

  async function fetchSubQ(canonical) {
    if (fetchCache[canonical]) return JSON.parse(JSON.stringify(fetchCache[canonical]))
    onProgress?.(`Fetching: ${canonical}`)
    const resource = await fetchByCanonical(server, canonical)
    fetchCache[canonical] = resource
    return JSON.parse(JSON.stringify(resource)) // return a clone
  }

  /**
   * Process an array of items, resolving any subQuestionnaire references.
   * Returns a new flat array with placeholders replaced by sub-Q items.
   */
  async function processItems(items) {
    if (!items?.length) return []

    const result = []
    for (const item of items) {
      const subQExt = item.extension?.find(e => e.url === SUB_Q_EXT)

      if (subQExt) {
        // This item is a placeholder — fetch and inline the sub-questionnaire
        const canonical = subQExt.valueCanonical
        const subQ = await fetchSubQ(canonical)

        // Track provenance
        if (!assembledFromCanonicals.includes(canonical)) {
          assembledFromCanonicals.push(canonical)
        }

        // Merge sub-Q's root-level extensions (variables, etc.) into the root
        if (subQ.extension?.length) {
          if (!root.extension) root.extension = []
          for (const ext of subQ.extension) {
            // Skip assemble-expectation and subQuestionnaire extensions
            if (ext.url === ASSEMBLE_EXPECT_EXT || ext.url === SUB_Q_EXT) continue
            // Avoid duplicate extensions (by url + value)
            const extJson = JSON.stringify(ext)
            if (!root.extension.some(e => JSON.stringify(e) === extJson)) {
              root.extension.push(ext)
            }
          }
        }

        // Inline the sub-Q's items (recursively processing nested subQ refs)
        if (subQ.item?.length) {
          const processedSubItems = await processItems(subQ.item)
          result.push(...processedSubItems)
        }
      } else {
        // Regular item — recursively process children
        if (item.item?.length) {
          item.item = await processItems(item.item)
        }
        result.push(item)
      }
    }
    return result
  }

  onProgress?.('Starting assembly...')

  // Process all items
  root.item = await processItems(root.item)

  // Add assembledFrom extensions
  if (!root.extension) root.extension = []
  for (const canonical of assembledFromCanonicals) {
    root.extension.push({
      url: ASSEMBLED_FROM_EXT,
      valueCanonical: canonical,
    })
  }

  // Remove assemble-expectation extension from the output
  root.extension = root.extension.filter(e => e.url !== ASSEMBLE_EXPECT_EXT)

  // Clean up empty extension arrays
  if (root.extension.length === 0) delete root.extension

  onProgress?.(`Assembly complete — ${assembledFromCanonicals.length} sub-questionnaire(s) resolved`)

  return root
}

// ── Terminology Convenience ─────────────────────────────────────────

export async function searchValueSets(server, params = {}) {
  return searchResources(server, 'ValueSet', { _count: '20', _summary: 'true', ...params })
}

export async function searchCodeSystems(server, params = {}) {
  return searchResources(server, 'CodeSystem', { _count: '20', _summary: 'true', ...params })
}

// ── Questionnaire-specific helpers ──────────────────────────────────

export async function searchQuestionnaires(server, params = {}) {
  return searchResources(server, 'Questionnaire', { _count: '20', _sort: '-_lastUpdated', ...params })
}

export async function fetchQuestionnaireById(server, id) {
  return readResource(server, 'Questionnaire', id)
}
