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
 * View "page scrolls" (index.html): the DOCUMENT scrolls, so iOS applies its native top fade and the Safari toolbars
 * collapse. The structure is just   main.screen (rect, exact screen height) > div.content (200 % of the rect)
 * plus a fixed footer: no scroll container, no overflow rules.
 */
const env = detectEnvironment()

const rectEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)
const barEl = ref<HTMLElement | null>(null)
// The rect has overflow: visible, so its scrollHeight / clientHeight describe the 200 % content.
const { metrics, events, lastEvent, measure } = useViewportMetrics(rectEl, rectEl, contentEl, barEl)
const { mode, blurShield, barMode } = useSettings('page', measure)
</script>

<template>
  <main ref="rectEl" class="screen">
    <div ref="contentEl" class="content">
      <DebugPanel
        view="page"
        v-model:mode="mode"
        v-model:blur-shield="blurShield"
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

  <!-- Blue bar = where a fixed bottom footer has to sit: directly above the (animated) Safari controls. -->
  <footer v-if="barMode !== 'off'" ref="barEl" class="bottom-bar" aria-hidden="true">
    <strong>fixed bottom bar (LIQUIDO footer) · {{ barMode }}</strong>
    <span v-if="metrics?.bar && metrics.units.dvh != null">
      bar bottom {{ +metrics.bar.bottom.toFixed(1) }}px · 100dvh {{ +metrics.units.dvh.toFixed(1) }}px · innerHeight
      {{ metrics.window.innerHeight }}px
    </span>
  </footer>
</template>

<style>
/*
  Global, because it targets <html>. The whole document is red, so the colour Safari 26+ extends under the status bar
  is red too and the native top fade works against it. (No theme-color meta on purpose.)
*/
:root {
  --gap: var(--red);
  /* Height of the bottom bar's content (the future footer), without the safe-area padding. */
  --bar-h: 56px;
  /* Total height: content + env(safe-area-inset-bottom) as padding (0 in Safari, 34px in Firefox on iOS). */
  --bar-total: calc(var(--bar-h) + var(--sab));
}
</style>

<style scoped>
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 40;
  box-sizing: border-box;
  height: var(--bar-total);
  /* The inset is padding (not margin), so the blue background fills the area under the home indicator /
     the rounded screen corners. box-sizing: border-box keeps the content area at exactly --bar-h. */
  padding: 0 max(12px, var(--sar)) var(--sab) max(12px, var(--sal));
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: var(--blue);
  border-top: 2px solid #fff;
  font: 11px/1.3 ui-monospace, Menlo, monospace;
  pointer-events: none;
}

/* Strategies for the bar's vertical position (html[data-bar], see BAR_MODES). Only bottom0 is pure CSS placed by
   the browser; the others run on the main thread and lag while the toolbar animates. */
html[data-bar='bottom0'] .bottom-bar {
  bottom: 0;
}
html[data-bar='dvh'] .bottom-bar {
  top: calc(100vh - var(--bar-total)); /* fallback without dvh */
  top: calc(100dvh - var(--bar-total));
}
html[data-bar='js'] .bottom-bar {
  top: calc(var(--vv-bottom, 100vh) - var(--bar-total));
}
</style>
