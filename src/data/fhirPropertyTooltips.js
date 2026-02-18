const COMMON_TOOLTIPS = {
  resourceType: 'FHIR resource type discriminator. Identifies the structure and rules for this JSON payload.',
  id: 'Logical id of the resource in its namespace.',
  url: 'Canonical URL that uniquely identifies a definitional resource (such as Questionnaire).',
  version: 'Business version of the resource content.',
  status: 'Lifecycle status of the resource content (for example: draft, active, retired).',
  date: 'Date of the resource version/publication.',
  extension: 'Additional data not part of the core base definition, represented as FHIR extensions.',
  subjectType: 'The allowed subject resource types that this questionnaire can be completed for.',
  contained: 'Resources contained inline, often used for extraction templates or ValueSets.',
  meta: 'Metadata about the resource: versionId, lastUpdated, profile, security, tag.',
  publisher: 'Organization or individual responsible for maintaining this resource.',
  description: 'Natural language description of the resource purpose and usage.',
  useContext: 'Clinical contexts this resource applies to (specialty, condition, setting).',
  jurisdiction: 'Geographic or political jurisdiction where this resource applies.',
  derivedFrom: 'Canonical URL of a Questionnaire this one is derived from.',
}

const QUESTIONNAIRE_TOOLTIPS = {
  name: 'Computer-friendly name for the Questionnaire.',
  title: 'Human-readable display title for the Questionnaire.',
  item: 'Array of questionnaire items. Each item can be a group or question and may contain nested item children.',
  linkId: 'Stable identifier that links a question definition to its response answer(s). Must be unique in the questionnaire.',
  text: 'Prompt text shown to the user for this group/question.',
  type: 'Question item data type (for example: group, string, integer, decimal, choice, boolean, date, text, url, reference, quantity, attachment, open-choice, display).',
  required: 'If true, this question must be answered when enabled.',
  readOnly: 'If true, users should not directly edit this value (often used with calculatedExpression).',
  repeats: 'If true, the item may have multiple answer sets (repeating groups or multi-answer questions).',
  maxLength: 'Maximum number of characters allowed in a string/text answer.',
  answerOption: 'Inline allowed answer choices for choice/open-choice items.',
  answerValueSet: 'Canonical URL of a ValueSet containing the allowed choices for this item.',
  initial: 'Default answer(s) pre-filled when the form opens (static prepopulation).',
  definition: 'URL pointing to a StructureDefinition element, used for definition-based extraction.',
  prefix: 'Label prefix (e.g. "1.", "a)") displayed before item text.',
  valueCoding: 'Coded value object containing code/display/system semantics.',
  code: 'Machine-processable coded value. On items: associates an observation code for extraction.',
  display: 'Human-readable label for a coded value.',
  system: 'Code system URI that the code belongs to (e.g. http://loinc.org).',
  enableWhen: 'Conditional logic rules that control whether this item is shown/enabled based on another answer.',
  question: 'In enableWhen, the linkId of the controlling question.',
  operator: 'Comparison used by enableWhen (for example =, !=, >, <, >=, <=, exists).',
  answerBoolean: 'Expected boolean answer in enableWhen condition.',
  answerString: 'Expected string answer in enableWhen condition.',
  answerInteger: 'Expected integer answer in enableWhen condition.',
  answerDecimal: 'Expected decimal answer in enableWhen condition.',
  answerCoding: 'Expected coded answer in enableWhen condition.',
  enableBehavior: 'How multiple enableWhen rules combine: all (AND) or any (OR).',
  valueExpression: 'Expression payload used by extensions such as calculatedExpression.',
  language: 'Expression language identifier (for example text/fhirpath or application/x-fhir-query).',
  expression: 'FHIRPath expression body to compute/derive values or logic.',
  // SDC Extension tooltips
  calculatedExpression: 'SDC extension: FHIRPath expression continuously evaluated to compute this item\'s answer.',
  initialExpression: 'SDC extension: FHIRPath expression evaluated once at form load for initial value.',
  enableWhenExpression: 'SDC extension: FHIRPath expression (returns boolean) controlling item visibility.',
  answerExpression: 'SDC extension: FHIRPath expression dynamically generating answer options.',
  candidateExpression: 'SDC extension: Expression that pre-filters answer options for autocomplete.',
  variable: 'SDC extension: Named FHIRPath expression reusable across other expressions.',
  launchContext: 'SDC extension: Declares named context variables (%patient, %encounter) needed at form launch.',
  observationExtract: 'SDC extension: When true, extract this item\'s answer as a FHIR Observation.',
  observationLinkPeriod: 'SDC extension: Time period for observation-based population lookback.',
  itemControl: 'SDC rendering extension: Specifies the UI widget type (radio-button, slider, autocomplete, etc.).',
  hidden: 'SDC extension: Hides the item visually but keeps it in the data model for calculations.',
  subQuestionnaire: 'SDC extension: Canonical URL of a sub-questionnaire to inline via $assemble.',
  questionnaireAdaptive: 'SDC extension: Marks this questionnaire for adaptive ($next-question) administration.',
  targetStructureMap: 'SDC extension: StructureMap for extracting resources from the response.',
  sourceStructureMap: 'SDC extension: StructureMap for populating the form from source resources.',
  templateExtract: 'SDC extension: Reference to a contained Bundle template for template-based extraction.',
  signatureRequired: 'SDC extension: Requires digital signature on form submission.',
  entryFormat: 'SDC extension: Placeholder/mask text shown in empty input fields.',
  shortText: 'SDC extension: Abbreviated label for compact screen display.',
  collapsible: 'SDC extension: Makes a group collapsible (default-open or default-closed).',
  ordinalValue: 'Extension: Assigns a numeric weight/score to an answer option for scoring.',
}

const QUESTIONNAIRE_RESPONSE_TOOLTIPS = {
  questionnaire: 'Canonical reference to the source Questionnaire this response answers.',
  authored: 'Date/time when the response was authored.',
  author: 'Reference to the person who authored/submitted the response.',
  source: 'Reference to the person who provided the answers (if different from author).',
  subject: 'Reference to the patient/subject the response is about.',
  encounter: 'Reference to the encounter during which the response was authored.',
  item: 'Array of response items matching questionnaire linkIds; may contain nested items and/or answers.',
  linkId: 'Questionnaire item identifier this response item corresponds to.',
  answer: 'Answer list for the item. Most simple questions have a single answer object.',
  valueString: 'String answer value.',
  valueDate: 'Date answer value.',
  valueBoolean: 'Boolean answer value.',
  valueInteger: 'Integer answer value.',
  valueDecimal: 'Decimal answer value.',
  valueCoding: 'Coded answer value (typically from choice answer options).',
  valueQuantity: 'Quantity answer value with numeric value and unit.',
  valueReference: 'Reference answer value pointing to another FHIR resource.',
  valueUri: 'URI answer value.',
  valueAttachment: 'Attachment answer value (file upload).',
  valueDateTime: 'DateTime answer value.',
  valueTime: 'Time answer value.',
  code: 'Code part of the coding answer.',
  display: 'Human-readable label for the coding answer.',
}

function isIndexKey(key) {
  return /^\d+$/.test(String(key))
}

export function getPropertyTooltip(resourceType, key) {
  if (isIndexKey(key) || key === 'root') {
    return ''
  }

  const common = COMMON_TOOLTIPS[key]

  if (resourceType === 'Questionnaire') {
    return QUESTIONNAIRE_TOOLTIPS[key] || common || ''
  }

  if (resourceType === 'QuestionnaireResponse') {
    return QUESTIONNAIRE_RESPONSE_TOOLTIPS[key] || common || ''
  }

  return common || ''
}

export function getPropertyGuide(resourceType) {
  if (resourceType === 'Questionnaire') {
    return { ...COMMON_TOOLTIPS, ...QUESTIONNAIRE_TOOLTIPS }
  }

  if (resourceType === 'QuestionnaireResponse') {
    return { ...COMMON_TOOLTIPS, ...QUESTIONNAIRE_RESPONSE_TOOLTIPS }
  }

  return { ...COMMON_TOOLTIPS }
}
