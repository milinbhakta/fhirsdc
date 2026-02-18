<template>
  <section class="learning-notes card">
    <h2>FHIR SDC Learning Notes</h2>

    <p>
      Structured Data Capture (SDC) in FHIR R4 helps you define data collection with Questionnaire and record
      submitted answers in QuestionnaireResponse.
    </p>

    <h3>Core resources</h3>
    <ul>
      <li><strong>Questionnaire</strong>: The form blueprint, questions, constraints, and answer options.</li>
      <li><strong>QuestionnaireResponse</strong>: The completed answers bound to question linkIds.</li>
      <li><strong>FHIRPath</strong>: Expression language used for extraction, calculated fields, and logic checks.</li>
    </ul>

    <h3>Good authoring habits</h3>
    <ul>
      <li>Keep linkIds stable after release to protect downstream mappings.</li>
      <li>Use coded answers for interoperability instead of free text where possible.</li>
      <li>Validate JSON structure before implementing extraction or transformation logic.</li>
      <li>Write and test FHIRPath snippets incrementally against known samples.</li>
    </ul>
  </section>
</template>
