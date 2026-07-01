<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { useRoute } from 'vue-router'

const route = useRoute()
const isAnimationRoute = computed(() => route.name === 'animation-preview')
</script>

<template>
  <main :class="['app-shell', { 'app-shell--flush': isAnimationRoute }]">
    <header v-if="!isAnimationRoute" class="app-shell__header">
      <span class="app-shell__eyebrow">ThreeMaps mini3d</span>
      <h1>Mini3d 地图预览</h1>
    </header>
    <RouterView />
  </main>
</template>
