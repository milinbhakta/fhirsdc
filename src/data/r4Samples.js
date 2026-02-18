const vitalsQuestionnaire = {
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

const vitalsQuestionnaireResponse = {
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

const vitalsFhirPathExamples = [
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

const vitalsExtractionMappingExamples = [
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

const chronicCareQuestionnaire = {
  resourceType: 'Questionnaire',
  id: 'chronic-care-followup',
  url: 'http://example.org/fhir/Questionnaire/chronic-care-followup',
  version: '2.1.0',
  name: 'ChronicCareFollowupQuestionnaire',
  title: 'Chronic Care Follow-up',
  status: 'active',
  subjectType: ['Patient'],
  date: '2026-02-18',
  item: [
    {
      linkId: 'demographics',
      text: 'Demographics',
      type: 'group',
      item: [
        { linkId: 'first-name', text: 'First Name', type: 'string', required: true },
        { linkId: 'dob', text: 'Date of Birth', type: 'date', required: true },
      ],
    },
    {
      linkId: 'conditions',
      text: 'Chronic Conditions',
      type: 'group',
      item: [
        { linkId: 'has-diabetes', text: 'Diabetes diagnosed?', type: 'boolean' },
        { linkId: 'has-hypertension', text: 'Hypertension diagnosed?', type: 'boolean' },
        { linkId: 'has-asthma', text: 'Asthma diagnosed?', type: 'boolean' },
      ],
    },
    {
      linkId: 'diabetes-followup',
      text: 'Diabetes Follow-up',
      type: 'group',
      enableWhen: [{ question: 'has-diabetes', operator: '=', answerBoolean: true }],
      item: [
        { linkId: 'hba1c', text: 'Latest HbA1c (%)', type: 'decimal', required: true },
        { linkId: 'insulin', text: 'On insulin?', type: 'boolean' },
        {
          linkId: 'insulin-dose',
          text: 'Daily insulin dose (units)',
          type: 'decimal',
          enableWhen: [{ question: 'insulin', operator: '=', answerBoolean: true }],
        },
      ],
    },
    {
      linkId: 'medications',
      text: 'Medication Adherence',
      type: 'group',
      item: [
        { linkId: 'med-name', text: 'Primary medication name', type: 'string' },
        { linkId: 'daily-dose', text: 'Daily dose', type: 'decimal' },
        { linkId: 'missed-days', text: 'Missed days in last 14 days', type: 'integer' },
        {
          linkId: 'adherence-score',
          text: 'Adherence score (calculated)',
          type: 'decimal',
          readOnly: true,
          extension: [
            {
              url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression',
              valueExpression: {
                language: 'text/fhirpath',
                expression:
                  "let d := item.where(linkId='medications').item.where(linkId='missed-days').answer.valueInteger.first(); iif(d.exists(), 100 - (d * 7), {})",
              },
            },
          ],
        },
      ],
    },
    {
      linkId: 'symptoms',
      text: 'Symptom Review',
      type: 'group',
      item: [
        {
          linkId: 'breathlessness',
          text: 'Breathlessness severity',
          type: 'choice',
          answerOption: [
            { valueCoding: { code: 'none', display: 'None' } },
            { valueCoding: { code: 'mild', display: 'Mild' } },
            { valueCoding: { code: 'moderate', display: 'Moderate' } },
            { valueCoding: { code: 'severe', display: 'Severe' } },
          ],
        },
        {
          linkId: 'edema',
          text: 'Leg edema present?',
          type: 'boolean',
          enableWhen: [{ question: 'breathlessness', operator: '!=', answerCoding: { code: 'none' } }],
        },
      ],
    },
    {
      linkId: 'care-plan-note',
      text: 'Care plan note',
      type: 'text',
      enableWhen: [{ question: 'adherence-score', operator: '!=', answerDecimal: 100 }],
    },
  ],
}

const chronicCareQuestionnaireResponse = {
  resourceType: 'QuestionnaireResponse',
  id: 'chronic-care-followup-response',
  questionnaire: 'http://example.org/fhir/Questionnaire/chronic-care-followup',
  status: 'completed',
  authored: '2026-02-18T15:00:00Z',
  item: [
    {
      linkId: 'demographics',
      item: [
        { linkId: 'first-name', answer: [{ valueString: 'Nora' }] },
        { linkId: 'dob', answer: [{ valueDate: '1978-11-22' }] },
      ],
    },
    {
      linkId: 'conditions',
      item: [
        { linkId: 'has-diabetes', answer: [{ valueBoolean: true }] },
        { linkId: 'has-hypertension', answer: [{ valueBoolean: true }] },
        { linkId: 'has-asthma', answer: [{ valueBoolean: false }] },
      ],
    },
    {
      linkId: 'diabetes-followup',
      item: [
        { linkId: 'hba1c', answer: [{ valueDecimal: 8.1 }] },
        { linkId: 'insulin', answer: [{ valueBoolean: true }] },
        { linkId: 'insulin-dose', answer: [{ valueDecimal: 26 }] },
      ],
    },
    {
      linkId: 'medications',
      item: [
        { linkId: 'med-name', answer: [{ valueString: 'Metformin' }] },
        { linkId: 'daily-dose', answer: [{ valueDecimal: 1000 }] },
        { linkId: 'missed-days', answer: [{ valueInteger: 3 }] },
        { linkId: 'adherence-score', answer: [{ valueDecimal: 79 }] },
      ],
    },
    {
      linkId: 'symptoms',
      item: [
        {
          linkId: 'breathlessness',
          answer: [{ valueCoding: { code: 'moderate', display: 'Moderate' } }],
        },
        { linkId: 'edema', answer: [{ valueBoolean: true }] },
      ],
    },
    {
      linkId: 'care-plan-note',
      answer: [{ valueString: 'Needs medication counseling and follow-up in 4 weeks.' }],
    },
  ],
}

const chronicCareFhirPathExamples = [
  {
    label: 'List all enabled condition follow-up groups',
    expression: "item.where(linkId='conditions' or linkId='diabetes-followup').linkId",
  },
  {
    label: 'Read calculated adherence score',
    expression:
      "item.where(linkId='medications').item.where(linkId='adherence-score').answer.valueDecimal.first()",
  },
  {
    label: 'Check high-risk glycemic control',
    expression:
      "item.where(linkId='diabetes-followup').item.where(linkId='hba1c').answer.valueDecimal.first() > 7.0",
  },
  {
    label: 'Count boolean true condition flags',
    expression: "item.where(linkId='conditions').item.answer.valueBoolean.where($this=true).count()",
  },
]

const chronicCareExtractionMappingExamples = [
  {
    name: 'HbA1c Observation value',
    fhirPath:
      "item.where(linkId='diabetes-followup').item.where(linkId='hba1c').answer.valueDecimal.first()",
    target: 'Observation(code=4548-4).valueQuantity.value',
  },
  {
    name: 'Medication statement dose',
    fhirPath: "item.where(linkId='medications').item.where(linkId='daily-dose').answer.valueDecimal.first()",
    target: 'MedicationStatement.dosage[0].doseAndRate[0].doseQuantity.value',
  },
  {
    name: 'Adherence risk flag',
    fhirPath:
      "item.where(linkId='medications').item.where(linkId='adherence-score').answer.valueDecimal.first() < 85",
    target: 'CarePlan.addresses(adherence-risk)',
  },
  {
    name: 'Symptom severity code',
    fhirPath: "item.where(linkId='symptoms').item.where(linkId='breathlessness').answer.valueCoding.code.first()",
    target: 'Condition.severity.coding[0].code',
  },
]

const maternalCareQuestionnaire = {
  resourceType: 'Questionnaire',
  id: 'antenatal-visit',
  url: 'http://example.org/fhir/Questionnaire/antenatal-visit',
  version: '1.3.0',
  name: 'AntenatalVisitQuestionnaire',
  title: 'Antenatal Visit Assessment',
  status: 'active',
  subjectType: ['Patient'],
  date: '2026-02-18',
  item: [
    {
      linkId: 'visit',
      text: 'Visit Metadata',
      type: 'group',
      item: [
        { linkId: 'first-name', text: 'Patient first name', type: 'string', required: true },
        { linkId: 'dob', text: 'Date of birth', type: 'date', required: true },
        { linkId: 'gestational-age', text: 'Gestational age (weeks)', type: 'integer', required: true },
      ],
    },
    {
      linkId: 'blood-pressure',
      text: 'Blood Pressure',
      type: 'group',
      item: [
        { linkId: 'systolic', text: 'Systolic mmHg', type: 'integer', required: true },
        { linkId: 'diastolic', text: 'Diastolic mmHg', type: 'integer', required: true },
        {
          linkId: 'bp-risk-score',
          text: 'BP risk score (calculated)',
          type: 'decimal',
          readOnly: true,
          extension: [
            {
              url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression',
              valueExpression: {
                language: 'text/fhirpath',
                expression:
                  "let s := item.where(linkId='blood-pressure').item.where(linkId='systolic').answer.valueInteger.first(); let d := item.where(linkId='blood-pressure').item.where(linkId='diastolic').answer.valueInteger.first(); iif(s.exists() and d.exists(), (s + d) / 2, {})",
              },
            },
          ],
        },
      ],
    },
    {
      linkId: 'warning-signs',
      text: 'Warning Signs',
      type: 'group',
      item: [
        { linkId: 'headache', text: 'Persistent headache?', type: 'boolean' },
        { linkId: 'blurred-vision', text: 'Blurred vision?', type: 'boolean' },
        { linkId: 'swelling', text: 'Severe swelling?', type: 'boolean' },
        {
          linkId: 'urgent-referral',
          text: 'Urgent referral needed (calculated)',
          type: 'boolean',
          readOnly: true,
          extension: [
            {
              url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression',
              valueExpression: {
                language: 'text/fhirpath',
                expression:
                  "item.where(linkId='warning-signs').item.where(linkId='headache' or linkId='blurred-vision' or linkId='swelling').answer.valueBoolean.where($this=true).count() >= 2",
              },
            },
          ],
        },
      ],
    },
    {
      linkId: 'referral-note',
      text: 'Referral note',
      type: 'text',
      enableWhen: [{ question: 'urgent-referral', operator: '=', answerBoolean: true }],
    },
  ],
}

const maternalCareQuestionnaireResponse = {
  resourceType: 'QuestionnaireResponse',
  id: 'antenatal-visit-response',
  questionnaire: 'http://example.org/fhir/Questionnaire/antenatal-visit',
  status: 'completed',
  authored: '2026-02-18T16:30:00Z',
  item: [
    {
      linkId: 'visit',
      item: [
        { linkId: 'first-name', answer: [{ valueString: 'Mira' }] },
        { linkId: 'dob', answer: [{ valueDate: '1996-03-11' }] },
        { linkId: 'gestational-age', answer: [{ valueInteger: 31 }] },
      ],
    },
    {
      linkId: 'blood-pressure',
      item: [
        { linkId: 'systolic', answer: [{ valueInteger: 148 }] },
        { linkId: 'diastolic', answer: [{ valueInteger: 96 }] },
        { linkId: 'bp-risk-score', answer: [{ valueDecimal: 122 }] },
      ],
    },
    {
      linkId: 'warning-signs',
      item: [
        { linkId: 'headache', answer: [{ valueBoolean: true }] },
        { linkId: 'blurred-vision', answer: [{ valueBoolean: true }] },
        { linkId: 'swelling', answer: [{ valueBoolean: false }] },
        { linkId: 'urgent-referral', answer: [{ valueBoolean: true }] },
      ],
    },
    {
      linkId: 'referral-note',
      answer: [{ valueString: 'Possible preeclampsia. Refer to high-risk obstetric clinic today.' }],
    },
  ],
}

const maternalCareFhirPathExamples = [
  {
    label: 'Compute MAP from BP answers',
    expression:
      "let s := item.where(linkId='blood-pressure').item.where(linkId='systolic').answer.valueInteger.first(); let d := item.where(linkId='blood-pressure').item.where(linkId='diastolic').answer.valueInteger.first(); d + ((s - d) / 3)",
  },
  {
    label: 'Check referral trigger from warning signs',
    expression:
      "item.where(linkId='warning-signs').item.where(linkId='urgent-referral').answer.valueBoolean.first()",
  },
  {
    label: 'Find all required visit fields',
    expression: "item.where(linkId='visit').item.where(required=true).linkId",
  },
]

const maternalCareExtractionMappingExamples = [
  {
    name: 'Systolic Observation value',
    fhirPath: "item.where(linkId='blood-pressure').item.where(linkId='systolic').answer.valueInteger.first()",
    target: 'Observation(code=8480-6).valueQuantity.value',
  },
  {
    name: 'Diastolic Observation value',
    fhirPath: "item.where(linkId='blood-pressure').item.where(linkId='diastolic').answer.valueInteger.first()",
    target: 'Observation(code=8462-4).valueQuantity.value',
  },
  {
    name: 'Urgent referral decision',
    fhirPath:
      "item.where(linkId='warning-signs').item.where(linkId='urgent-referral').answer.valueBoolean.first()",
    target: 'ServiceRequest.priority',
  },
  {
    name: 'Referral note text',
    fhirPath: "item.where(linkId='referral-note').answer.valueString.first()",
    target: 'ServiceRequest.note[0].text',
  },
]

export const sampleScenarios = [
  {
    id: 'vitals-intake',
    label: 'Vitals Intake (Baseline)',
    description: 'Basic triage with BMI calculation, smoker-dependent questions, and pain coding.',
    questionnaire: vitalsQuestionnaire,
    questionnaireResponse: vitalsQuestionnaireResponse,
    fhirPathExamples: vitalsFhirPathExamples,
    extractionMappingExamples: vitalsExtractionMappingExamples,
  },
  {
    id: 'chronic-care-followup',
    label: 'Chronic Care Follow-up (Complex)',
    description:
      'Multi-domain chronic disease follow-up with nested conditional sections and adherence calculation.',
    questionnaire: chronicCareQuestionnaire,
    questionnaireResponse: chronicCareQuestionnaireResponse,
    fhirPathExamples: chronicCareFhirPathExamples,
    extractionMappingExamples: chronicCareExtractionMappingExamples,
  },
  {
    id: 'antenatal-visit',
    label: 'Antenatal Visit (Risk Stratification)',
    description:
      'Maternal health assessment with risk scores, warning signs, and conditional referral workflow.',
    questionnaire: maternalCareQuestionnaire,
    questionnaireResponse: maternalCareQuestionnaireResponse,
    fhirPathExamples: maternalCareFhirPathExamples,
    extractionMappingExamples: maternalCareExtractionMappingExamples,
  },
]

export const sampleQuestionnaire = sampleScenarios[0].questionnaire
export const sampleQuestionnaireResponse = sampleScenarios[0].questionnaireResponse
export const fhirPathExamples = sampleScenarios[0].fhirPathExamples
export const extractionMappingExamples = sampleScenarios[0].extractionMappingExamples

export const prepopulationExamples = [
  {
    title: 'Questionnaire item.initial (static default values)',
    description: 'Use Questionnaire.item.initial for form defaults before user input.',
    snippet: `{
  "resourceType": "Questionnaire",
  "status": "active",
  "item": [
    {
      "linkId": "visit-date",
      "text": "Visit date",
      "type": "date",
      "initial": [{ "valueDate": "2026-02-18" }]
    },
    {
      "linkId": "facility",
      "text": "Facility",
      "type": "string",
      "initial": [{ "valueString": "Community Clinic A" }]
    }
  ]
}`,
  },
  {
    title: 'SDC initialExpression (dynamic prepopulation)',
    description:
      'Use SDC extension initialExpression to derive initial values from launch/patient context on the server or form engine.',
    snippet: `{
  "linkId": "patient-age",
  "text": "Patient age",
  "type": "integer",
  "readOnly": true,
  "extension": [
    {
      "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression",
      "valueExpression": {
        "language": "text/fhirpath",
        "expression": "today().year() - %patient.birthDate.toString().substring(0,4).toInteger()"
      }
    }
  ]
}`,
  },
  {
    title: 'Prepopulate from existing QuestionnaireResponse',
    description: 'Common workflow: fetch previous answers and prefill when rendering follow-up forms.',
    snippet: `{
  "resourceType": "QuestionnaireResponse",
  "questionnaire": "http://example.org/fhir/Questionnaire/chronic-care-followup",
  "status": "in-progress",
  "item": [
    {
      "linkId": "demographics",
      "item": [
        { "linkId": "first-name", "answer": [{ "valueString": "Nora" }] },
        { "linkId": "dob", "answer": [{ "valueDate": "1978-11-22" }] }
      ]
    },
    {
      "linkId": "medications",
      "item": [
        { "linkId": "med-name", "answer": [{ "valueString": "Metformin" }] }
      ]
    }
  ]
}`,
  },
]

export const fhirR4FhirPathOperators = [
  { symbol: '.', meaning: 'Navigation (child/property access)' },
  { symbol: '|', meaning: 'Union of collections' },
  { symbol: '=', meaning: 'Equals' },
  { symbol: '!=', meaning: 'Not equals' },
  { symbol: '~', meaning: 'Equivalent' },
  { symbol: '!~', meaning: 'Not equivalent' },
  { symbol: '>', meaning: 'Greater than' },
  { symbol: '<', meaning: 'Less than' },
  { symbol: '>=', meaning: 'Greater than or equal' },
  { symbol: '<=', meaning: 'Less than or equal' },
  { symbol: '+, -, *, /, div, mod', meaning: 'Math operators' },
  { symbol: 'and, or, xor, implies', meaning: 'Boolean/logical operators' },
  { symbol: 'in, contains', meaning: 'Membership / containment' },
  { symbol: 'is, as', meaning: 'Type operators' },
]

export const fhirR4FhirPathFunctionGroups = [
  {
    category: 'Existence & Filtering',
    functions: [
      'where()',
      'select()',
      'repeat()',
      'ofType()',
      'exists()',
      'empty()',
      'all()',
      'anyTrue()',
      'allTrue()',
    ],
  },
  {
    category: 'Collection / Positional',
    functions: [
      'count()',
      'distinct()',
      'isDistinct()',
      'first()',
      'last()',
      'tail()',
      'skip()',
      'take()',
      'intersect()',
      'exclude()',
    ],
  },
  {
    category: 'String',
    functions: [
      'substring()',
      'startsWith()',
      'endsWith()',
      'contains()',
      'replace()',
      'matches()',
      'length()',
      'upper()',
      'lower()',
      'trim()',
    ],
  },
  {
    category: 'Math & Aggregation',
    functions: [
      'abs()',
      'ceiling()',
      'floor()',
      'round()',
      'sqrt()',
      'power()',
      'sum()',
      'min()',
      'max()',
      'avg()',
    ],
  },
  {
    category: 'Date/Time',
    functions: ['now()', 'today()', 'timeOfDay()', 'toDate()', 'toDateTime()', 'toTime()'],
  },
  {
    category: 'Conversion & Utility',
    functions: [
      'toString()',
      'toInteger()',
      'toDecimal()',
      'toBoolean()',
      'iif()',
      'coalesce()',
      'trace()',
      'children()',
      'descendants()',
    ],
  },
]
