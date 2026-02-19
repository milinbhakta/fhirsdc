export const learningModules = {
  intro: {
    title: 'Module 0: The SDC Standard',
    specUrl: 'https://hl7.org/fhir/uv/sdc/',
    icon: '🏠',
    sections: [
      {
        title: 'What is SDC?',
        content:
          'Structured Data Capture (SDC) is a FHIR Implementation Guide (IG) published by HL7 that extends the base Questionnaire and QuestionnaireResponse resources with advanced capabilities. It defines seven major areas of functionality: Finding and managing questionnaires, Form population, Form rendering, Form behavior and calculation, Form data extraction, Modular forms, and Adaptive forms. The IG specifies a rich set of extensions, operations, and profiles that allow healthcare organizations to build sophisticated, standards-based data capture workflows.',
      },
      {
        title: 'The SDC Lifecycle',
        content:
          '1. **Authoring & Finding**: Questionnaires are created, published, and discovered using search and metadata.\n2. **Rendering**: The form engine reads extensions to control layout, styling, and item controls.\n3. **Population**: The form is pre-filled using patient context, observations, or expressions.\n4. **Behavior**: enableWhen, calculated expressions, value constraints, and scoring control form behavior.\n5. **Completion**: The user fills in the form producing a QuestionnaireResponse.\n6. **Extraction**: Answers are converted into discrete FHIR resources (Observations, Conditions, etc.).\n7. **Modular & Adaptive**: Forms can be assembled from sub-questionnaires or served question-by-question.',
      },
      {
        title: 'Key Technologies',
        content:
          '- **FHIRPath**: The expression language used in enableWhen, calculated expressions, population, and extraction.\n- **CQL (Clinical Quality Language)**: An alternative expression language for complex clinical logic.\n- **LaunchContext**: Named variables (%patient, %encounter, %user) injected at form launch.\n- **FHIR Operations**: $populate, $extract, $assemble, $next-question are SDC-specific operations.\n- **Extensions**: SDC defines 50+ extensions across rendering, behavior, population, and extraction.',
      },
      {
        title: 'System Roles',
        content:
          '- **Form Designer**: Creates and maintains Questionnaire definitions.\n- **Form Filler**: An application that renders questionnaires for end users.\n- **Form Manager**: Stores, versions, and serves questionnaire definitions.\n- **Form Receiver**: Accepts completed QuestionnaireResponse resources.\n- **Form Archiver**: Stores responses for long-term retention.',
      },
    ],
  },
  structure: {
    title: 'Module 1: Structure & Hierarchy',
    specUrl: 'https://hl7.org/fhir/R4/questionnaire.html',
    icon: '🏗️',
    sections: [
      {
        title: 'The Item Graph',
        content:
          'A Questionnaire is a recursive tree of "items". Each item has a `linkId` (must be unique within the Questionnaire) and a `type`. Groups contain nested items, creating arbitrary depth. Items can also carry `definition` which references a StructureDefinition element for semantic meaning.',
      },
      {
        title: 'Item Types',
        content:
          '- **group**: A container for other items.\n- **display**: Read-only text (instructions/headings).\n- **string**: Short free-text input.\n- **text**: Multi-line free-text input.\n- **integer**: Whole number input.\n- **decimal**: Decimal number input.\n- **date / dateTime / time**: Date/time inputs.\n- **boolean**: Checkbox (true/false).\n- **choice**: Select from a defined list (answerOption or answerValueSet).\n- **open-choice**: Choice + free-text fallback.\n- **url**: URL input.\n- **reference**: Reference to another FHIR resource.\n- **quantity**: Numeric value with unit.\n- **attachment**: File upload.',
      },
      {
        title: 'Questionnaire Metadata',
        content:
          'Every Questionnaire needs: resourceType, status (draft|active|retired), and item[]. Optional but important: url (canonical identifier), version, name, title, subjectType, date, publisher, description, useContext, jurisdiction, and derivedFrom (for derived questionnaires).',
      },
      {
        title: 'QuestionnaireResponse Structure',
        content:
          'QuestionnaireResponse mirrors the Questionnaire item hierarchy. Each response item has a linkId matching the question and an answer[] array. The status field tracks progress: in-progress, completed, amended, entered-in-error, or stopped.',
      },
    ],
  },
  rendering: {
    title: 'Module 2: Form Rendering',
    specUrl: 'https://hl7.org/fhir/uv/sdc/rendering.html',
    icon: '🎨',
    sections: [
      {
        title: 'Rendering Extensions Overview',
        content:
          'SDC defines ~25 extensions that control how forms appear visually. These allow form designers to specify exact rendering behavior without relying on form-filler-specific defaults.',
      },
      {
        title: 'Item Control (questionnaire-itemControl)',
        content:
          'Controls the widget type for an item. Common codes:\n- **drop-down**: Render choice as dropdown (default for many).\n- **radio-button**: Render choice as radio buttons.\n- **check-box**: Render choice as checkboxes (for multi-select).\n- **autocomplete**: Render choice with text search typeahead.\n- **slider**: Render integer/decimal as a slider.\n- **text-box**: Render text as a multi-line box.\n- **calendar**: Render date as a calendar widget.\n- **gtable / table / htable**: Render groups as table layouts.\n- **page**: Render group as a wizard page.\n- **tab-container**: Render as tabbed UI.\n- **collapsible / flyover / help**: Show help text in different ways.',
      },
      {
        title: 'Visual Styling Extensions',
        content:
          '- **rendering-style**: Inline CSS applied to the item label/text.\n- **rendering-xhtml**: Rich HTML content instead of plain text.\n- **displayCategory**: Categorizes display items as "instructions" or "security".\n- **shortText**: Abbreviated label for narrow screens.\n- **entryFormat**: Placeholder/mask text shown in empty fields (e.g., "DD/MM/YYYY").\n- **itemMedia**: Attach images or media to questions.\n- **choiceOrientation**: "horizontal" or "vertical" layout for choice items.\n- **sliderStepValue**: Step increment for slider controls.\n- **width**: Suggested pixel or percentage width.\n- **collapsible**: Whether a group starts collapsed or expanded.',
      },
      {
        title: 'Text & Language',
        content:
          '- **rendering-markdown / rendering-xhtml**: Support Markdown or XHTML in item text.\n- **supportLink**: URL linking to further guidance.\n- **translation**: Multi-language support using the FHIR Translation extension on text elements.\n- **optionalDisplay**: Items that may be hidden without affecting clinical meaning.',
      },
      {
        title: 'Hidden & Read-Only Items',
        content:
          '- **hidden**: Extension that hides an item from the user but still evaluates its logic.\n- **readOnly**: Makes an item non-editable (useful for calculated values).\n- **unitValueSet / unitOption**: Define allowed units for quantity items.\n- **unitOpen**: Controls whether users can enter custom units.',
      },
    ],
  },
  logic: {
    title: 'Module 3: Logic Lab',
    specUrl: 'https://hl7.org/fhirpath/',
    icon: '🧠',
    sections: [
      {
        title: 'FHIRPath in SDC',
        content:
          'FHIRPath is the primary expression language in SDC. It navigates FHIR resource trees, filters collections, and performs calculations. SDC-specific FHIRPath variables include %resource (the QuestionnaireResponse), %questionnaire, %qitem, %context, and launch context variables like %patient.',
      },
      {
        title: 'Let Bindings',
        content:
          'FHIRPath supports `let var := expression;` to bind intermediate results. This makes complex expressions readable. Example: `let h := ...height answer...; let w := ...weight answer...; w / (h/100).power(2)` for BMI calculation.',
      },
      {
        title: 'SDC Expression Extensions',
        content:
          '- **calculatedExpression**: Continuously evaluated; sets the answer dynamically.\n- **initialExpression**: Evaluated once at form load for initial values.\n- **enableWhenExpression**: FHIRPath alternative to enableWhen conditions.\n- **answerExpression**: Dynamically generates the answer list.\n- **candidateExpression**: Pre-filters answer options.\n- **contextExpression**: Computes context variables for child items.\n- **variable**: Defines reusable named expressions.',
      },
      {
        title: 'CQL Support',
        content:
          'SDC also supports Clinical Quality Language (CQL) for complex clinical logic. CQL libraries are referenced via the cqf-library extension. CQL is useful when logic involves complex temporal reasoning, clinical terminology, or multi-resource queries that exceed FHIRPath capabilities.',
      },
    ],
  },
  behavior: {
    title: 'Module 4: Form Behavior',
    specUrl: 'https://hl7.org/fhir/uv/sdc/behavior.html',
    icon: '⚙️',
    sections: [
      {
        title: 'EnableWhen',
        content:
          'enableWhen controls item visibility based on answers to other questions. Each condition specifies a question linkId, an operator (=, !=, exists, >, <, >=, <=), and an expected answer value. Use enableBehavior to combine multiple conditions with "all" (AND) or "any" (OR) logic.',
      },
      {
        title: 'EnableWhenExpression',
        content:
          'For complex visibility rules beyond simple comparisons, use the enableWhenExpression extension with a FHIRPath expression that evaluates to boolean. This is more powerful than enableWhen — e.g., "show this question if the sum of two numeric answers exceeds a threshold".',
      },
      {
        title: 'Value Constraints',
        content:
          '- **required**: Item must have an answer.\n- **readOnly**: Item cannot be edited by the user.\n- **maxLength**: Maximum character count for string/text.\n- **minLength** (extension): Minimum character count.\n- **minValue / maxValue** (extension): Numeric or date bounds.\n- **regex** (extension): Regex pattern the answer must match.\n- **minQuantity / maxQuantity** (extension): Bounds for quantity items.\n- **mimeType** (extension): Allowed MIME types for attachment items.\n- **maxSize** (extension): Maximum file size for attachments.',
      },
      {
        title: 'Answer Sources',
        content:
          '- **answerOption**: Inline list of allowed answers on the item.\n- **answerValueSet**: URI referencing a ValueSet for allowed answers.\n- **answerExpression** (extension): FHIRPath/CQL expression returning allowed answers dynamically.\n- **candidateExpression** (extension): Pre-filters answers for autocomplete scenarios.',
      },
      {
        title: 'Calculated & Derived Values',
        content:
          '- **calculatedExpression**: Continuously re-evaluated as the form changes; result automatically updates the answer.\n- **initialExpression**: Evaluated once when the form opens; sets the initial answer.\n- **variable** (extension): Named sub-expressions shared across multiple items.\n\nCalculated items should typically be marked readOnly so users cannot override computed values.',
      },
      {
        title: 'Scoring & ItemWeight',
        content:
          'The SDC itemWeight extension assigns numeric weights to answer options, enabling standardized scoring (e.g., PHQ-9, GAD-7 depression/anxiety screeners). Combined with calculatedExpression, total scores are dynamically computed as the user selects answers. The ordinalValue() FHIRPath function extracts the assigned weight from a selected coding.',
      },
      {
        title: 'Custom Validation (constraint Extension)',
        content:
          'SDC provides the `constraint` extension for defining custom validation rules using FHIRPath expressions. Each constraint contains:\n- **key**: A unique identifier for the constraint (e.g., "age-range").\n- **severity**: "error" (blocks submission) or "warning" (advisory).\n- **human**: The validation message shown to the user when the constraint fails.\n- **expression**: A FHIRPath expression that must evaluate to true for the item to be valid.\n\nExample: Ensure a date-of-birth is not in the future — the expression `$this.value <= today()` with human text "Date of birth cannot be in the future."\n\nConstraints are evaluated by the form filler after each user input change. If the expression returns false, the human message is displayed as an error or warning next to the item.',
      },
      {
        title: 'Cross-Item Validation (targetConstraint)',
        content:
          'While the `constraint` extension validates a single item, `targetConstraint` validates relationships **between** items. It is placed on a group or the Questionnaire root and can reference multiple items in its FHIRPath expression.\n\nExample: "Diastolic BP must be less than Systolic BP" — expressed as:\n`%resource.item.where(linkId=\'diastolic\').answer.valueInteger < %resource.item.where(linkId=\'systolic\').answer.valueInteger`\n\nTargetConstraint also supports key, severity, human, and expression fields. Use it for business rules that span multiple fields.',
      },
      {
        title: 'Validation Message Best Practices',
        content:
          '- Write clear, actionable `human` messages: "Enter a value between 30 and 250" rather than "Invalid value".\n- Use `severity: error` for hard stops (data integrity) and `severity: warning` for soft guidance.\n- Guard FHIRPath expressions with `exists()` to avoid false errors on empty fields.\n- Combine `constraint` with `required`, `maxLength`, `minValue/maxValue`, and `regex` for layered validation.\n- Test constraints against edge cases: empty input, boundary values, and type mismatches.',
      },
      {
        title: 'Advanced Behavior Extensions',
        content:
          '- **entryMode**: Controls how items are presented (sequential, prior-edit, random).\n- **usageMode**: Whether the item applies during data capture, display, or both.\n- **signatureRequired**: Requires digital signature on submission.\n- **openLabel**: Label for the "other" option in open-choice items.',
      },
    ],
  },
  population: {
    title: 'Module 5: Population',
    specUrl: 'https://hl7.org/fhir/uv/sdc/populate.html',
    icon: '📥',
    sections: [
      {
        title: 'What is Population?',
        content:
          'Population is the process of pre-filling a QuestionnaireResponse with data from existing FHIR resources (Patient, Observation, Condition, etc.) before the user begins editing. This reduces data entry burden, improves accuracy, and avoids asking patients to re-enter known information. The $populate operation is the standard entry point.',
      },
      {
        title: 'Observation-Based Population',
        content:
          'Each questionnaire item is tagged with an observation code (via the observationLinkPeriod extension). The form filler queries the server for recent Observations matching that code and pre-fills answers automatically. This is the simplest population method — no FHIRPath expressions needed. Best for: vital signs, lab results, and any data already stored as Observations.',
      },
      {
        title: 'Expression-Based Population',
        content:
          'Uses three SDC extensions:\n1. **launchContext**: Declares named variables available at form launch (%patient, %encounter, %user, etc.).\n2. **variable**: Defines reusable named expressions (e.g., fetch all active MedicationRequests).\n3. **initialExpression**: FHIRPath expression evaluated at form load to compute the initial answer.\n\nExpression-based population is the most flexible method and can pull data from any FHIR resource type.',
      },
      {
        title: 'StructureMap-Based Population',
        content:
          'Uses a FHIR StructureMap to transform source resources into a QuestionnaireResponse. The sourceStructureMap extension on the Questionnaire points to the StructureMap. This method is powerful for complex transformations but requires authoring StructureMap resources (which have their own language/syntax).',
      },
      {
        title: 'The $populate Operation',
        content:
          'The SDC $populate operation takes input parameters (Questionnaire canonical URL, subject reference, and optional context resources) and returns a pre-populated QuestionnaireResponse. The server examines the Questionnaire extensions to determine which population method to use. Parameters include: questionnaire, subject, context, local (for passing resources directly), and launchContext.',
      },
      {
        title: 'Population Best Practices',
        content:
          '- Always guard expressions with exists() to handle missing data gracefully.\n- Use launchContext declarations so form fillers know what context variables are expected.\n- Prefer initialExpression over calculatedExpression for prepopulated values the user should be able to edit.\n- Consider combining observation-based and expression-based approaches for different sections of the same form.',
      },
    ],
  },
  extraction: {
    title: 'Module 6: Data Extraction',
    specUrl: 'https://hl7.org/fhir/uv/sdc/extraction.html',
    icon: '📤',
    sections: [
      {
        title: 'What is Extraction?',
        content:
          'Extraction converts a completed QuestionnaireResponse into discrete FHIR resources (Observations, Conditions, Procedures, etc.) that can be stored in the EHR. This is the "last mile" of the SDC workflow — turning form answers into structured clinical data. The $extract operation is the standard entry point.',
      },
      {
        title: 'Observation-Based Extraction',
        content:
          'The simplest method. Tag questionnaire items with observation codes using the observationExtract extension. When extraction runs, each tagged answer becomes an Observation resource with the specified code, value, and timing. Best for: vital signs, lab results, and simple numeric/coded answers. Supports: observationExtract (boolean flag), observation-extract-category, and the item\'s code element for the Observation.code.',
      },
      {
        title: 'Definition-Based Extraction',
        content:
          'Each item\'s `definition` URL points to a StructureDefinition element (e.g., "http://hl7.org/fhir/StructureDefinition/Patient#Patient.name.given"). The extraction engine uses these definitions to map answers to specific resource properties. This allows extracting into ANY FHIR resource type, not just Observations. The item hierarchy must mirror the target resource structure.',
      },
      {
        title: 'StructureMap-Based Extraction',
        content:
          'Uses a FHIR StructureMap (referenced via the targetStructureMap extension) to transform the QuestionnaireResponse into target resources. This is the most powerful and flexible method — it can handle complex multi-resource extraction with conditional logic and data transformation. However, it requires authoring StructureMap resources.',
      },
      {
        title: 'Template-Based Extraction',
        content:
          'Uses a contained or referenced Bundle of template resources with placeholder FHIRPath expressions. At extraction time, the expressions are evaluated against the QuestionnaireResponse and the results are injected into the templates. This provides a visual, JSON-based approach to defining extraction mappings. The templateExtract extension references the extraction template.',
      },
      {
        title: 'The $extract Operation',
        content:
          'The SDC $extract operation takes a completed QuestionnaireResponse (and optionally the Questionnaire) and returns a Bundle of extracted resources (a Transaction Bundle). The server examines the Questionnaire extensions to determine which extraction method(s) to apply. Multiple methods can coexist on a single Questionnaire.',
      },
      {
        title: 'Extraction Best Practices',
        content:
          '- Use observation-based extraction for simple vital signs and lab values.\n- Use definition-based extraction when you need to create specific resource types (Patient, Condition, etc.).\n- Use template-based extraction when the mapping is straightforward but involves multiple resource types.\n- Use StructureMap extraction for complex transformations.\n- Always validate extracted resources against their profiles.\n- Consider using both observation-based and definition-based extraction in the same Questionnaire for different sections.',
      },
    ],
  },
  modular: {
    title: 'Module 7: Modular Forms',
    specUrl: 'https://hl7.org/fhir/uv/sdc/modular.html',
    icon: '🧩',
    sections: [
      {
        title: 'What are Modular Forms?',
        content:
          'Modular forms allow Questionnaires to be composed from reusable sub-questionnaires. Instead of duplicating common sections (demographics, vitals, allergies) across many forms, you define them once and reference them. This promotes consistency, reduces maintenance burden, and enables organizational standardization.',
      },
      {
        title: 'The subQuestionnaire Extension',
        content:
          'A display-type item with the subQuestionnaire extension references another Questionnaire by canonical URL. When the form is assembled, the display item is replaced by the items from the referenced sub-questionnaire. The extension URL is: http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-subQuestionnaire',
      },
      {
        title: 'The $assemble Operation',
        content:
          'The $assemble operation takes a modular Questionnaire with subQuestionnaire references and returns a fully assembled, flat Questionnaire with all referenced sub-questionnaires inlined. This assembled form can then be rendered by any standard form filler that does not support modular forms natively. Parameters: questionnaire (the modular root).',
      },
      {
        title: 'Assembly Rules',
        content:
          '- Sub-questionnaires are inlined at the position of the display item.\n- The assembled Questionnaire\'s extension list is merged from all sub-questionnaires.\n- Variables and launch contexts from sub-questionnaires are promoted to the root.\n- Contained resources from sub-questionnaires are included in the assembled form.\n- Assembly can be recursive (sub-questionnaires can reference other sub-questionnaires).\n- The assembledFrom extension records the original modular source.',
      },
      {
        title: 'Questionnaire Libraries & Data Elements',
        content:
          '- **Library-based**: A library of reusable questionnaire sections stored on a FHIR server, discoverable by metadata.\n- **Data element-based**: Individual items reference DataElement/StructureDefinition resources for their definition, enabling a "pick from catalog" authoring experience.\n- **derivedFrom**: A Questionnaire can declare it is derived from another (e.g., a localized version of a standard form).',
      },
    ],
  },
  adaptive: {
    title: 'Module 8: Adaptive Forms',
    specUrl: 'https://hl7.org/fhir/uv/sdc/adaptive.html',
    icon: '🔄',
    sections: [
      {
        title: 'What are Adaptive Forms?',
        content:
          'Adaptive forms present questions one (or a few) at a time, with the next question chosen dynamically based on prior answers. This supports Computerized Adaptive Testing (CAT) and conditional branching that goes beyond static enableWhen logic. The server controls which questions appear next.',
      },
      {
        title: 'The $next-question Operation',
        content:
          'The form filler calls $next-question repeatedly, sending the current QuestionnaireResponse (with answers so far). The server evaluates the answers and returns an updated QuestionnaireResponse with the next question(s) appended. When no more questions are needed, the server sets status to "completed" and may include a final score or summary.',
      },
      {
        title: 'Adaptive Form Flow',
        content:
          '1. Form filler calls $next-question with an empty QuestionnaireResponse (just the questionnaire reference).\n2. Server returns a QuestionnaireResponse containing the first question item (with no answer).\n3. User answers the question.\n4. Form filler calls $next-question again with the updated QuestionnaireResponse.\n5. Server evaluates and returns the next question(s).\n6. Repeat until the server returns status = "completed".',
      },
      {
        title: 'Computerized Adaptive Testing (CAT)',
        content:
          'CAT uses Item Response Theory (IRT) to select the most informative question based on the test-taker\'s estimated ability level. Each answer updates the ability estimate, and the next question is chosen to maximize measurement precision. This dramatically reduces the number of questions needed while maintaining measurement accuracy. Examples: PROMIS measures for patient-reported outcomes.',
      },
      {
        title: 'The questionnaireAdaptive Extension',
        content:
          'A Questionnaire marked with the questionnaireAdaptive extension signals that it should be administered using the $next-question operation rather than rendered all at once. The Questionnaire may contain the full item bank (for reference) or may be a minimal shell with items served dynamically.',
      },
      {
        title: 'Adaptive Form Considerations',
        content:
          '- Requires a server that implements $next-question with appropriate scoring logic.\n- The form filler must support iterative rendering (adding questions one by one).\n- Not all questions need to be adaptive; hybrid forms can have static sections plus an adaptive section.\n- Final scores are typically returned as calculated items in the last $next-question response.',
      },
    ],
  },
  workflow: {
    title: 'Module 9: Workflow & Conformance',
    specUrl: 'https://hl7.org/fhir/uv/sdc/workflow.html',
    icon: '🔧',
    sections: [
      {
        title: 'SDC System Roles',
        content:
          'The SDC IG defines five system roles as CapabilityStatements:\n1. **Form Designer**: Creates, edits, and publishes Questionnaire resources.\n2. **Form Filler**: Renders forms, supports population, and captures responses.\n3. **Form Manager**: Stores and serves Questionnaire resources (CRUD + search).\n4. **Form Receiver**: Accepts QuestionnaireResponse submissions.\n5. **Form Archiver**: Stores responses for long-term retention and retrieval.',
      },
      {
        title: 'CapabilityStatement Profiles',
        content:
          'SDC defines CapabilityStatement profiles for each role specifying:\n- Required resource types and interactions (read, search, create, update).\n- Required search parameters (url, version, status, name, title, etc.).\n- Required operations ($populate, $extract, $assemble, $next-question).\n- Expected behaviors (e.g., Form Filler must support rendering extensions).',
      },
      {
        title: 'Finding Questionnaires',
        content:
          'Questionnaires are discovered via FHIR search on the Form Manager:\n- **url**: Exact canonical URL match.\n- **version**: Specific version.\n- **status**: active | draft | retired.\n- **name / title**: Text search.\n- **context / useContext**: Clinical context (specialty, condition, setting).\n- **publisher**: Organization that maintains the form.\n- **jurisdiction**: Geographic applicability.\n- **date**: Publication date range.',
      },
      {
        title: 'Task-Based Assignment',
        content:
          'FHIR Task resources can be used to assign questionnaire completion to specific practitioners or patients. The Task references the Questionnaire to fill and the patient subject. Task status (requested → in-progress → completed) tracks form completion workflow. This enables work queue management in EHR systems.',
      },
      {
        title: 'Validation & Security',
        content:
          '- **Validation**: Responses should be validated against Questionnaire constraints (required, maxLength, regex, value bounds) before submission.\n- **Security**: Access control based on Questionnaire.useContext, patient consent, and practitioner role.\n- **Provenance**: Responses should carry authorship, timing, and device information.\n- **Signature**: The signatureRequired extension mandates digital signatures on critical forms.\n- **Audit**: All form interactions should be audit-logged per FHIR AuditEvent.',
      },
      {
        title: 'Conformance Levels',
        content:
          'SDC defines several Questionnaire profiles at different conformance levels:\n- **SDC Base Questionnaire**: Minimal SDC extensions.\n- **SDC Advanced Rendering**: Full rendering extension support.\n- **SDC Behavior**: enableWhen, calculations, constraints.\n- **SDC Populate**: Population extensions.\n- **SDC Extract**: Extraction extensions.\n- **SDC Modular**: Sub-questionnaire support.\n- **SDC Adaptive**: Adaptive form support.\n\nForm fillers declare which profiles they support via their CapabilityStatement.',
      },
    ],
  },
}
