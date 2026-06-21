<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <main class="app-shell">
    <header class="app-shell__header">
      <span class="app-shell__eyebrow">ThreeMaps mini3d</span>
      <h1>Mini3d 地图预览</h1>
    </header>
    <RouterView />
  </main>
</template>
