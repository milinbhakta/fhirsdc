const COMMON_TOOLTIPS = {
  resourceType: 'FHIR resource type discriminator. Identifies the structure and rules for this JSON payload.',
  id: 'Logical id of the resource in its namespace.',
  url: 'Canonical URL that uniquely identifies a definitional resource (such as Questionnaire).',
  version: 'Business version of the resource content.',
  status: 'Lifecycle status of the resource content (for example: draft, active, retired).',
  date: 'Date of the resource version/publication.',
  extension: 'Additional data not part of the core base definition, represented as FHIR extensions.',
  subjectType: 'The allowed subject resource types that this questionnaire can be completed for.',
}

const QUESTIONNAIRE_TOOLTIPS = {
  name: 'Computer-friendly name for the Questionnaire.',
  title: 'Human-readable display title for the Questionnaire.',
  item: 'Array of questionnaire items. Each item can be a group or question and may contain nested item children.',
  linkId: 'Stable identifier that links a question definition to its response answer(s). Must be unique in the questionnaire.',
  text: 'Prompt text shown to the user for this group/question.',
  type: 'Question item data type (for example: group, string, integer, decimal, choice, boolean, date, text).',
  required: 'If true, this question must be answered when enabled.',
  readOnly: 'If true, users should not directly edit this value (often used with calculatedExpression).',
  answerOption: 'Inline allowed answer choices for choice/open-choice items.',
  valueCoding: 'Coded value object containing code/display/system semantics.',
  code: 'Machine-processable coded value.',
  display: 'Human-readable label for a coded value.',
  enableWhen: 'Conditional logic rules that control whether this item is shown/enabled based on another answer.',
  question: 'In enableWhen, the linkId of the controlling question.',
  operator: 'Comparison used by enableWhen (for example =, !=, >, <, exists).',
  answerBoolean: 'Expected boolean answer in enableWhen condition.',
  answerString: 'Expected string answer in enableWhen condition.',
  answerInteger: 'Expected integer answer in enableWhen condition.',
  answerDecimal: 'Expected decimal answer in enableWhen condition.',
  answerCoding: 'Expected coded answer in enableWhen condition.',
  enableBehavior: 'How multiple enableWhen rules combine: all (AND) or any (OR).',
  valueExpression: 'Expression payload used by extensions such as calculatedExpression.',
  language: 'Expression language identifier (for example text/fhirpath).',
  expression: 'FHIRPath expression body to compute/derive values or logic.',
}

const QUESTIONNAIRE_RESPONSE_TOOLTIPS = {
  questionnaire: 'Canonical reference to the source Questionnaire this response answers.',
  authored: 'Date/time when the response was authored.',
  item: 'Array of response items matching questionnaire linkIds; may contain nested items and/or answers.',
  linkId: 'Questionnaire item identifier this response item corresponds to.',
  answer: 'Answer list for the item. Most simple questions have a single answer object.',
  valueString: 'String answer value.',
  valueDate: 'Date answer value.',
  valueBoolean: 'Boolean answer value.',
  valueInteger: 'Integer answer value.',
  valueDecimal: 'Decimal answer value.',
  valueCoding: 'Coded answer value (typically from choice answer options).',
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
