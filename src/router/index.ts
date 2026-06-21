import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import Mini3dPreview from '@/components/Mini3dPreview.vue'
import { defaultMapConfigId } from '@/config/map'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: `/map/${defaultMapConfigId}`,
  },
  {
    path: '/map/:id',
    name: 'map-preview',
    component: Mini3dPreview,
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
