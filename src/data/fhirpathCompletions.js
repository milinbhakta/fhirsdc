// FHIRPath function completions with descriptions
export const fhirpathFunctions = [
  // Existence
  { label: 'empty()', type: 'function', detail: 'Returns true if collection is empty', section: 'Existence' },
  { label: 'exists()', type: 'function', detail: 'Returns true if collection has elements', section: 'Existence' },
  { label: 'exists(criteria)', type: 'function', detail: 'Returns true if any element matches criteria', section: 'Existence' },
  { label: 'all(criteria)', type: 'function', detail: 'Returns true if all elements match', section: 'Existence' },
  { label: 'allTrue()', type: 'function', detail: 'Returns true if all items are true', section: 'Existence' },
  { label: 'anyTrue()', type: 'function', detail: 'Returns true if any item is true', section: 'Existence' },
  { label: 'allFalse()', type: 'function', detail: 'Returns true if all items are false', section: 'Existence' },
  { label: 'anyFalse()', type: 'function', detail: 'Returns true if any item is false', section: 'Existence' },
  { label: 'count()', type: 'function', detail: 'Returns the number of items', section: 'Existence' },
  { label: 'distinct()', type: 'function', detail: 'Returns unique values', section: 'Existence' },
  { label: 'isDistinct()', type: 'function', detail: 'Returns true if all values are unique', section: 'Existence' },

  // Filtering
  { label: 'where(criteria)', type: 'function', detail: 'Filter collection by criteria', section: 'Filtering' },
  { label: 'select(expression)', type: 'function', detail: 'Project/map each element', section: 'Filtering' },
  { label: 'repeat(expression)', type: 'function', detail: 'Recursively evaluate expression', section: 'Filtering' },
  { label: 'ofType(type)', type: 'function', detail: 'Filter by FHIR type', section: 'Filtering' },

  // Subsetting
  { label: 'first()', type: 'function', detail: 'Returns the first element', section: 'Subsetting' },
  { label: 'last()', type: 'function', detail: 'Returns the last element', section: 'Subsetting' },
  { label: 'single()', type: 'function', detail: 'Returns single element or error', section: 'Subsetting' },
  { label: 'skip(num)', type: 'function', detail: 'Skip first num elements', section: 'Subsetting' },
  { label: 'take(num)', type: 'function', detail: 'Take first num elements', section: 'Subsetting' },
  { label: 'tail()', type: 'function', detail: 'All elements except first', section: 'Subsetting' },
  { label: 'intersect(other)', type: 'function', detail: 'Intersection of two collections', section: 'Subsetting' },
  { label: 'exclude(other)', type: 'function', detail: 'Elements not in other', section: 'Subsetting' },

  // Conversion
  { label: 'iif(criterion, true-result, otherwise-result)', type: 'function', detail: 'Conditional: if criterion then true-result else otherwise-result', section: 'Conversion' },
  { label: 'toBoolean()', type: 'function', detail: 'Convert to boolean', section: 'Conversion' },
  { label: 'toInteger()', type: 'function', detail: 'Convert to integer', section: 'Conversion' },
  { label: 'toDecimal()', type: 'function', detail: 'Convert to decimal', section: 'Conversion' },
  { label: 'toString()', type: 'function', detail: 'Convert to string', section: 'Conversion' },
  { label: 'toDate()', type: 'function', detail: 'Convert to date', section: 'Conversion' },
  { label: 'toDateTime()', type: 'function', detail: 'Convert to dateTime', section: 'Conversion' },
  { label: 'toQuantity(unit)', type: 'function', detail: 'Convert to quantity', section: 'Conversion' },
  { label: 'convertsToBoolean()', type: 'function', detail: 'Check if convertible to boolean', section: 'Conversion' },
  { label: 'convertsToInteger()', type: 'function', detail: 'Check if convertible to integer', section: 'Conversion' },
  { label: 'convertsToDecimal()', type: 'function', detail: 'Check if convertible to decimal', section: 'Conversion' },
  { label: 'convertsToString()', type: 'function', detail: 'Check if convertible to string', section: 'Conversion' },
  { label: 'convertsToDate()', type: 'function', detail: 'Check if convertible to date', section: 'Conversion' },
  { label: 'convertsToDateTime()', type: 'function', detail: 'Check if convertible to dateTime', section: 'Conversion' },
  { label: 'convertsToQuantity()', type: 'function', detail: 'Check if convertible to quantity', section: 'Conversion' },

  // String
  { label: 'indexOf(substring)', type: 'function', detail: 'Index of first occurrence', section: 'String' },
  { label: 'substring(start, length)', type: 'function', detail: 'Extract substring', section: 'String' },
  { label: 'startsWith(prefix)', type: 'function', detail: 'Check if starts with prefix', section: 'String' },
  { label: 'endsWith(suffix)', type: 'function', detail: 'Check if ends with suffix', section: 'String' },
  { label: 'contains(substring)', type: 'function', detail: 'Check if contains substring', section: 'String' },
  { label: 'upper()', type: 'function', detail: 'Convert to uppercase', section: 'String' },
  { label: 'lower()', type: 'function', detail: 'Convert to lowercase', section: 'String' },
  { label: 'replace(pattern, substitution)', type: 'function', detail: 'Replace occurrences', section: 'String' },
  { label: 'matches(regex)', type: 'function', detail: 'Match against regex', section: 'String' },
  { label: 'replaceMatches(regex, substitution)', type: 'function', detail: 'Regex replace', section: 'String' },
  { label: 'length()', type: 'function', detail: 'String length', section: 'String' },
  { label: 'trim()', type: 'function', detail: 'Remove leading/trailing whitespace', section: 'String' },
  { label: 'split(separator)', type: 'function', detail: 'Split string into collection', section: 'String' },
  { label: 'join(separator)', type: 'function', detail: 'Join collection into string', section: 'String' },

  // Math
  { label: 'abs()', type: 'function', detail: 'Absolute value', section: 'Math' },
  { label: 'ceiling()', type: 'function', detail: 'Round up', section: 'Math' },
  { label: 'floor()', type: 'function', detail: 'Round down', section: 'Math' },
  { label: 'round()', type: 'function', detail: 'Round to nearest integer', section: 'Math' },
  { label: 'exp()', type: 'function', detail: 'e raised to the power', section: 'Math' },
  { label: 'ln()', type: 'function', detail: 'Natural logarithm', section: 'Math' },
  { label: 'log(base)', type: 'function', detail: 'Logarithm with base', section: 'Math' },
  { label: 'power(exponent)', type: 'function', detail: 'Raise to exponent', section: 'Math' },
  { label: 'sqrt()', type: 'function', detail: 'Square root', section: 'Math' },
  { label: 'truncate()', type: 'function', detail: 'Truncate to integer', section: 'Math' },

  // Aggregate
  { label: 'aggregate(aggregator, init)', type: 'function', detail: 'Perform aggregation with $total accumulator', section: 'Aggregate' },
  { label: 'sum()', type: 'function', detail: 'Sum of numeric values', section: 'Aggregate' },
  { label: 'min()', type: 'function', detail: 'Minimum value', section: 'Aggregate' },
  { label: 'max()', type: 'function', detail: 'Maximum value', section: 'Aggregate' },
  { label: 'avg()', type: 'function', detail: 'Average value', section: 'Aggregate' },

  // Type testing
  { label: 'is(type)', type: 'function', detail: 'Check if value is of type', section: 'Type' },
  { label: 'as(type)', type: 'function', detail: 'Cast value to type', section: 'Type' },

  // Utility
  { label: 'trace(name, expression)', type: 'function', detail: 'Debug: log value during evaluation', section: 'Utility' },
  { label: 'now()', type: 'function', detail: 'Current dateTime', section: 'Utility' },
  { label: 'today()', type: 'function', detail: 'Current date', section: 'Utility' },
  { label: 'timeOfDay()', type: 'function', detail: 'Current time', section: 'Utility' },

  // Boolean
  { label: 'not()', type: 'function', detail: 'Boolean negation', section: 'Boolean' },

  // FHIR-specific
  { label: 'resolve()', type: 'function', detail: 'Resolve a reference to its resource', section: 'FHIR' },
  { label: 'extension(url)', type: 'function', detail: 'Get extensions by URL', section: 'FHIR' },
  { label: 'hasValue()', type: 'function', detail: 'Check if primitive has a value', section: 'FHIR' },
  { label: 'memberOf(valueset)', type: 'function', detail: 'Check if code is in ValueSet', section: 'FHIR' },
  { label: 'conformsTo(profile)', type: 'function', detail: 'Check if conforms to profile', section: 'FHIR' },
]

// Common FHIR resource property paths
export const fhirResourceProperties = {
  Patient: [
    'resourceType', 'id', 'meta', 'name', 'name.family', 'name.given', 'name.use', 'name.prefix', 'name.suffix',
    'telecom', 'telecom.system', 'telecom.value', 'telecom.use',
    'gender', 'birthDate', 'active', 'deceased', 'deceasedBoolean', 'deceasedDateTime',
    'address', 'address.use', 'address.type', 'address.text', 'address.line', 'address.city', 'address.state', 'address.postalCode', 'address.country',
    'maritalStatus', 'multipleBirth', 'contact', 'communication', 'generalPractitioner', 'managingOrganization',
    'identifier', 'identifier.system', 'identifier.value',
  ],
  Observation: [
    'resourceType', 'id', 'meta', 'status', 'category', 'code', 'code.coding', 'code.coding.system', 'code.coding.code', 'code.coding.display', 'code.text',
    'subject', 'encounter', 'effectiveDateTime', 'effectivePeriod', 'issued',
    'valueQuantity', 'valueQuantity.value', 'valueQuantity.unit', 'valueCodeableConcept', 'valueString', 'valueBoolean', 'valueInteger',
    'component', 'component.code', 'component.valueQuantity',
    'interpretation', 'referenceRange', 'performer', 'bodySite', 'method',
  ],
  Questionnaire: [
    'resourceType', 'id', 'meta', 'url', 'version', 'name', 'title', 'status', 'date', 'publisher', 'description',
    'subjectType', 'derivedFrom', 'useContext', 'jurisdiction',
    'item', 'item.linkId', 'item.text', 'item.type', 'item.required', 'item.readOnly', 'item.repeats',
    'item.maxLength', 'item.answerOption', 'item.answerValueSet', 'item.initial', 'item.enableWhen', 'item.enableBehavior',
    'item.code', 'item.prefix', 'item.definition', 'item.extension', 'item.item',
  ],
  QuestionnaireResponse: [
    'resourceType', 'id', 'meta', 'questionnaire', 'status', 'subject', 'authored', 'author', 'source', 'encounter',
    'item', 'item.linkId', 'item.text', 'item.answer', 'item.item',
    'item.answer.valueString', 'item.answer.valueInteger', 'item.answer.valueDecimal', 'item.answer.valueBoolean',
    'item.answer.valueDate', 'item.answer.valueDateTime', 'item.answer.valueCoding', 'item.answer.valueQuantity',
    'item.answer.valueReference', 'item.answer.valueUri', 'item.answer.valueAttachment',
  ],
  Bundle: [
    'resourceType', 'id', 'meta', 'type', 'total', 'timestamp',
    'entry', 'entry.fullUrl', 'entry.resource', 'entry.resource.resourceType',
    'entry.search', 'entry.search.mode', 'entry.search.score',
    'entry.request', 'entry.response',
    'link', 'link.relation', 'link.url',
  ],
  Condition: [
    'resourceType', 'id', 'meta', 'clinicalStatus', 'verificationStatus', 'category', 'severity',
    'code', 'code.coding', 'code.coding.system', 'code.coding.code', 'code.coding.display', 'code.text',
    'bodySite', 'subject', 'encounter', 'onsetDateTime', 'onsetPeriod', 'abatementDateTime',
    'recordedDate', 'recorder', 'asserter', 'evidence', 'note',
  ],
}

// FHIRPath operators and keywords
export const fhirpathKeywords = [
  { label: 'and', type: 'keyword', detail: 'Boolean AND' },
  { label: 'or', type: 'keyword', detail: 'Boolean OR' },
  { label: 'xor', type: 'keyword', detail: 'Boolean exclusive OR' },
  { label: 'implies', type: 'keyword', detail: 'Boolean implication' },
  { label: 'not', type: 'keyword', detail: 'Boolean negation' },
  { label: 'true', type: 'keyword', detail: 'Boolean literal' },
  { label: 'false', type: 'keyword', detail: 'Boolean literal' },
  { label: 'in', type: 'keyword', detail: 'Membership test' },
  { label: 'contains', type: 'keyword', detail: 'Containment test' },
  { label: 'as', type: 'keyword', detail: 'Type cast' },
  { label: 'is', type: 'keyword', detail: 'Type check' },
  { label: 'div', type: 'keyword', detail: 'Integer division' },
  { label: 'mod', type: 'keyword', detail: 'Modulo' },
  { label: 'let', type: 'keyword', detail: 'Define a variable (let var := expr;)' },
]

// SDC-specific environment variables
export const fhirpathVariables = [
  { label: '%resource', type: 'variable', detail: 'Current QuestionnaireResponse resource' },
  { label: '%questionnaire', type: 'variable', detail: 'Source Questionnaire resource' },
  { label: '%patient', type: 'variable', detail: 'Launch context: Patient' },
  { label: '%encounter', type: 'variable', detail: 'Launch context: Encounter' },
  { label: '%user', type: 'variable', detail: 'Launch context: current user' },
  { label: '%context', type: 'variable', detail: 'Context for the current item' },
  { label: '%qitem', type: 'variable', detail: 'Questionnaire item that corresponds to the current context' },
  { label: '%ucum', type: 'variable', detail: 'UCUM unit system URL' },
  { label: '%sct', type: 'variable', detail: 'SNOMED CT system URL' },
  { label: '%loinc', type: 'variable', detail: 'LOINC system URL' },
]
