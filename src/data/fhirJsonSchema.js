/**
 * Context-aware FHIR Questionnaire JSON schema for autocompletion.
 *
 * Structure:
 *   - `properties`: keys valid at this level, each with { description, type, enum?, children? }
 *   - `type`: 'object' | 'array' | 'string' | 'number' | 'boolean'
 *   - `enum`: array of allowed values for string properties
 *   - `children`: nested schema for object properties or array item schemas
 */

const extensionSchema = {
  url: { description: 'Extension URL identifier', type: 'string' },
  valueString: { description: 'String extension value', type: 'string' },
  valueInteger: { description: 'Integer extension value', type: 'number' },
  valueBoolean: { description: 'Boolean extension value', type: 'boolean' },
  valueCode: { description: 'Code extension value', type: 'string' },
  valueId: { description: 'Id extension value', type: 'string' },
  valueCoding: {
    description: 'Coded extension value',
    type: 'object',
    children: {
      system: { description: 'Code system URI', type: 'string' },
      code: { description: 'Code value', type: 'string' },
      display: { description: 'Human display', type: 'string' },
    },
  },
  valueExpression: {
    description: 'Expression extension value',
    type: 'object',
    children: {
      language: {
        description: 'Expression language',
        type: 'string',
        enum: ['text/fhirpath', 'application/x-fhir-query', 'text/cql'],
      },
      expression: { description: 'Expression body', type: 'string' },
      name: { description: 'Variable name for the expression result', type: 'string' },
      description: { description: 'Natural language description', type: 'string' },
    },
  },
  extension: {
    description: 'Nested extensions',
    type: 'array',
    children: {}, // recursive — filled at runtime
  },
}

const enableWhenSchema = {
  question: { description: 'linkId of the controlling question', type: 'string' },
  operator: {
    description: 'Comparison operator',
    type: 'string',
    enum: ['=', '!=', '>', '<', '>=', '<=', 'exists'],
  },
  answerBoolean: { description: 'Expected boolean answer', type: 'boolean', enum: [true, false] },
  answerString: { description: 'Expected string answer', type: 'string' },
  answerInteger: { description: 'Expected integer answer', type: 'number' },
  answerDecimal: { description: 'Expected decimal answer', type: 'number' },
  answerDate: { description: 'Expected date answer', type: 'string' },
  answerCoding: {
    description: 'Expected coded answer',
    type: 'object',
    children: {
      system: { description: 'Code system URI', type: 'string' },
      code: { description: 'Code value', type: 'string' },
      display: { description: 'Human display', type: 'string' },
    },
  },
}

const answerOptionSchema = {
  valueCoding: {
    description: 'Coded answer option',
    type: 'object',
    children: {
      system: { description: 'Code system URI', type: 'string' },
      code: { description: 'Code value', type: 'string' },
      display: { description: 'Human display', type: 'string' },
    },
  },
  valueString: { description: 'String answer option', type: 'string' },
  valueInteger: { description: 'Integer answer option', type: 'number' },
  valueDate: { description: 'Date answer option', type: 'string' },
  valueReference: {
    description: 'Reference answer option',
    type: 'object',
    children: {
      reference: { description: 'Resource reference', type: 'string' },
      display: { description: 'Display text', type: 'string' },
    },
  },
  initialSelected: { description: 'Whether this option is initially selected', type: 'boolean', enum: [true, false] },
}

const initialSchema = {
  valueString: { description: 'Initial string value', type: 'string' },
  valueBoolean: { description: 'Initial boolean value', type: 'boolean', enum: [true, false] },
  valueInteger: { description: 'Initial integer value', type: 'number' },
  valueDecimal: { description: 'Initial decimal value', type: 'number' },
  valueDate: { description: 'Initial date value', type: 'string' },
  valueCoding: {
    description: 'Initial coded value',
    type: 'object',
    children: {
      system: { description: 'Code system URI', type: 'string' },
      code: { description: 'Code value', type: 'string' },
      display: { description: 'Human display', type: 'string' },
    },
  },
}

const itemSchema = {
  linkId: { description: 'Unique item identifier linking definition to response', type: 'string' },
  text: { description: 'Prompt text shown to the user', type: 'string' },
  type: {
    description: 'Item data type',
    type: 'string',
    enum: [
      'group', 'display', 'boolean', 'decimal', 'integer', 'date', 'dateTime', 'time',
      'string', 'text', 'url', 'choice', 'open-choice', 'attachment', 'reference', 'quantity',
    ],
  },
  required: { description: 'Whether this item must be answered', type: 'boolean', enum: [true, false] },
  readOnly: { description: 'Whether this item is read-only (often for calculated values)', type: 'boolean', enum: [true, false] },
  repeats: { description: 'Whether the item may have multiple answers', type: 'boolean', enum: [true, false] },
  maxLength: { description: 'Maximum character length for string/text answers', type: 'number' },
  prefix: { description: 'Label prefix displayed before item text (e.g. "1.", "a)")', type: 'string' },
  definition: { description: 'URL to a StructureDefinition element for extraction', type: 'string' },
  code: {
    description: 'Code for observation extraction',
    type: 'array',
    children: {
      system: { description: 'Code system URI (e.g. http://loinc.org)', type: 'string' },
      code: { description: 'Code value', type: 'string' },
      display: { description: 'Human display', type: 'string' },
    },
  },
  enableWhen: {
    description: 'Conditional logic controlling item visibility',
    type: 'array',
    children: enableWhenSchema,
  },
  enableBehavior: {
    description: 'How multiple enableWhen rules combine',
    type: 'string',
    enum: ['all', 'any'],
  },
  answerOption: {
    description: 'Inline answer choices for choice/open-choice items',
    type: 'array',
    children: answerOptionSchema,
  },
  answerValueSet: { description: 'Canonical URL of a ValueSet with allowed choices', type: 'string' },
  initial: {
    description: 'Default answer(s) pre-filled when the form opens',
    type: 'array',
    children: initialSchema,
  },
  extension: {
    description: 'FHIR extensions (calculatedExpression, constraint, etc.)',
    type: 'array',
    children: extensionSchema,
  },
  item: {
    description: 'Nested child items (for groups or sub-questions)',
    type: 'array',
    children: null, // recursive — resolved at runtime
  },
}

// Set recursive reference
itemSchema.item.children = itemSchema

const questionnaireSchema = {
  resourceType: {
    description: 'FHIR resource type discriminator',
    type: 'string',
    enum: ['Questionnaire'],
  },
  id: { description: 'Logical id of the resource', type: 'string' },
  url: { description: 'Canonical URL uniquely identifying this Questionnaire', type: 'string' },
  version: { description: 'Business version of the Questionnaire', type: 'string' },
  name: { description: 'Computer-friendly name', type: 'string' },
  title: { description: 'Human-readable display title', type: 'string' },
  status: {
    description: 'Lifecycle status',
    type: 'string',
    enum: ['draft', 'active', 'retired', 'unknown'],
  },
  date: { description: 'Date of publication', type: 'string' },
  publisher: { description: 'Publisher name', type: 'string' },
  description: { description: 'Natural language description', type: 'string' },
  subjectType: {
    description: 'Allowed subject resource types',
    type: 'array',
    enum: ['Patient', 'Practitioner', 'Organization', 'RelatedPerson', 'Device', 'Group'],
  },
  derivedFrom: { description: 'Canonical URL of parent Questionnaire', type: 'string' },
  contained: { description: 'Inline contained resources', type: 'array' },
  meta: {
    description: 'Resource metadata',
    type: 'object',
    children: {
      profile: { description: 'Profiles this resource conforms to', type: 'array' },
      versionId: { description: 'Version ID', type: 'string' },
      lastUpdated: { description: 'Last updated timestamp', type: 'string' },
    },
  },
  extension: {
    description: 'Resource-level extensions',
    type: 'array',
    children: extensionSchema,
  },
  item: {
    description: 'Top-level questionnaire items',
    type: 'array',
    children: itemSchema,
  },
}

// Well-known extension URLs with descriptions
export const knownExtensionUrls = [
  { url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-constraint', description: 'Custom validation constraint' },
  { url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression', description: 'Calculated expression' },
  { url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression', description: 'Initial expression' },
  { url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-enableWhenExpression', description: 'EnableWhen expression' },
  { url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-answerExpression', description: 'Answer expression' },
  { url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-candidateExpression', description: 'Candidate expression' },
  { url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemExtractionContext', description: 'Item extraction context' },
  { url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract', description: 'Observation extraction' },
  { url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationLinkPeriod', description: 'Observation link period' },
  { url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-hidden', description: 'Hidden item' },
  { url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl', description: 'Item control (widget type)' },
  { url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue', description: 'Slider step value' },
  { url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-unit', description: 'Unit for quantity' },
  { url: 'http://hl7.org/fhir/StructureDefinition/entryFormat', description: 'Entry format / placeholder text' },
  { url: 'http://hl7.org/fhir/StructureDefinition/minValue', description: 'Minimum allowed value' },
  { url: 'http://hl7.org/fhir/StructureDefinition/maxValue', description: 'Maximum allowed value' },
  { url: 'http://hl7.org/fhir/StructureDefinition/regex', description: 'Regex validation pattern' },
  { url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext', description: 'Launch context variable' },
  { url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-variable', description: 'Named FHIRPath variable' },
  { url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-targetStructureMap', description: 'Target StructureMap for extraction' },
  { url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-sourceStructureMap', description: 'Source StructureMap for population' },
  { url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-subQuestionnaire', description: 'Sub-questionnaire reference' },
  { url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-collapsible', description: 'Collapsible group' },
  { url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-signatureRequired', description: 'Signature required' },
  { url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-shortText', description: 'Short text label' },
  { url: 'http://hl7.org/fhir/StructureDefinition/ordinalValue', description: 'Numeric ordinal/score value' },
]

// Constraint extension child keys
export const constraintExtensionKeys = [
  { url: 'key', description: 'Unique constraint identifier' },
  { url: 'severity', description: 'error or warning' },
  { url: 'human', description: 'Human-readable error message' },
  { url: 'expression', description: 'FHIRPath validation expression' },
]

export const schemas = {
  Questionnaire: questionnaireSchema,
}

export { itemSchema, questionnaireSchema, extensionSchema, enableWhenSchema, answerOptionSchema }
