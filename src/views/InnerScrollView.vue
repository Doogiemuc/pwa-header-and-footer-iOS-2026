<script setup lang="ts">
import { computed, ref } from 'vue'
import AppHeader from '../components/AppHeader.vue'
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
 * View "rect scrolls inside" (inner.html): the rectangle clips its content and scrolls it itself, so the document
 * never scrolls and the Safari toolbars keep their size. Structure:
 *   main.screen (rect, clips)  >  div.scroller (the scroll container)  >  div.content (200 % of the rect)
 * The scroller is separate from the rect only so that the EdgeOverlay stays pinned to the rect's edges instead of
 * scrolling away with the content. Like the page view it has the fixed blue bottom bar (the future footer).
 */
const env = detectEnvironment()

const rectEl = ref<HTMLElement | null>(null)
const scrollerEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)
const bar = ref<{ $el: HTMLElement } | null>(null)
const barEl = computed(() => bar.value?.$el ?? null)
const { metrics, events, lastEvent, measure } = useViewportMetrics(rectEl, scrollerEl, contentEl, barEl)
const { mode, statusBar } = useSettings('inner', measure)
</script>

<template>
  <main ref="rectEl" class="screen">
    <div ref="scrollerEl" class="scroller">
      <div ref="contentEl" class="content">
        <h1 class="page-title">Inner DIV scrolls</h1>
        <DebugPanel
          view="inner"
          v-model:mode="mode"
          v-model:status-bar="statusBar"
          :env="env"
          :metrics="metrics"
          :events="events"
          :last-event="lastEvent"
        />
        <ScrollRuler full-width-lines :rect-height="metrics?.rect?.height ?? null" />
      </div>
      <FooterLine />
    </div>
    <EdgeOverlay :metrics="metrics" />
  </main>

  <AppHeader />
  <ViewSwitch target="page" />
  <BottomBar ref="bar" :metrics="metrics" />
</template>

<style>
/* App background on #app (viewport sized; the content scrolls over it), see style.css. */
#app {
  background: var(--app-gradient);
}
</style>

<style scoped>
.screen {
  overflow: hidden;
}

.scroller {
  position: absolute;
  inset: 0;
  overflow-x: hidden;
  overflow-y: auto;
}
</style>
