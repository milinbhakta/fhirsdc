// ══════════════════════════════════════════════════════════════════════
// Scenario 1 — Patient Registration
// ══════════════════════════════════════════════════════════════════════

const patientRegQuestionnaire = {
  resourceType: 'Questionnaire',
  id: 'patient-registration',
  url: 'http://example.org/fhir/Questionnaire/patient-registration',
  version: '1.0.0',
  name: 'PatientRegistrationQuestionnaire',
  title: 'Patient Registration',
  status: 'active',
  subjectType: ['Patient'],
  date: '2026-02-18',
  item: [
    {
      linkId: 'personal',
      text: 'Personal Information',
      type: 'group',
      item: [
        { linkId: 'family-name', text: 'Family Name', type: 'string', required: true },
        { linkId: 'given-name', text: 'Given Name', type: 'string', required: true },
        { linkId: 'dob', text: 'Date of Birth', type: 'date', required: true },
        {
          linkId: 'gender',
          text: 'Gender',
          type: 'choice',
          required: true,
          answerValueSet: 'http://hl7.org/fhir/ValueSet/administrative-gender',
        },
        {
          linkId: 'marital-status',
          text: 'Marital Status',
          type: 'choice',
          answerValueSet: 'http://hl7.org/fhir/ValueSet/marital-status',
        },
      ],
    },
    {
      linkId: 'contact',
      text: 'Contact Details',
      type: 'group',
      item: [
        { linkId: 'phone', text: 'Phone Number', type: 'string', required: true },
        { linkId: 'email', text: 'Email', type: 'string' },
        { linkId: 'address-line', text: 'Street Address', type: 'string' },
        { linkId: 'city', text: 'City', type: 'string' },
        { linkId: 'state', text: 'State / Province', type: 'string' },
        { linkId: 'postal-code', text: 'Postal Code', type: 'string' },
      ],
    },
    {
      linkId: 'emergency',
      text: 'Emergency Contact',
      type: 'group',
      item: [
        { linkId: 'ec-name', text: 'Contact Name', type: 'string', required: true },
        {
          linkId: 'ec-relationship',
          text: 'Relationship',
          type: 'choice',
          answerOption: [
            { valueCoding: { code: 'spouse', display: 'Spouse' } },
            { valueCoding: { code: 'parent', display: 'Parent' } },
            { valueCoding: { code: 'sibling', display: 'Sibling' } },
            { valueCoding: { code: 'friend', display: 'Friend' } },
            { valueCoding: { code: 'other', display: 'Other' } },
          ],
        },
        { linkId: 'ec-phone', text: 'Contact Phone', type: 'string', required: true },
      ],
    },
    {
      linkId: 'insurance',
      text: 'Insurance',
      type: 'group',
      item: [
        { linkId: 'has-insurance', text: 'Has insurance coverage?', type: 'boolean' },
        {
          linkId: 'insurance-provider',
          text: 'Insurance Provider',
          type: 'string',
          enableWhen: [{ question: 'has-insurance', operator: '=', answerBoolean: true }],
        },
        {
          linkId: 'member-id',
          text: 'Member ID',
          type: 'string',
          enableWhen: [{ question: 'has-insurance', operator: '=', answerBoolean: true }],
        },
      ],
    },
  ],
}

const patientRegQuestionnaireResponse = {
  resourceType: 'QuestionnaireResponse',
  id: 'patient-registration-response',
  questionnaire: 'http://example.org/fhir/Questionnaire/patient-registration',
  status: 'completed',
  authored: '2026-02-18T09:00:00Z',
  item: [
    {
      linkId: 'personal',
      item: [
        { linkId: 'family-name', answer: [{ valueString: 'Sharma' }] },
        { linkId: 'given-name', answer: [{ valueString: 'Aarav' }] },
        { linkId: 'dob', answer: [{ valueDate: '1990-07-03' }] },
        { linkId: 'gender', answer: [{ valueCoding: { system: 'http://hl7.org/fhir/administrative-gender', code: 'male', display: 'Male' } }] },
      ],
    },
    {
      linkId: 'contact',
      item: [
        { linkId: 'phone', answer: [{ valueString: '+1-555-0199' }] },
        { linkId: 'email', answer: [{ valueString: 'aarav.sharma@email.com' }] },
        { linkId: 'city', answer: [{ valueString: 'Austin' }] },
        { linkId: 'state', answer: [{ valueString: 'TX' }] },
        { linkId: 'postal-code', answer: [{ valueString: '73301' }] },
      ],
    },
    {
      linkId: 'emergency',
      item: [
        { linkId: 'ec-name', answer: [{ valueString: 'Priya Sharma' }] },
        { linkId: 'ec-relationship', answer: [{ valueCoding: { code: 'spouse', display: 'Spouse' } }] },
        { linkId: 'ec-phone', answer: [{ valueString: '+1-555-0200' }] },
      ],
    },
    {
      linkId: 'insurance',
      item: [
        { linkId: 'has-insurance', answer: [{ valueBoolean: true }] },
        { linkId: 'insurance-provider', answer: [{ valueString: 'Blue Cross Blue Shield' }] },
        { linkId: 'member-id', answer: [{ valueString: 'BCBS-88234' }] },
      ],
    },
  ],
}

const patientRegFhirPathExamples = [
  { label: 'Get patient full name', expression: "item.where(linkId='personal').item.where(linkId='given-name').answer.valueString.first() + ' ' + item.where(linkId='personal').item.where(linkId='family-name').answer.valueString.first()" },
  { label: 'Get all required field linkIds', expression: 'item.descendants().where(required=true).linkId' },
  { label: 'Check if patient has insurance', expression: "item.where(linkId='insurance').item.where(linkId='has-insurance').answer.valueBoolean.first()" },
  { label: 'Get phone number', expression: "item.where(linkId='contact').item.where(linkId='phone').answer.valueString.first()" },
  { label: 'Get gender code', expression: "item.where(linkId='personal').item.where(linkId='gender').answer.valueCoding.code.first()" },
  { label: 'Count answered questions', expression: 'item.descendants().answer.count()' },
]

const patientRegExtractionMappingExamples = [
  { name: 'Patient family name', fhirPath: "item.where(linkId='personal').item.where(linkId='family-name').answer.valueString.first()", target: 'Patient.name[0].family' },
  { name: 'Patient given name', fhirPath: "item.where(linkId='personal').item.where(linkId='given-name').answer.valueString.first()", target: 'Patient.name[0].given[0]' },
  { name: 'Patient birth date', fhirPath: "item.where(linkId='personal').item.where(linkId='dob').answer.valueDate.first()", target: 'Patient.birthDate' },
  { name: 'Patient gender', fhirPath: "item.where(linkId='personal').item.where(linkId='gender').answer.valueCoding.code.first()", target: 'Patient.gender' },
  { name: 'Patient phone', fhirPath: "item.where(linkId='contact').item.where(linkId='phone').answer.valueString.first()", target: 'Patient.telecom[0].value' },
  { name: 'Emergency contact name', fhirPath: "item.where(linkId='emergency').item.where(linkId='ec-name').answer.valueString.first()", target: 'Patient.contact[0].name.text' },
]

// ══════════════════════════════════════════════════════════════════════
// Scenario 2 — Allergy / Condition Recording
// ══════════════════════════════════════════════════════════════════════

const allergyConditionQuestionnaire = {
  resourceType: 'Questionnaire',
  id: 'allergy-condition-recording',
  url: 'http://example.org/fhir/Questionnaire/allergy-condition-recording',
  version: '1.0.0',
  name: 'AllergyConditionRecordingQuestionnaire',
  title: 'Allergy & Condition Recording',
  status: 'active',
  subjectType: ['Patient'],
  date: '2026-02-18',
  item: [
    {
      linkId: 'patient-info',
      text: 'Patient',
      type: 'group',
      item: [
        { linkId: 'patient-name', text: 'Patient Name', type: 'string', required: true },
        { linkId: 'mrn', text: 'Medical Record Number (MRN)', type: 'string', required: true },
      ],
    },
    {
      linkId: 'allergy-section',
      text: 'Allergy Information',
      type: 'group',
      item: [
        { linkId: 'has-allergy', text: 'Does the patient have any known allergies?', type: 'boolean' },
        {
          linkId: 'allergy-detail',
          text: 'Allergy Details',
          type: 'group',
          enableWhen: [{ question: 'has-allergy', operator: '=', answerBoolean: true }],
          item: [
            {
              linkId: 'allergy-type',
              text: 'Allergy Category',
              type: 'choice',
              required: true,
              answerOption: [
                { valueCoding: { system: 'http://hl7.org/fhir/allergy-intolerance-category', code: 'food', display: 'Food' } },
                { valueCoding: { system: 'http://hl7.org/fhir/allergy-intolerance-category', code: 'medication', display: 'Medication' } },
                { valueCoding: { system: 'http://hl7.org/fhir/allergy-intolerance-category', code: 'environment', display: 'Environment' } },
                { valueCoding: { system: 'http://hl7.org/fhir/allergy-intolerance-category', code: 'biologic', display: 'Biologic' } },
              ],
            },
            { linkId: 'allergy-substance', text: 'Substance / Agent', type: 'string', required: true },
            {
              linkId: 'allergy-criticality',
              text: 'Criticality',
              type: 'choice',
              answerValueSet: 'http://hl7.org/fhir/ValueSet/allergy-intolerance-criticality',
            },
            {
              linkId: 'reaction-severity',
              text: 'Reaction Severity',
              type: 'choice',
              answerOption: [
                { valueCoding: { code: 'mild', display: 'Mild' } },
                { valueCoding: { code: 'moderate', display: 'Moderate' } },
                { valueCoding: { code: 'severe', display: 'Severe' } },
              ],
            },
            { linkId: 'reaction-description', text: 'Reaction Description', type: 'text' },
            { linkId: 'allergy-onset', text: 'Onset Date', type: 'date' },
          ],
        },
      ],
    },
    {
      linkId: 'condition-section',
      text: 'Condition / Problem',
      type: 'group',
      item: [
        { linkId: 'has-condition', text: 'Record a new condition?', type: 'boolean' },
        {
          linkId: 'condition-detail',
          text: 'Condition Details',
          type: 'group',
          enableWhen: [{ question: 'has-condition', operator: '=', answerBoolean: true }],
          item: [
            { linkId: 'condition-name', text: 'Condition Name', type: 'string', required: true },
            {
              linkId: 'condition-clinical-status',
              text: 'Clinical Status',
              type: 'choice',
              required: true,
              answerOption: [
                { valueCoding: { system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' } },
                { valueCoding: { system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'recurrence', display: 'Recurrence' } },
                { valueCoding: { system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'relapse', display: 'Relapse' } },
                { valueCoding: { system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'inactive', display: 'Inactive' } },
                { valueCoding: { system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'resolved', display: 'Resolved' } },
              ],
            },
            {
              linkId: 'condition-severity',
              text: 'Severity',
              type: 'choice',
              answerOption: [
                { valueCoding: { system: 'http://snomed.info/sct', code: '255604002', display: 'Mild' } },
                { valueCoding: { system: 'http://snomed.info/sct', code: '6736007', display: 'Moderate' } },
                { valueCoding: { system: 'http://snomed.info/sct', code: '24484000', display: 'Severe' } },
              ],
            },
            { linkId: 'condition-onset', text: 'Onset Date', type: 'date' },
            { linkId: 'condition-note', text: 'Clinical Notes', type: 'text' },
          ],
        },
      ],
    },
    {
      linkId: 'recorded-by',
      text: 'Recorded By',
      type: 'string',
      required: true,
    },
    {
      linkId: 'summary',
      text: 'Items Recorded (calculated)',
      type: 'integer',
      readOnly: true,
      extension: [
        {
          url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression',
          valueExpression: {
            language: 'text/fhirpath',
            expression:
              "iif(item.where(linkId='allergy-section').item.where(linkId='has-allergy').answer.valueBoolean.first() = true, 1, 0) + iif(item.where(linkId='condition-section').item.where(linkId='has-condition').answer.valueBoolean.first() = true, 1, 0)",
          },
        },
      ],
    },
  ],
}

const allergyConditionQuestionnaireResponse = {
  resourceType: 'QuestionnaireResponse',
  id: 'allergy-condition-recording-response',
  questionnaire: 'http://example.org/fhir/Questionnaire/allergy-condition-recording',
  status: 'completed',
  authored: '2026-02-18T10:30:00Z',
  item: [
    {
      linkId: 'patient-info',
      item: [
        { linkId: 'patient-name', answer: [{ valueString: 'Nora Patel' }] },
        { linkId: 'mrn', answer: [{ valueString: 'MRN-00472' }] },
      ],
    },
    {
      linkId: 'allergy-section',
      item: [
        { linkId: 'has-allergy', answer: [{ valueBoolean: true }] },
        {
          linkId: 'allergy-detail',
          item: [
            { linkId: 'allergy-type', answer: [{ valueCoding: { system: 'http://hl7.org/fhir/allergy-intolerance-category', code: 'medication', display: 'Medication' } }] },
            { linkId: 'allergy-substance', answer: [{ valueString: 'Penicillin' }] },
            { linkId: 'reaction-severity', answer: [{ valueCoding: { code: 'severe', display: 'Severe' } }] },
            { linkId: 'reaction-description', answer: [{ valueString: 'Anaphylaxis with throat swelling' }] },
            { linkId: 'allergy-onset', answer: [{ valueDate: '2019-03-15' }] },
          ],
        },
      ],
    },
    {
      linkId: 'condition-section',
      item: [
        { linkId: 'has-condition', answer: [{ valueBoolean: true }] },
        {
          linkId: 'condition-detail',
          item: [
            { linkId: 'condition-name', answer: [{ valueString: 'Type 2 Diabetes Mellitus' }] },
            { linkId: 'condition-clinical-status', answer: [{ valueCoding: { system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active', display: 'Active' } }] },
            { linkId: 'condition-severity', answer: [{ valueCoding: { system: 'http://snomed.info/sct', code: '6736007', display: 'Moderate' } }] },
            { linkId: 'condition-onset', answer: [{ valueDate: '2021-08-10' }] },
            { linkId: 'condition-note', answer: [{ valueString: 'HbA1c trending upward. Adjusting medication.' }] },
          ],
        },
      ],
    },
    { linkId: 'recorded-by', answer: [{ valueString: 'Dr. Singh' }] },
    { linkId: 'summary', answer: [{ valueInteger: 2 }] },
  ],
}

const allergyConditionFhirPathExamples = [
  { label: 'Get allergy substance', expression: "item.where(linkId='allergy-section').item.descendants().where(linkId='allergy-substance').answer.valueString.first()" },
  { label: 'Get allergy category code', expression: "item.where(linkId='allergy-section').item.descendants().where(linkId='allergy-type').answer.valueCoding.code.first()" },
  { label: 'Check if allergy is severe', expression: "item.where(linkId='allergy-section').item.descendants().where(linkId='reaction-severity').answer.valueCoding.code.first() = 'severe'" },
  { label: 'Get condition clinical status', expression: "item.where(linkId='condition-section').item.descendants().where(linkId='condition-clinical-status').answer.valueCoding.display.first()" },
  { label: 'Get condition name', expression: "item.where(linkId='condition-section').item.descendants().where(linkId='condition-name').answer.valueString.first()" },
  { label: 'Count items recorded', expression: "item.where(linkId='summary').answer.valueInteger.first()" },
]

const allergyConditionExtractionMappingExamples = [
  { name: 'AllergyIntolerance category', fhirPath: "item.where(linkId='allergy-section').item.descendants().where(linkId='allergy-type').answer.valueCoding.code.first()", target: 'AllergyIntolerance.category[0]' },
  { name: 'AllergyIntolerance substance', fhirPath: "item.where(linkId='allergy-section').item.descendants().where(linkId='allergy-substance').answer.valueString.first()", target: 'AllergyIntolerance.code.text' },
  { name: 'AllergyIntolerance criticality', fhirPath: "item.where(linkId='allergy-section').item.descendants().where(linkId='allergy-criticality').answer.valueCoding.code.first()", target: 'AllergyIntolerance.criticality' },
  { name: 'Condition name', fhirPath: "item.where(linkId='condition-section').item.descendants().where(linkId='condition-name').answer.valueString.first()", target: 'Condition.code.text' },
  { name: 'Condition clinical status', fhirPath: "item.where(linkId='condition-section').item.descendants().where(linkId='condition-clinical-status').answer.valueCoding.code.first()", target: 'Condition.clinicalStatus.coding[0].code' },
  { name: 'Condition severity', fhirPath: "item.where(linkId='condition-section').item.descendants().where(linkId='condition-severity').answer.valueCoding.code.first()", target: 'Condition.severity.coding[0].code' },
]

// ══════════════════════════════════════════════════════════════════════
// Scenario 3 — Dental Claim
// ══════════════════════════════════════════════════════════════════════

const dentalClaimQuestionnaire = {
  resourceType: 'Questionnaire',
  id: 'dental-claim',
  url: 'http://example.org/fhir/Questionnaire/dental-claim',
  version: '1.0.0',
  name: 'DentalClaimQuestionnaire',
  title: 'Dental Claim Form',
  status: 'active',
  subjectType: ['Patient'],
  date: '2026-02-18',
  item: [
    {
      linkId: 'patient',
      text: 'Patient Information',
      type: 'group',
      item: [
        { linkId: 'patient-name', text: 'Patient Name', type: 'string', required: true },
        { linkId: 'patient-dob', text: 'Date of Birth', type: 'date', required: true },
        { linkId: 'patient-id', text: 'Patient ID / Member ID', type: 'string', required: true },
      ],
    },
    {
      linkId: 'provider',
      text: 'Provider Information',
      type: 'group',
      item: [
        { linkId: 'dentist-name', text: 'Dentist Name', type: 'string', required: true },
        { linkId: 'npi', text: 'NPI Number', type: 'string', required: true },
        { linkId: 'facility-name', text: 'Facility / Clinic Name', type: 'string' },
      ],
    },
    {
      linkId: 'service',
      text: 'Service Details',
      type: 'group',
      item: [
        { linkId: 'service-date', text: 'Date of Service', type: 'date', required: true },
        {
          linkId: 'procedure-code',
          text: 'ADA Procedure Code (CDT)',
          type: 'choice',
          required: true,
          answerOption: [
            { valueCoding: { system: 'http://www.ada.org/cdt', code: 'D0120', display: 'D0120 — Periodic Oral Evaluation' } },
            { valueCoding: { system: 'http://www.ada.org/cdt', code: 'D0150', display: 'D0150 — Comprehensive Oral Evaluation' } },
            { valueCoding: { system: 'http://www.ada.org/cdt', code: 'D0210', display: 'D0210 — Full Mouth X-rays' } },
            { valueCoding: { system: 'http://www.ada.org/cdt', code: 'D1110', display: 'D1110 — Prophylaxis (Adult Cleaning)' } },
            { valueCoding: { system: 'http://www.ada.org/cdt', code: 'D2391', display: 'D2391 — Resin Composite, 1 Surface, Posterior' } },
            { valueCoding: { system: 'http://www.ada.org/cdt', code: 'D2750', display: 'D2750 — Crown, Porcelain Fused to Metal' } },
            { valueCoding: { system: 'http://www.ada.org/cdt', code: 'D7140', display: 'D7140 — Extraction, Erupted Tooth' } },
          ],
        },
        {
          linkId: 'tooth-number',
          text: 'Tooth Number (1–32, or N/A)',
          type: 'string',
        },
        {
          linkId: 'surface',
          text: 'Tooth Surface(s)',
          type: 'choice',
          enableWhen: [{ question: 'procedure-code', operator: '=', answerCoding: { code: 'D2391' } }],
          answerOption: [
            { valueCoding: { code: 'M', display: 'Mesial' } },
            { valueCoding: { code: 'O', display: 'Occlusal' } },
            { valueCoding: { code: 'D', display: 'Distal' } },
            { valueCoding: { code: 'B', display: 'Buccal' } },
            { valueCoding: { code: 'L', display: 'Lingual' } },
          ],
        },
        { linkId: 'fee', text: 'Fee ($)', type: 'decimal', required: true },
      ],
    },
    {
      linkId: 'pre-auth',
      text: 'Pre-Authorization',
      type: 'group',
      item: [
        { linkId: 'pre-auth-required', text: 'Pre-authorization required?', type: 'boolean' },
        {
          linkId: 'pre-auth-number',
          text: 'Pre-authorization Number',
          type: 'string',
          enableWhen: [{ question: 'pre-auth-required', operator: '=', answerBoolean: true }],
          required: true,
        },
      ],
    },
    {
      linkId: 'diagnosis',
      text: 'Diagnosis',
      type: 'group',
      item: [
        {
          linkId: 'icd-code',
          text: 'ICD-10 Diagnosis Code',
          type: 'choice',
          answerOption: [
            { valueCoding: { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'K02.9', display: 'K02.9 — Dental Caries, Unspecified' } },
            { valueCoding: { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'K05.1', display: 'K05.1 — Chronic Gingivitis' } },
            { valueCoding: { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'K08.1', display: 'K08.1 — Loss of Teeth Due to Accident/Extraction' } },
            { valueCoding: { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'Z01.20', display: 'Z01.20 — Encounter for Dental Examination' } },
          ],
        },
        { linkId: 'clinical-note', text: 'Clinical Justification / Notes', type: 'text' },
      ],
    },
    {
      linkId: 'total-fee',
      text: 'Total Claim Amount ($)',
      type: 'decimal',
      readOnly: true,
      extension: [
        {
          url: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression',
          valueExpression: {
            language: 'text/fhirpath',
            expression: "item.where(linkId='service').item.where(linkId='fee').answer.valueDecimal.first()",
          },
        },
      ],
    },
  ],
}

const dentalClaimQuestionnaireResponse = {
  resourceType: 'QuestionnaireResponse',
  id: 'dental-claim-response',
  questionnaire: 'http://example.org/fhir/Questionnaire/dental-claim',
  status: 'completed',
  authored: '2026-02-18T14:15:00Z',
  item: [
    {
      linkId: 'patient',
      item: [
        { linkId: 'patient-name', answer: [{ valueString: 'James Chen' }] },
        { linkId: 'patient-dob', answer: [{ valueDate: '1985-04-22' }] },
        { linkId: 'patient-id', answer: [{ valueString: 'DENT-90281' }] },
      ],
    },
    {
      linkId: 'provider',
      item: [
        { linkId: 'dentist-name', answer: [{ valueString: 'Dr. Maria Lopez' }] },
        { linkId: 'npi', answer: [{ valueString: '1234567890' }] },
        { linkId: 'facility-name', answer: [{ valueString: 'Sunrise Dental Clinic' }] },
      ],
    },
    {
      linkId: 'service',
      item: [
        { linkId: 'service-date', answer: [{ valueDate: '2026-02-14' }] },
        { linkId: 'procedure-code', answer: [{ valueCoding: { system: 'http://www.ada.org/cdt', code: 'D2391', display: 'D2391 — Resin Composite, 1 Surface, Posterior' } }] },
        { linkId: 'tooth-number', answer: [{ valueString: '14' }] },
        { linkId: 'surface', answer: [{ valueCoding: { code: 'O', display: 'Occlusal' } }] },
        { linkId: 'fee', answer: [{ valueDecimal: 275.00 }] },
      ],
    },
    {
      linkId: 'pre-auth',
      item: [
        { linkId: 'pre-auth-required', answer: [{ valueBoolean: false }] },
      ],
    },
    {
      linkId: 'diagnosis',
      item: [
        { linkId: 'icd-code', answer: [{ valueCoding: { system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'K02.9', display: 'K02.9 — Dental Caries, Unspecified' } }] },
        { linkId: 'clinical-note', answer: [{ valueString: 'Occlusal caries on tooth #14. Composite restoration performed.' }] },
      ],
    },
    { linkId: 'total-fee', answer: [{ valueDecimal: 275.00 }] },
  ],
}

const dentalClaimFhirPathExamples = [
  { label: 'Get procedure code display', expression: "item.where(linkId='service').item.where(linkId='procedure-code').answer.valueCoding.display.first()" },
  { label: 'Get total claim amount', expression: "item.where(linkId='total-fee').answer.valueDecimal.first()" },
  { label: 'Get ICD-10 diagnosis', expression: "item.where(linkId='diagnosis').item.where(linkId='icd-code').answer.valueCoding.display.first()" },
  { label: 'Get tooth number', expression: "item.where(linkId='service').item.where(linkId='tooth-number').answer.valueString.first()" },
  { label: 'Check if pre-auth is required', expression: "item.where(linkId='pre-auth').item.where(linkId='pre-auth-required').answer.valueBoolean.first()" },
  { label: 'Get dentist name and NPI', expression: "item.where(linkId='provider').item.where(linkId='dentist-name').answer.valueString.first() + ' (NPI: ' + item.where(linkId='provider').item.where(linkId='npi').answer.valueString.first() + ')'" },
]

const dentalClaimExtractionMappingExamples = [
  { name: 'Claim procedure code', fhirPath: "item.where(linkId='service').item.where(linkId='procedure-code').answer.valueCoding.first()", target: 'Claim.item[0].productOrService.coding[0]' },
  { name: 'Claim total amount', fhirPath: "item.where(linkId='total-fee').answer.valueDecimal.first()", target: 'Claim.total.value' },
  { name: 'Claim service date', fhirPath: "item.where(linkId='service').item.where(linkId='service-date').answer.valueDate.first()", target: 'Claim.item[0].servicedDate' },
  { name: 'Claim diagnosis ICD-10', fhirPath: "item.where(linkId='diagnosis').item.where(linkId='icd-code').answer.valueCoding.first()", target: 'Claim.diagnosis[0].diagnosisCodeableConcept.coding[0]' },
  { name: 'Claim provider NPI', fhirPath: "item.where(linkId='provider').item.where(linkId='npi').answer.valueString.first()", target: 'Claim.provider.identifier.value' },
  { name: 'Claim pre-auth number', fhirPath: "item.where(linkId='pre-auth').item.where(linkId='pre-auth-number').answer.valueString.first()", target: 'Claim.preAuthRef[0]' },
]

export const sampleScenarios = [
  {
    id: 'patient-registration',
    label: 'Patient Registration',
    description: 'New patient intake with demographics, contact details, emergency contact, and insurance — uses answerValueSet for gender and marital status.',
    questionnaire: patientRegQuestionnaire,
    questionnaireResponse: patientRegQuestionnaireResponse,
    fhirPathExamples: patientRegFhirPathExamples,
    extractionMappingExamples: patientRegExtractionMappingExamples,
  },
  {
    id: 'allergy-condition',
    label: 'Allergy & Condition Recording',
    description: 'Record allergies (with category, criticality, reaction) and conditions (with clinical status, severity) for a patient — uses enableWhen and calculatedExpression.',
    questionnaire: allergyConditionQuestionnaire,
    questionnaireResponse: allergyConditionQuestionnaireResponse,
    fhirPathExamples: allergyConditionFhirPathExamples,
    extractionMappingExamples: allergyConditionExtractionMappingExamples,
  },
  {
    id: 'dental-claim',
    label: 'Dental Claim',
    description: 'Dental insurance claim form with ADA CDT procedure codes, ICD-10 diagnosis, tooth/surface selection, pre-authorization, and total fee calculation.',
    questionnaire: dentalClaimQuestionnaire,
    questionnaireResponse: dentalClaimQuestionnaireResponse,
    fhirPathExamples: dentalClaimFhirPathExamples,
    extractionMappingExamples: dentalClaimExtractionMappingExamples,
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
