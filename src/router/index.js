import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'workspace',
      component: HomeView,
    },
    {
      path: '/fhirpath-lab',
      name: 'fhirpath-lab',
      component: () => import('../views/FhirPathLabView.vue'),
    },
    {
      path: '/about',
      name: 'learning-notes',
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

export default router
