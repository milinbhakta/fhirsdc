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

export function createServerConfig({ name, url, type = 'fhir', auth = 'none', token = '', headers = {} }) {
  return {
    id: `custom-${Date.now()}`,
    name,
    url: url.replace(/\/+$/, ''), // strip trailing slashes
    type,
    auth,
    token,
    headers,
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

async function fhirFetch(server, path, options = {}) {
  const url = `${server.url}${path.startsWith('/') ? '' : '/'}${path}`
  const resp = await fetch(url, {
    ...options,
    headers: {
      ...buildHeaders(server),
      ...(options.headers || {}),
    },
  })

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

export async function populateQuestionnaire(server, questionnaireUrl, subjectRef) {
  const params = {
    resourceType: 'Parameters',
    parameter: [
      { name: 'questionnaire', valueCanonical: questionnaireUrl },
    ],
  }
  if (subjectRef) {
    params.parameter.push({ name: 'subject', valueReference: { reference: subjectRef } })
  }
  return fhirFetch(server, '/Questionnaire/$populate', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function extractResponse(server, questionnaireResponse) {
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
