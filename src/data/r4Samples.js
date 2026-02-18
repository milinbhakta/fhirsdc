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

export const fhirPathGrammarCheatSheet = [
  {
    title: 'Path Navigation',
    pattern: 'collection.property.subProperty',
    description: 'Traverse elements; each step returns a collection.',
    example: "item.where(linkId='vitals').item.linkId",
  },
  {
    title: 'Filtering',
    pattern: 'collection.where(criteria)',
    description: 'Keep elements where criteria evaluates true.',
    example: "item.where(type='group').linkId",
  },
  {
    title: 'Projection',
    pattern: 'collection.select(expression)',
    description: 'Transform each element to another value/collection.',
    example: 'item.select(linkId)',
  },
  {
    title: 'Variables',
    pattern: 'let var := expression; expressionUsingVar',
    description: 'Bind intermediate values for readable formulas.',
    example:
      "let h := item.where(linkId='height').answer.valueInteger.first(); let w := item.where(linkId='weight').answer.valueInteger.first(); w / ((h/100)*(h/100))",
  },
  {
    title: 'Conditional',
    pattern: 'iif(condition, trueExpr, falseExpr)',
    description: 'Inline conditional expression with fallback.',
    example: "iif(answer.exists(), answer.first(), 'unknown')",
  },
  {
    title: 'Boolean Composition',
    pattern: '(expr1 and expr2) or expr3',
    description: 'Combine logical predicates in criteria.',
    example: "item.where(required=true and type!='group')",
  },
  {
    title: 'Collection Aggregation',
    pattern: 'collection.function()',
    description: 'Aggregate / summarize collection values.',
    example: 'item.answer.valueBoolean.where($this=true).count()',
  },
]

export const fhirPathSyntaxRules = [
  'FHIRPath always works with collections, even when one element is expected.',
  'String literals use single quotes: \"status = \'active\'\".',
  'Use = for equality and != for inequality.',
  'Use first() when exactly one value is needed from a collection.',
  'Use exists() / empty() before arithmetic when values may be missing.',
  'Functions are case-sensitive in many implementations; keep canonical names.',
  'Use parentheses generously to avoid precedence ambiguity.',
  'For coded answers, compare .code when you need code matching logic.',
]

export const sdcExpressionContextCheatSheet = [
  {
    area: 'calculatedExpression',
    context: 'Evaluates in QuestionnaireResponse context for the current form state.',
    notes:
      'Typically used on readOnly calculated items; reference answers via linkId navigation and return value type matching the question type.',
    example:
      "item.where(linkId='vitals').item.where(linkId='weight').answer.valueInteger.first()",
  },
  {
    area: 'initialExpression',
    context: 'Evaluates for initial prepopulation before user edits.',
    notes:
      'Often uses launch context variables (implementation-defined) and/or patient data to seed defaults.',
    example: "%patient.birthDate",
  },
  {
    area: 'enableWhenExpression',
    context: 'Evaluates to boolean controlling visibility/enabling of an item.',
    notes:
      'Prefer explicit true/false output and guard nulls with exists()/empty() checks.',
    example:
      "item.where(linkId='warning-signs').item.where(linkId='headache').answer.valueBoolean.first() = true",
  },
  {
    area: 'launchContext',
    context: 'Named variables supplied by the app/server at launch time.',
    notes:
      'Common names include %patient, %encounter, %user (profile dependent); availability depends on implementation.',
    example: "%patient.name.given.first()",
  },
  {
    area: '%resource and current focus',
    context: 'Current evaluation node is typically the active item/response scope.',
    notes:
      'Use %resource for full root resource access when local scope is not enough.',
    example: "%resource.item.where(linkId='demographics').item.where(linkId='dob')",
  },
]

// ────────────────────────────────────────────────
// RENDERING EXTENSIONS CATALOG
// ────────────────────────────────────────────────

export const renderingExtensionsCatalog = [
  {
    name: 'questionnaire-itemControl',
    url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl',
    purpose: 'Specifies the UI widget to render for an item.',
    appliesTo: 'Any item type',
    valueType: 'CodeableConcept',
    codes: ['drop-down', 'radio-button', 'check-box', 'autocomplete', 'slider', 'text-box', 'calendar', 'gtable', 'table', 'htable', 'page', 'tab-container', 'collapsible', 'flyover', 'help'],
    snippet: `{
  "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl",
  "valueCodeableConcept": {
    "coding": [{
      "system": "http://hl7.org/fhir/questionnaire-item-control",
      "code": "radio-button"
    }]
  }
}`,
  },
  {
    name: 'rendering-style',
    url: 'http://hl7.org/fhir/StructureDefinition/rendering-style',
    purpose: 'Inline CSS applied to the item text/label.',
    appliesTo: 'text, prefix, or label elements',
    valueType: 'string',
    codes: [],
    snippet: `{
  "url": "http://hl7.org/fhir/StructureDefinition/rendering-style",
  "valueString": "color: #dc2626; font-weight: bold;"
}`,
  },
  {
    name: 'rendering-xhtml',
    url: 'http://hl7.org/fhir/StructureDefinition/rendering-xhtml',
    purpose: 'Rich XHTML content for item text instead of plain text.',
    appliesTo: 'text elements',
    valueType: 'string (XHTML)',
    codes: [],
    snippet: `{
  "url": "http://hl7.org/fhir/StructureDefinition/rendering-xhtml",
  "valueString": "<b>Important:</b> Please read <a href='http://example.org'>these instructions</a>."
}`,
  },
  {
    name: 'entryFormat',
    url: 'http://hl7.org/fhir/StructureDefinition/entryFormat',
    purpose: 'Placeholder text / input mask for empty fields.',
    appliesTo: 'string, integer, decimal, date items',
    valueType: 'string',
    codes: [],
    snippet: `{
  "url": "http://hl7.org/fhir/StructureDefinition/entryFormat",
  "valueString": "DD/MM/YYYY"
}`,
  },
  {
    name: 'questionnaire-hidden',
    url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-hidden',
    purpose: 'Hides an item visually but keeps it in the data model.',
    appliesTo: 'Any item',
    valueType: 'boolean',
    codes: [],
    snippet: `{
  "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden",
  "valueBoolean": true
}`,
  },
  {
    name: 'questionnaire-choiceOrientation',
    url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-choiceOrientation',
    purpose: 'Layout direction for choice items (horizontal/vertical).',
    appliesTo: 'choice, open-choice items',
    valueType: 'code',
    codes: ['horizontal', 'vertical'],
    snippet: `{
  "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-choiceOrientation",
  "valueCode": "horizontal"
}`,
  },
  {
    name: 'questionnaire-sliderStepValue',
    url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue',
    purpose: 'Step increment for slider controls.',
    appliesTo: 'integer, decimal items with slider itemControl',
    valueType: 'integer',
    codes: [],
    snippet: `{
  "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue",
  "valueInteger": 5
}`,
  },
  {
    name: 'shortText',
    url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-shortText',
    purpose: 'Abbreviated label for compact screen display.',
    appliesTo: 'Any item',
    valueType: 'string',
    codes: [],
    snippet: `{
  "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-shortText",
  "valueString": "DOB"
}`,
  },
  {
    name: 'collapsible',
    url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-collapsible',
    purpose: 'Makes a group collapsible (default-open or default-closed).',
    appliesTo: 'group items',
    valueType: 'code',
    codes: ['default-open', 'default-closed'],
    snippet: `{
  "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-collapsible",
  "valueCode": "default-closed"
}`,
  },
  {
    name: 'displayCategory',
    url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-displayCategory',
    purpose: 'Categorizes display items (instructions, security notice).',
    appliesTo: 'display items',
    valueType: 'CodeableConcept',
    codes: ['instructions', 'security'],
    snippet: `{
  "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-displayCategory",
  "valueCodeableConcept": {
    "coding": [{ "system": "http://hl7.org/fhir/questionnaire-display-category", "code": "instructions" }]
  }
}`,
  },
]

// ────────────────────────────────────────────────
// BEHAVIOR EXTENSIONS & DEMOS
// ────────────────────────────────────────────────

export const behaviorExamples = [
  {
    title: 'enableWhen with enableBehavior "any"',
    description: 'Show referral note if ANY warning sign is positive (OR logic).',
    snippet: `{
  "linkId": "referral-note",
  "text": "Referral note",
  "type": "text",
  "enableBehavior": "any",
  "enableWhen": [
    { "question": "headache", "operator": "=", "answerBoolean": true },
    { "question": "blurred-vision", "operator": "=", "answerBoolean": true },
    { "question": "swelling", "operator": "=", "answerBoolean": true }
  ]
}`,
  },
  {
    title: 'enableWhenExpression (FHIRPath)',
    description: 'Show warning when BMI is in the obese range using a FHIRPath expression.',
    snippet: `{
  "linkId": "bmi-warning",
  "text": "⚠️ BMI indicates obesity. Consider lifestyle counseling.",
  "type": "display",
  "extension": [{
    "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-enableWhenExpression",
    "valueExpression": {
      "language": "text/fhirpath",
      "expression": "%resource.item.where(linkId='bmi').answer.valueDecimal.first() >= 30"
    }
  }]
}`,
  },
  {
    title: 'Value Constraints (minValue / maxValue)',
    description: 'Restrict a numeric field to a valid range.',
    snippet: `{
  "linkId": "heart-rate",
  "text": "Heart rate (bpm)",
  "type": "integer",
  "extension": [
    {
      "url": "http://hl7.org/fhir/StructureDefinition/minValue",
      "valueInteger": 30
    },
    {
      "url": "http://hl7.org/fhir/StructureDefinition/maxValue",
      "valueInteger": 250
    }
  ]
}`,
  },
  {
    title: 'Regex Constraint',
    description: 'Validate that a field matches a phone number pattern.',
    snippet: `{
  "linkId": "phone",
  "text": "Phone number",
  "type": "string",
  "extension": [{
    "url": "http://hl7.org/fhir/StructureDefinition/regex",
    "valueString": "^[+]?[0-9\\\\s\\\\-()]{7,15}$"
  }],
  "maxLength": 20
}`,
  },
  {
    title: 'itemWeight Scoring (PHQ-2 style)',
    description: 'Assign numeric weights to answer options for standardized scoring.',
    snippet: `{
  "linkId": "interest-pleasure",
  "text": "Little interest or pleasure in doing things?",
  "type": "choice",
  "answerOption": [
    {
      "valueCoding": { "code": "not-at-all", "display": "Not at all" },
      "extension": [{ "url": "http://hl7.org/fhir/StructureDefinition/ordinalValue", "valueDecimal": 0 }]
    },
    {
      "valueCoding": { "code": "several-days", "display": "Several days" },
      "extension": [{ "url": "http://hl7.org/fhir/StructureDefinition/ordinalValue", "valueDecimal": 1 }]
    },
    {
      "valueCoding": { "code": "more-than-half", "display": "More than half the days" },
      "extension": [{ "url": "http://hl7.org/fhir/StructureDefinition/ordinalValue", "valueDecimal": 2 }]
    },
    {
      "valueCoding": { "code": "nearly-every-day", "display": "Nearly every day" },
      "extension": [{ "url": "http://hl7.org/fhir/StructureDefinition/ordinalValue", "valueDecimal": 3 }]
    }
  ]
}`,
  },
  {
    title: 'Custom Validation (constraint) with Error Message',
    description: 'Use the constraint extension to define a FHIRPath rule and a human-readable error message.',
    snippet: `{
  "linkId": "dob",
  "text": "Date of Birth",
  "type": "date",
  "required": true,
  "extension": [{
    "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-constraint",
    "extension": [
      { "url": "key", "valueId": "dob-not-future" },
      { "url": "severity", "valueCode": "error" },
      { "url": "human", "valueString": "Date of birth cannot be in the future." },
      {
        "url": "expression",
        "valueString": "$this.value <= today()"
      }
    ]
  }]
}`,
  },
  {
    title: 'Custom Validation with Warning Severity',
    description: 'A soft validation that warns the user but does not block form submission.',
    snippet: `{
  "linkId": "weight",
  "text": "Body weight (kg)",
  "type": "decimal",
  "extension": [{
    "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-constraint",
    "extension": [
      { "url": "key", "valueId": "weight-range-warn" },
      { "url": "severity", "valueCode": "warning" },
      {
        "url": "human",
        "valueString": "Weight seems unusual. Please verify: expected 2-300 kg."
      },
      {
        "url": "expression",
        "valueString": "$this.value >= 2 and $this.value <= 300"
      }
    ]
  }]
}`,
  },
  {
    title: 'Cross-Item Validation (targetConstraint)',
    description: 'Validate a relationship between two items — diastolic BP must be less than systolic.',
    snippet: `{
  "linkId": "bp-group",
  "text": "Blood Pressure",
  "type": "group",
  "extension": [{
    "url": "http://hl7.org/fhir/StructureDefinition/targetConstraint",
    "extension": [
      { "url": "key", "valueId": "bp-diastolic-lt-systolic" },
      { "url": "severity", "valueCode": "error" },
      {
        "url": "human",
        "valueString": "Diastolic pressure must be less than systolic pressure."
      },
      {
        "url": "expression",
        "valueString": "%resource.item.where(linkId='diastolic').answer.valueInteger < %resource.item.where(linkId='systolic').answer.valueInteger"
      }
    ]
  }],
  "item": [
    { "linkId": "systolic", "text": "Systolic (mmHg)", "type": "integer" },
    { "linkId": "diastolic", "text": "Diastolic (mmHg)", "type": "integer" }
  ]
}`,
  },
  {
    title: 'Multiple Constraints on One Item',
    description: 'Stack multiple constraint extensions for layered validation with different messages.',
    snippet: `{
  "linkId": "email",
  "text": "Email address",
  "type": "string",
  "maxLength": 254,
  "extension": [
    {
      "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-constraint",
      "extension": [
        { "url": "key", "valueId": "email-format" },
        { "url": "severity", "valueCode": "error" },
        { "url": "human", "valueString": "Please enter a valid email address (e.g., user@example.com)." },
        { "url": "expression", "valueString": "$this.value.matches('^[^@\\\\s]+@[^@\\\\s]+\\\\.[^@\\\\s]+$')" }
      ]
    },
    {
      "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-constraint",
      "extension": [
        { "url": "key", "valueId": "email-org-domain" },
        { "url": "severity", "valueCode": "warning" },
        { "url": "human", "valueString": "Consider using your organization email (@hospital.org)." },
        { "url": "expression", "valueString": "$this.value.endsWith('@hospital.org')" }
      ]
    }
  ]
}`,
  },
  {
    title: 'Constraint Guarding Empty Fields',
    description: 'Use exists() to avoid false errors when the field is optional and empty.',
    snippet: `{
  "linkId": "age",
  "text": "Patient age",
  "type": "integer",
  "extension": [{
    "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-constraint",
    "extension": [
      { "url": "key", "valueId": "age-valid-range" },
      { "url": "severity", "valueCode": "error" },
      {
        "url": "human",
        "valueString": "Age must be between 0 and 150."
      },
      {
        "url": "expression",
        "valueString": "$this.value.empty() or ($this.value >= 0 and $this.value <= 150)"
      }
    ]
  }]
}`,
  },
  {
    title: 'answerValueSet Reference',
    description: 'Use a ValueSet for answer options instead of inline answerOption.',
    snippet: `{
  "linkId": "condition-code",
  "text": "Primary condition",
  "type": "choice",
  "answerValueSet": "http://hl7.org/fhir/ValueSet/condition-code"
}`,
  },
  {
    title: 'Variable + CalculatedExpression',
    description: 'Define a reusable variable and use it in a calculation.',
    snippet: `{
  "linkId": "scoring-group",
  "text": "Scoring",
  "type": "group",
  "extension": [{
    "url": "http://hl7.org/fhir/StructureDefinition/variable",
    "valueExpression": {
      "name": "totalScore",
      "language": "text/fhirpath",
      "expression": "%resource.item.where(linkId='q1' or linkId='q2').answer.value.aggregate($this + $total, 0)"
    }
  }],
  "item": [{
    "linkId": "total",
    "text": "Total Score",
    "type": "integer",
    "readOnly": true,
    "extension": [{
      "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression",
      "valueExpression": {
        "language": "text/fhirpath",
        "expression": "%totalScore"
      }
    }]
  }]
}`,
  },
]

// ────────────────────────────────────────────────
// POPULATION EXAMPLES
// ────────────────────────────────────────────────

export const populationMethodExamples = [
  {
    title: 'Observation-Based Population',
    method: 'observation',
    description: 'Tag items with observation codes; the server queries for recent Observations and prefills.',
    snippet: `{
  "linkId": "weight",
  "text": "Body weight (kg)",
  "type": "decimal",
  "code": [{ "system": "http://loinc.org", "code": "29463-7", "display": "Body weight" }],
  "extension": [{
    "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationLinkPeriod",
    "valueDuration": { "value": 1, "unit": "year", "system": "http://unitsofmeasure.org", "code": "a" }
  }]
}`,
  },
  {
    title: 'Expression-Based: launchContext',
    method: 'expression',
    description: 'Declare named launch context variables that the form filler must supply.',
    snippet: `{
  "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext",
  "extension": [
    { "url": "name", "valueCoding": { "system": "http://hl7.org/fhir/uv/sdc/CodeSystem/launchContext", "code": "patient" } },
    { "url": "type", "valueCode": "Patient" },
    { "url": "description", "valueString": "The patient who is the subject of the form" }
  ]
}`,
  },
  {
    title: 'Expression-Based: initialExpression',
    method: 'expression',
    description: 'Compute initial answer from launch context at form open.',
    snippet: `{
  "linkId": "patient-name",
  "text": "Patient name",
  "type": "string",
  "readOnly": true,
  "extension": [{
    "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression",
    "valueExpression": {
      "language": "text/fhirpath",
      "expression": "%patient.name.where(use='official').given.first() + ' ' + %patient.name.where(use='official').family"
    }
  }]
}`,
  },
  {
    title: 'StructureMap-Based Population',
    method: 'structuremap',
    description: 'Reference a StructureMap that transforms source resources into a QuestionnaireResponse.',
    snippet: `{
  "resourceType": "Questionnaire",
  "extension": [{
    "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-sourceStructureMap",
    "valueCanonical": "http://example.org/fhir/StructureMap/patient-to-demographics-form"
  }],
  "status": "active",
  "item": [
    { "linkId": "name", "text": "Name", "type": "string" },
    { "linkId": "dob", "text": "Date of Birth", "type": "date" }
  ]
}`,
  },
  {
    title: '$populate Operation Call',
    method: 'operation',
    description: 'How to invoke the $populate operation on a FHIR server.',
    snippet: `POST [base]/Questionnaire/$populate
Content-Type: application/fhir+json

{
  "resourceType": "Parameters",
  "parameter": [
    {
      "name": "questionnaire",
      "valueCanonical": "http://example.org/fhir/Questionnaire/antenatal-visit"
    },
    {
      "name": "subject",
      "valueReference": { "reference": "Patient/123" }
    },
    {
      "name": "context",
      "part": [
        { "name": "name", "valueString": "encounter" },
        { "name": "content", "valueReference": { "reference": "Encounter/456" } }
      ]
    }
  ]
}`,
  },
]

// ────────────────────────────────────────────────
// EXTRACTION METHOD EXAMPLES
// ────────────────────────────────────────────────

export const extractionMethodExamples = [
  {
    title: 'Observation-Based Extraction',
    method: 'observation',
    description: 'Tag items with observationExtract; each answer becomes an Observation.',
    snippet: `{
  "linkId": "systolic",
  "text": "Systolic BP (mmHg)",
  "type": "integer",
  "code": [{ "system": "http://loinc.org", "code": "8480-6", "display": "Systolic blood pressure" }],
  "extension": [{
    "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract",
    "valueBoolean": true
  }]
}`,
  },
  {
    title: 'Definition-Based Extraction',
    method: 'definition',
    description: 'Map items to StructureDefinition elements using the definition property.',
    snippet: `{
  "linkId": "patient-info",
  "text": "Patient Information",
  "type": "group",
  "definition": "http://hl7.org/fhir/StructureDefinition/Patient",
  "item": [
    {
      "linkId": "given-name",
      "text": "First Name",
      "type": "string",
      "definition": "http://hl7.org/fhir/StructureDefinition/Patient#Patient.name.given"
    },
    {
      "linkId": "family-name",
      "text": "Last Name",
      "type": "string",
      "definition": "http://hl7.org/fhir/StructureDefinition/Patient#Patient.name.family"
    },
    {
      "linkId": "birth-date",
      "text": "Date of Birth",
      "type": "date",
      "definition": "http://hl7.org/fhir/StructureDefinition/Patient#Patient.birthDate"
    }
  ]
}`,
  },
  {
    title: 'StructureMap-Based Extraction',
    method: 'structuremap',
    description: 'Reference a StructureMap that transforms QuestionnaireResponse into target resources.',
    snippet: `{
  "resourceType": "Questionnaire",
  "extension": [{
    "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-targetStructureMap",
    "valueCanonical": "http://example.org/fhir/StructureMap/response-to-bundle"
  }],
  "status": "active",
  "item": [
    { "linkId": "diagnosis", "text": "Primary diagnosis", "type": "choice" }
  ]
}`,
  },
  {
    title: 'Template-Based Extraction',
    method: 'template',
    description: 'Define extraction templates with FHIRPath placeholders in contained resources.',
    snippet: `{
  "resourceType": "Questionnaire",
  "contained": [{
    "resourceType": "Bundle",
    "id": "extraction-template",
    "type": "transaction",
    "entry": [{
      "resource": {
        "resourceType": "Observation",
        "status": "final",
        "code": { "coding": [{ "system": "http://loinc.org", "code": "8302-2" }] },
        "valueQuantity": {
          "_value": {
            "extension": [{
              "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtractValue",
              "valueExpression": {
                "language": "text/fhirpath",
                "expression": "%resource.item.where(linkId='height').answer.value"
              }
            }]
          }
        }
      },
      "request": { "method": "POST", "url": "Observation" }
    }]
  }],
  "extension": [{
    "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-templateExtract",
    "valueReference": { "reference": "#extraction-template" }
  }]
}`,
  },
  {
    title: '$extract Operation Call',
    method: 'operation',
    description: 'How to invoke the $extract operation on a FHIR server.',
    snippet: `POST [base]/QuestionnaireResponse/$extract
Content-Type: application/fhir+json

{
  "resourceType": "Parameters",
  "parameter": [
    {
      "name": "questionnaire-response",
      "resource": {
        "resourceType": "QuestionnaireResponse",
        "questionnaire": "http://example.org/fhir/Questionnaire/vitals-intake",
        "status": "completed",
        "item": [...]
      }
    }
  ]
}`,
  },
]

// ────────────────────────────────────────────────
// MODULAR FORMS EXAMPLES
// ────────────────────────────────────────────────

export const modularFormsExamples = [
  {
    title: 'Sub-Questionnaire Reference',
    description: 'A display item that references a reusable sub-questionnaire via extension.',
    snippet: `{
  "linkId": "demographics-placeholder",
  "text": "Demographics Sub-form",
  "type": "display",
  "extension": [{
    "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-subQuestionnaire",
    "valueCanonical": "http://example.org/fhir/Questionnaire/demographics-module|1.0"
  }]
}`,
  },
  {
    title: 'Modular Root Questionnaire',
    description: 'A parent form that assembles multiple sub-questionnaires.',
    snippet: `{
  "resourceType": "Questionnaire",
  "url": "http://example.org/fhir/Questionnaire/annual-physical",
  "status": "active",
  "title": "Annual Physical Exam",
  "extension": [{
    "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-assemble-expectation",
    "valueCode": "assemble-root"
  }],
  "item": [
    {
      "linkId": "demo-ref",
      "text": "Demographics",
      "type": "display",
      "extension": [{
        "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-subQuestionnaire",
        "valueCanonical": "http://example.org/fhir/Questionnaire/demographics-module|1.0"
      }]
    },
    {
      "linkId": "vitals-ref",
      "text": "Vital Signs",
      "type": "display",
      "extension": [{
        "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-subQuestionnaire",
        "valueCanonical": "http://example.org/fhir/Questionnaire/vitals-module|2.1"
      }]
    },
    {
      "linkId": "local-review",
      "text": "Review of Systems",
      "type": "group",
      "item": [
        { "linkId": "ros-cardio", "text": "Chest pain or palpitations?", "type": "boolean" },
        { "linkId": "ros-respiratory", "text": "Shortness of breath?", "type": "boolean" }
      ]
    }
  ]
}`,
  },
  {
    title: 'Reusable Sub-Questionnaire Module',
    description: 'A standalone demographics module that can be included by any parent form.',
    snippet: `{
  "resourceType": "Questionnaire",
  "url": "http://example.org/fhir/Questionnaire/demographics-module",
  "version": "1.0",
  "status": "active",
  "title": "Demographics Module",
  "extension": [{
    "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-assemble-expectation",
    "valueCode": "assemble-child"
  }],
  "item": [
    { "linkId": "first-name", "text": "First name", "type": "string", "required": true },
    { "linkId": "last-name", "text": "Last name", "type": "string", "required": true },
    { "linkId": "dob", "text": "Date of birth", "type": "date", "required": true },
    { "linkId": "gender", "text": "Gender", "type": "choice",
      "answerOption": [
        { "valueCoding": { "code": "male", "display": "Male" } },
        { "valueCoding": { "code": "female", "display": "Female" } },
        { "valueCoding": { "code": "other", "display": "Other" } }
      ]
    }
  ]
}`,
  },
  {
    title: '$assemble Operation Call',
    description: 'Invoke the $assemble operation to get a fully expanded Questionnaire.',
    snippet: `POST [base]/Questionnaire/$assemble
Content-Type: application/fhir+json

{
  "resourceType": "Parameters",
  "parameter": [{
    "name": "questionnaire",
    "resource": {
      "resourceType": "Questionnaire",
      "url": "http://example.org/fhir/Questionnaire/annual-physical",
      "status": "active",
      "item": [
        {
          "linkId": "demo-ref",
          "type": "display",
          "extension": [{
            "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-subQuestionnaire",
            "valueCanonical": "http://example.org/fhir/Questionnaire/demographics-module|1.0"
          }]
        }
      ]
    }
  }]
}`,
  },
]

// ────────────────────────────────────────────────
// ADAPTIVE FORMS EXAMPLES
// ────────────────────────────────────────────────

export const adaptiveFormsExamples = [
  {
    title: 'Adaptive Questionnaire Shell',
    description: 'A Questionnaire marked as adaptive — items are served via $next-question.',
    snippet: `{
  "resourceType": "Questionnaire",
  "url": "http://example.org/fhir/Questionnaire/phq-cat",
  "status": "active",
  "title": "PHQ Depression Screen (Adaptive)",
  "extension": [{
    "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-questionnaireAdaptive",
    "valueUrl": "http://example.org/fhir/adaptive-engine"
  }]
}`,
  },
  {
    title: '$next-question — Step 1 (Initial Call)',
    description: 'First call sends an empty QuestionnaireResponse to get the first question.',
    snippet: `POST [base]/Questionnaire/$next-question
Content-Type: application/fhir+json

{
  "resourceType": "Parameters",
  "parameter": [{
    "name": "questionnaire-response",
    "resource": {
      "resourceType": "QuestionnaireResponse",
      "questionnaire": "http://example.org/fhir/Questionnaire/phq-cat",
      "status": "in-progress",
      "item": []
    }
  }]
}`,
  },
  {
    title: '$next-question — Server Returns Question',
    description: 'Server responds with a QuestionnaireResponse containing the next unanswered question.',
    snippet: `{
  "resourceType": "QuestionnaireResponse",
  "questionnaire": "http://example.org/fhir/Questionnaire/phq-cat",
  "status": "in-progress",
  "item": [
    {
      "linkId": "phq-1",
      "text": "Little interest or pleasure in doing things?",
      "answer": []
    }
  ]
}`,
  },
  {
    title: '$next-question — Step 2 (With Answer)',
    description: 'Subsequent call includes the answered question; server returns the next.',
    snippet: `POST [base]/Questionnaire/$next-question

{
  "resourceType": "Parameters",
  "parameter": [{
    "name": "questionnaire-response",
    "resource": {
      "resourceType": "QuestionnaireResponse",
      "questionnaire": "http://example.org/fhir/Questionnaire/phq-cat",
      "status": "in-progress",
      "item": [
        {
          "linkId": "phq-1",
          "text": "Little interest or pleasure in doing things?",
          "answer": [{ "valueCoding": { "code": "several-days", "display": "Several days" } }]
        },
        {
          "linkId": "phq-2",
          "text": "Feeling down, depressed, or hopeless?",
          "answer": []
        }
      ]
    }
  }]
}`,
  },
  {
    title: '$next-question — Completed',
    description: 'When no more questions are needed, server returns status "completed" with final score.',
    snippet: `{
  "resourceType": "QuestionnaireResponse",
  "questionnaire": "http://example.org/fhir/Questionnaire/phq-cat",
  "status": "completed",
  "item": [
    { "linkId": "phq-1", "answer": [{ "valueCoding": { "code": "several-days" } }] },
    { "linkId": "phq-2", "answer": [{ "valueCoding": { "code": "not-at-all" } }] },
    { "linkId": "phq-3", "answer": [{ "valueCoding": { "code": "nearly-every-day" } }] },
    {
      "linkId": "total-score",
      "text": "Total Score",
      "answer": [{ "valueInteger": 4 }]
    }
  ]
}`,
  },
]

// ────────────────────────────────────────────────
// WORKFLOW / CONFORMANCE DATA
// ────────────────────────────────────────────────

export const workflowRoles = [
  {
    role: 'Form Designer',
    description: 'Creates, edits, tests, and publishes Questionnaire definitions. Adds rendering, behavior, population, and extraction extensions.',
    operations: ['Create/Update Questionnaire', 'Validate', 'Publish'],
    icon: '✏️',
  },
  {
    role: 'Form Filler',
    description: 'Renders questionnaires for end users, supports population, handles enableWhen/calculations, and produces QuestionnaireResponse.',
    operations: ['$populate', 'Render', 'Validate response', 'Submit'],
    icon: '📝',
  },
  {
    role: 'Form Manager',
    description: 'Stores, versions, and serves Questionnaire resources. Supports search by URL, status, context, publisher.',
    operations: ['CRUD', 'Search', '$assemble', 'Version management'],
    icon: '📂',
  },
  {
    role: 'Form Receiver',
    description: 'Accepts completed QuestionnaireResponse submissions. May trigger $extract to create clinical resources.',
    operations: ['Accept QR', '$extract', 'Validate', 'Store'],
    icon: '📥',
  },
  {
    role: 'Form Archiver',
    description: 'Stores QuestionnaireResponses for long-term retention, audit, and retrieval.',
    operations: ['Store', 'Search', 'Retrieve', 'Audit log'],
    icon: '🗄️',
  },
]

export const conformanceProfiles = [
  { profile: 'SDC Base Questionnaire', url: 'sdc-questionnaire', description: 'Minimal SDC metadata and item extensions.' },
  { profile: 'SDC Advanced Rendering', url: 'sdc-questionnaire-render', description: 'Full rendering extensions: itemControl, rendering-style, etc.' },
  { profile: 'SDC Behavior', url: 'sdc-questionnaire-behave', description: 'enableWhen, calculations, constraints, scoring.' },
  { profile: 'SDC Population', url: 'sdc-questionnaire-pop-exp', description: 'launchContext, initialExpression, observationLinkPeriod.' },
  { profile: 'SDC Extraction (Observation)', url: 'sdc-questionnaire-extr-obsn', description: 'observationExtract for simple vital signs extraction.' },
  { profile: 'SDC Extraction (Definition)', url: 'sdc-questionnaire-extr-defn', description: 'Definition-based extraction to any resource type.' },
  { profile: 'SDC Extraction (StructureMap)', url: 'sdc-questionnaire-extr-smap', description: 'StructureMap-based extraction.' },
  { profile: 'SDC Extraction (Template)', url: 'sdc-questionnaire-extr-template', description: 'Template-based extraction with FHIRPath placeholders.' },
  { profile: 'SDC Modular', url: 'sdc-questionnaire-modular', description: 'subQuestionnaire and $assemble support.' },
  { profile: 'SDC Adaptive', url: 'sdc-questionnaire-adapt', description: 'questionnaireAdaptive and $next-question.' },
]

export const questionnaireSearchParams = [
  { param: 'url', type: 'uri', description: 'Canonical URL of the Questionnaire.' },
  { param: 'version', type: 'token', description: 'Business version.' },
  { param: 'name', type: 'string', description: 'Computer-friendly name.' },
  { param: 'title', type: 'string', description: 'Human-readable title.' },
  { param: 'status', type: 'token', description: 'draft | active | retired | unknown.' },
  { param: 'publisher', type: 'string', description: 'Publishing organization.' },
  { param: 'context', type: 'token', description: 'useContext value.' },
  { param: 'context-type', type: 'token', description: 'Type of useContext.' },
  { param: 'date', type: 'date', description: 'Publication date.' },
  { param: 'description', type: 'string', description: 'Questionnaire description text.' },
  { param: 'jurisdiction', type: 'token', description: 'Geographic jurisdiction.' },
  { param: 'identifier', type: 'token', description: 'Business identifier.' },
]
