<script setup lang="ts">
import { computed, ref } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import BlurShield from '../components/BlurShield.vue'
import BottomBar from '../components/BottomBar.vue'
import DebugPanel from '../components/DebugPanel.vue'
import EdgeOverlay from '../components/EdgeOverlay.vue'
import FooterLine from '../components/FooterLine.vue'
import ScrollRuler from '../components/ScrollRuler.vue'
import ViewSwitch from '../components/ViewSwitch.vue'
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
const { mode, barMode, statusBar, blurShield } = useSettings('page', measure)
</script>

<template>
  <main ref="rectEl" class="screen">
    <div ref="contentEl" class="content">
      <h1 class="page-title">Full Page scrolls</h1>
      <DebugPanel
        view="page"
        v-model:mode="mode"
        v-model:status-bar="statusBar"
        v-model:blur-shield="blurShield"
        v-model:bar-mode="barMode"
        :env="env"
        :metrics="metrics"
        :events="events"
        :last-event="lastEvent"
      />
      <ScrollRuler :rect-height="metrics?.rect?.height ?? null" />
    </div>
    <EdgeOverlay :metrics="metrics" />
    <FooterLine />
  </main>

  <AppHeader />
  <BlurShield v-if="blurShield" />
  <ViewSwitch target="inner" />
  <BottomBar v-if="barMode !== 'off'" ref="bar" :metrics="metrics" :bar-mode="barMode" />
</template>

<style scoped>
/* LIQUIDO app background over the whole scrollable document (see style.css). */
.content {
  background: var(--app-gradient);
}
</style>
