export const learningModules = {
  intro: {
    title: 'Module 0: The SDC Standard',
    sections: [
      {
        title: 'What is SDC?',
        content: 'Structured Data Capture (SDC) is a FHIR implementation guide that defines how to create, use, and process advanced forms. It standardizes how healthcare forms are rendered, how they behave (logic), and how data is extracted from them.'
      },
      {
        title: 'The Workflow',
        content: '1. **Authoring**: Creating the Questionnaire resource.\n2. **Population**: Pre-filling the form with patient data.\n3. **Completion**: The user fills out the form (QuestionnaireResponse).\n4. **Extraction**: Converting the response into other FHIR resources (Observations, Conditions, etc.).'
      },
      {
        title: 'Key Technologies',
        content: '- **FHIRPath**: A navigation graph language used for logic and extraction.\n- **LaunchContext**: Variables passed into the form (like "Patient" or "Encounter").'
      }
    ]
  },
  structure: {
    title: 'Module 1: Structure & Hierarchy',
    sections: [
      {
        title: 'The Item Graph',
        content: 'A Questionnaire is a recursive tree of "items". Each item has a `linkId` (unique identifier) and a `type` (group, string, choice, etc.). Groups contain other items, creating a hierarchy.'
      },
      {
        title: 'Item Types',
        content: '- **Group**: A container for other questions.\n- **Display**: Read-only text.\n- **String/Integer/Date**: Simple input fields.\n- **Choice/Open-Choice**: Dropdowns or radio buttons.'
      }
    ]
  },
  rendering: {
    title: 'Module 2: Rendering & Behavior',
    sections: [
      {
        title: 'Advanced Rendering',
        content: 'You can control how items appear using extensions. For example, the "rendering-style" extension can set CSS text color, or "itemControl" can change a dropdown to a radio button list.'
      },
      {
        title: 'Initial Values',
        content: 'Items can have `initial` values, which are pre-filled when the form is opened. This is distinct from "Population", which is dynamic.'
      }
    ]
  },
  logic: {
    title: 'Module 3: Logic & Extraction',
    sections: [
      {
        title: 'EnableWhen',
        content: 'Controls visibility based on answers to other questions. Example: "Show pregnancy question ONLY IF gender is female".'
      },
      {
        title: 'Calculated Expressions',
        content: 'Use `extension:calculatedExpression` to dynamically set an answer based on other answers (e.g., BMI calculation).'
      },
      {
        title: 'Extraction',
        content: 'The ultimate goal is often to create clinically usable resources (Observations) from the form data. This is done using "Definition-based extraction" or "StructureMap" extraction.'
      }
    ]
  }
}
