# FHIR SDC Learning Platform

An interactive, single-page learning application for the **HL7 FHIR Structured Data Capture (SDC)** Implementation Guide. Built with Vue 3 and Monaco Editor, it provides a hands-on environment to explore Questionnaire authoring, FHIRPath expressions, form rendering, and the full SDC lifecycle — all in the browser.

---

## Features

### Learning Modules (0–9)

| Module | Tab | What You Learn |
|--------|-----|----------------|
| **0 — Basics** | Intro | SDC standard overview, lifecycle, key technologies |
| **1 — Structure** | Structure | Questionnaire nesting with an interactive JSON ↔ tree view |
| **2 — Rendering** | Rendering | Live form preview with rendering extensions |
| **3 — Logic Lab** | FHIRPath | Write and evaluate FHIRPath expressions against sample resources |
| **4 — Behavior** | Behavior | enableWhen, constraints, calculated expressions, scoring |
| **5 — Population** | Population | Pre-filling forms from FHIR data |
| **6 — Extraction** | Extraction | Converting QuestionnaireResponse into discrete FHIR resources |
| **7 — Modular Forms** | Modular | Composing from sub-questionnaires |
| **8 — Adaptive Forms** | Adaptive | Dynamic question delivery with `$next-question` |
| **9 — Workflow** | Workflow | Roles, conformance profiles, search parameters |

### Playground

A free-form sandbox to build, validate, and test any Questionnaire:

- **Monaco Editor** — Full VS Code–style editing (syntax highlighting, bracket pair colorization, code folding, find & replace, undo/redo)
- **Smart FHIR Autocompletion** — Context-aware suggestions that understand where you are in the JSON tree; type-aware filtering (e.g. `answerOption` only for choice/open-choice items), duplicate-key prevention, smart scaffolding for nested objects and arrays
- **Hover Tooltips** — Hover any FHIR property key to see its description
- **Format Document** — Right-click → Format Document, Shift+Alt+F, or the Format button
- **Real-Time Validation** — Custom validator showing issues as you type
- **Live Form Preview** — Renders the Questionnaire as an interactive form with `QuestionnaireResponse` generation
- **FHIRPath Evaluator** — Test expressions against the generated response
- **Starter Templates** — Load blank, basic, or complex Questionnaire starters

### Additional Tools

- **Quiz** — Multiple-choice questions covering the entire SDC curriculum with scoring
- **Reference / Cheat Sheets** — Searchable FHIRPath grammar, operators, functions, SDC expression contexts, rendering extensions catalog

### Editor Components

- **JsonTooltipEditor** — Monaco-based JSON editor with FHIR-aware autocompletion, hover tooltips, document formatting, and full clipboard support
- **FhirPathEditor** — CodeMirror 6-based editor for FHIRPath expressions with function/keyword autocompletion
- **DynamicQuestionnaireForm** — Renders any valid Questionnaire as an interactive HTML form, supporting all item types (group, string, text, integer, decimal, boolean, date, dateTime, time, choice, open-choice, display, url, quantity, attachment, reference) and generating a QuestionnaireResponse
- **ResourceTreeNode** — Recursive tree view of a FHIR resource with expand/collapse, node selection, and property guide tooltips

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`) |
| Build | [Vite 7](https://vite.dev/) |
| Routing | [Vue Router 5](https://router.vuejs.org/) |
| JSON Editor | [Monaco Editor 0.55](https://microsoft.github.io/monaco-editor/) via [vite-plugin-monaco-editor](https://github.com/vdesjs/vite-plugin-monaco-editor) |
| FHIRPath Editor | [CodeMirror 6](https://codemirror.net/) |
| FHIRPath Engine | [fhirpath.js](https://github.com/HL7/fhirpath.js) (R4 model) |
| Package Manager | [pnpm](https://pnpm.io/) |
