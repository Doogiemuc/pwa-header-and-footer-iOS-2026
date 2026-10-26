<script setup lang="ts">
import type { Metrics } from '../composables/useViewportMetrics'

// Blue bar = where a fixed bottom footer has to sit: directly above the (animated) Safari controls.
// It also works as a status line: the live numbers show where its bottom edge is compared to the viewport.
defineProps<{ metrics: Metrics | null }>()
</script>

<template>
  <footer class="bottom-bar" aria-hidden="true">
    <strong>fixed bottom bar (footer) · position: fixed; bottom: 0</strong>
    <span v-if="metrics?.bar && metrics.units.dvh != null">
      bar bottom {{ +metrics.bar.bottom.toFixed(1) }}px · 100dvh {{ +metrics.units.dvh.toFixed(1) }}px · innerHeight
      {{ metrics.window.innerHeight }}px
    </span>
    <span v-if="metrics">safe-area-inset-bottom {{ metrics.safeArea.bottom }}px (below dashed)</span>
    <!-- Start of the safe-area padding: everything below this line is env(safe-area-inset-bottom). -->
    <i class="safe-line"></i>
  </footer>
</template>

<style>
/* Global: the sizes are shared CSS variables (also read by the debug panel). */
:root {
  /* Height of the bar's content (the future footer), without the safe-area padding. */
  --bar-h: 56px;
  /* Total height: content + env(safe-area-inset-bottom) as padding (0 in Safari, 34px in Firefox on iOS). */
  --bar-total: calc(var(--bar-h) + var(--sab));
}
</style>

<style scoped>
.bottom-bar {
  /* Plain CSS, placed by the browser: follows the animated Safari toolbar without lag (anything computed in JS or with
     100dvh runs on the main thread and jumps). */
  position: fixed;
  bottom: 0;
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

.safe-line {
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--sab);
  border-top: 1px dashed #fff;
}

</style>
