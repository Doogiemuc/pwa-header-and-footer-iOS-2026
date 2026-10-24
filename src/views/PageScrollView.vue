<script setup lang="ts">
import { computed, ref } from 'vue'
import BlurShield from '../components/BlurShield.vue'
import BottomBar from '../components/BottomBar.vue'
import DebugPanel from '../components/DebugPanel.vue'
import EdgeOverlay from '../components/EdgeOverlay.vue'
import ScrollRuler from '../components/ScrollRuler.vue'
import { useSettings } from '../composables/useSettings'
import { useViewportMetrics } from '../composables/useViewportMetrics'
import { detectEnvironment } from '../lib/environment'

/**
 * View "page scrolls" (index.html): the DOCUMENT scrolls, so iOS applies its native top fade and the Safari toolbars
 * collapse. The structure is just   main.screen (rect, exact screen height) > div.content (200 % of the rect)
 * plus a fixed footer: no scroll container, no overflow rules.
 */
const env = detectEnvironment()

const rectEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)
const bar = ref<{ $el: HTMLElement } | null>(null)
const barEl = computed(() => bar.value?.$el ?? null)
// The rect has overflow: visible, so its scrollHeight / clientHeight describe the 200 % content.
const { metrics, events, lastEvent, measure } = useViewportMetrics(rectEl, rectEl, contentEl, barEl)
const { mode, blurShield, barMode, statusBar } = useSettings('page', measure)
</script>

<template>
  <main ref="rectEl" class="screen">
    <div ref="contentEl" class="content">
      <h1 class="page-title">Full Page scrolls</h1>
      <DebugPanel
        view="page"
        v-model:mode="mode"
        v-model:blur-shield="blurShield"
        v-model:status-bar="statusBar"
        v-model:bar-mode="barMode"
        :env="env"
        :metrics="metrics"
        :events="events"
        :last-event="lastEvent"
      />
      <ScrollRuler />
    </div>
    <EdgeOverlay :metrics="metrics" />
  </main>

  <BlurShield v-if="blurShield" />
  <BottomBar v-if="barMode !== 'off'" ref="bar" :metrics="metrics" :bar-mode="barMode" />
</template>

<style>
/*
  Global, because it targets <html>. The whole document is red, so the colour Safari 26+ extends under the status bar
  is red too and the native top fade works against it. (theme-color: see the layer-colour test in index.html.)
*/
:root {
  --gap: var(--red);
}
</style>

<style scoped>
/* Layer test: html = red, theme-color = darkred, .content = darkgrey. If the page works as theorised, no red is visible
   anywhere inside the document (red can only appear where Safari shows the page background outside it). */
.content {
  background-color: darkgrey;
}
</style>
