export const sampleQuestionnaire = {
  resourceType: 'Questionnaire',
  id: 'vitals-intake',
  url: 'http://example.org/fhir/Questionnaire/vitals-intake',
  version: '1.0.0',
  name: 'VitalsIntakeQuestionnaire',
  title: 'Vitals Intake',
  status: 'active',
  subjectType: ['Patient'],
  date: '2026-02-18',
  item: [
    {
      linkId: 'demographics',
      text: 'Demographics',
      type: 'group',
      item: [
        {
          linkId: 'first-name',
          text: 'First Name',
          type: 'string',
          required: true,
        },
        {
          linkId: 'dob',
          text: 'Date of Birth',
          type: 'date',
          required: true,
        },
      ],
    },
    {
      linkId: 'vitals',
      text: 'Vitals',
      type: 'group',
      item: [
        {
          linkId: 'height',
          text: 'Height (cm)',
          type: 'integer',
          required: true,
        },
        {
          linkId: 'weight',
          text: 'Weight (kg)',
          type: 'integer',
          required: true,
        },
        {
          linkId: 'smoker',
          text: 'Current smoker?',
          type: 'boolean',
        },
        {
          linkId: 'smoker-amount',
          text: 'Cigarettes per day',
          type: 'integer',
          enableWhen: [
            {
              question: 'smoker',
              operator: '=',
              answerBoolean: true,
            },
          ],
        },
        {
          linkId: 'bmi',
          text: 'Calculated BMI',
          type: 'decimal',
          readOnly: true,
          extension: [
            {
              url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression',
              valueExpression: {
                language: 'text/fhirpath',
                expression:
                  "let h := item.where(linkId='vitals').item.where(linkId='height').answer.valueInteger.first(); let w := item.where(linkId='vitals').item.where(linkId='weight').answer.valueInteger.first(); iif(h.exists() and w.exists(), w / ((h / 100) * (h / 100)), {})",
              },
            },
          ],
        },
      ],
    },
    {
      linkId: 'pain',
      text: 'Pain severity',
      type: 'choice',
      answerOption: [
        { valueCoding: { code: 'none', display: 'No pain' } },
        { valueCoding: { code: 'mild', display: 'Mild' } },
        { valueCoding: { code: 'moderate', display: 'Moderate' } },
        { valueCoding: { code: 'severe', display: 'Severe' } },
      ],
    },
    {
      linkId: 'notes',
      text: 'Clinical note',
      type: 'text',
      enableWhen: [
        {
          question: 'pain',
          operator: '=',
          answerCoding: {
            code: 'severe',
          },
        },
      ],
    },
  ],
}

export const sampleQuestionnaireResponse = {
  resourceType: 'QuestionnaireResponse',
  id: 'vitals-intake-response',
  questionnaire: 'http://example.org/fhir/Questionnaire/vitals-intake',
  status: 'completed',
  authored: '2026-02-18T13:20:00Z',
  item: [
    {
      linkId: 'demographics',
      item: [
        { linkId: 'first-name', answer: [{ valueString: 'Aarav' }] },
        { linkId: 'dob', answer: [{ valueDate: '1990-07-03' }] },
      ],
    },
    {
      linkId: 'vitals',
      item: [
        { linkId: 'height', answer: [{ valueInteger: 176 }] },
        { linkId: 'weight', answer: [{ valueInteger: 72 }] },
        { linkId: 'smoker', answer: [{ valueBoolean: false }] },
        { linkId: 'bmi', answer: [{ valueDecimal: 23.24 }] },
      ],
    },
    {
      linkId: 'pain',
      answer: [{ valueCoding: { code: 'mild', display: 'Mild' } }],
    },
    {
      linkId: 'notes',
      answer: [{ valueString: 'Intermittent headache for 2 days' }],
    },
  ],
}

export const fhirPathExamples = [
  {
    label: 'Get all top-level question linkIds',
    expression: 'item.linkId',
  },
  {
    label: 'Get required question linkIds',
    expression: "item.where(required=true).linkId",
  },
  {
    label: 'Get all response answer values',
    expression: 'item.descendants().answer.children()',
  },
  {
    label: 'Find pain severity coding display',
    expression: "item.where(linkId='pain').answer.valueCoding.display",
  },
  {
    label: 'Calculate BMI from response answers',
    expression:
      "let h := item.where(linkId='vitals').item.where(linkId='height').answer.valueInteger.first(); let w := item.where(linkId='vitals').item.where(linkId='weight').answer.valueInteger.first(); w / ((h / 100) * (h / 100))",
  },
  {
    label: 'Check if smoker-dependent question should render',
    expression:
      "item.where(linkId='vitals').item.where(linkId='smoker').answer.valueBoolean.first() = true",
  },
  {
    label: 'Read SDC calculatedExpression from Questionnaire',
    expression:
      "item.where(linkId='vitals').item.where(linkId='bmi').extension.where(url='http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression').valueExpression.expression",
  },
]

export const extractionMappingExamples = [
  {
    name: 'Patient name mapping',
    fhirPath: "item.where(linkId='demographics').item.where(linkId='first-name').answer.valueString.first()",
    target: 'Patient.name[0].given[0]',
  },
  {
    name: 'Patient birth date mapping',
    fhirPath: "item.where(linkId='demographics').item.where(linkId='dob').answer.valueDate.first()",
    target: 'Patient.birthDate',
  },
  {
    name: 'Body weight mapping',
    fhirPath: "item.where(linkId='vitals').item.where(linkId='weight').answer.valueInteger.first()",
    target: 'Observation(code=29463-7).valueQuantity.value',
  },
  {
    name: 'BMI mapping',
    fhirPath: "item.where(linkId='vitals').item.where(linkId='bmi').answer.valueDecimal.first()",
    target: 'Observation(code=39156-5).valueQuantity.value',
  },
  {
    name: 'Pain severity mapping',
    fhirPath: "item.where(linkId='pain').answer.valueCoding.code.first()",
    target: 'Condition.severity.coding[0].code',
  },
]
