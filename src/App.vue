<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">FHIR R4</p>
        <h1>SDC Learning Studio</h1>
      </div>

      <nav class="top-nav">
        <RouterLink to="/">Workspace</RouterLink>
        <RouterLink to="/about">Learning Notes</RouterLink>
      </nav>
    </header>

    <RouterView />
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  gap: 1rem;
}

.app-header {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: 0.8rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.8rem;
}

.eyebrow {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-soft);
}

h1 {
  font-size: 1.6rem;
  line-height: 1.2;
}

.top-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  justify-content: flex-end;
}

.top-nav a {
  text-decoration: none;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 0.35rem 0.75rem;
  line-height: 1.2;
  white-space: nowrap;
}

.top-nav a.router-link-exact-active {
  border-color: var(--color-border-hover);
  background: var(--color-background-mute);
  color: var(--color-heading);
}

@media (max-width: 700px) {
  .app-header {
    align-items: stretch;
  }

  .top-nav {
    width: 100%;
    justify-content: stretch;
  }

  .top-nav a {
    flex: 1;
    text-align: center;
  }
}
</style>
