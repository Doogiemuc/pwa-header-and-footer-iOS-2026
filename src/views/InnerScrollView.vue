<script setup lang="ts">
import { ref } from 'vue'
import BlurShield from '../components/BlurShield.vue'
import DebugPanel from '../components/DebugPanel.vue'
import EdgeOverlay from '../components/EdgeOverlay.vue'
import ScrollRuler from '../components/ScrollRuler.vue'
import { useSettings } from '../composables/useSettings'
import { useViewportMetrics } from '../composables/useViewportMetrics'
import { detectEnvironment } from '../lib/environment'

/**
 * View "rect scrolls inside" (inner.html): the rectangle clips its content and scrolls it itself, so the document
 * never scrolls and the Safari toolbars keep their size. Structure:
 *   main.screen (rect, clips)  >  div.scroller (the scroll container)  >  div.content (200 % of the rect)
 * The scroller is separate from the rect only so that the EdgeOverlay stays pinned to the rect's edges instead of
 * scrolling away with the content.
 */
const env = detectEnvironment()

const rectEl = ref<HTMLElement | null>(null)
const scrollerEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)
const noBar = ref<HTMLElement | null>(null) // this view has no bottom bar
const { metrics, events, lastEvent, measure } = useViewportMetrics(rectEl, scrollerEl, contentEl, noBar)
const { mode, blurShield } = useSettings('inner', measure)
</script>

<template>
  <main ref="rectEl" class="screen">
    <div ref="scrollerEl" class="scroller">
      <div ref="contentEl" class="content">
        <DebugPanel
          view="inner"
          v-model:mode="mode"
          v-model:blur-shield="blurShield"
          :env="env"
          :metrics="metrics"
          :events="events"
          :last-event="lastEvent"
        />
        <ScrollRuler full-width-lines />
      </div>
    </div>
    <EdgeOverlay :metrics="metrics" />
  </main>

  <BlurShield v-if="blurShield" />
</template>

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
