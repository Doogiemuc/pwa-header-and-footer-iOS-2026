<script setup lang="ts">
import type { Metrics } from '../composables/useViewportMetrics'

// Overlay pinned to the rectangle (does not scroll with its content): yellow top/bottom edge and safe-area guides.
defineProps<{ metrics: Metrics | null }>()
</script>

<template>
  <div class="overlay" aria-hidden="true">
    <div class="edge top"></div>
    <div class="edge bottom"></div>
    <div v-if="metrics && metrics.safeArea.top > 0" class="guide safe-top">
      <span>safe-area-inset-top {{ metrics.safeArea.top }}px</span>
    </div>
    <div v-if="metrics && metrics.safeArea.bottom > 0" class="guide safe-bottom">
      <span>safe-area-inset-bottom {{ metrics.safeArea.bottom }}px</span>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
.edge {
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--edge);
}
.edge.top {
  top: 0;
}
.edge.bottom {
  bottom: 0;
}
.guide {
  position: absolute;
  left: 0;
  right: 0;
  font: 10px/1 ui-monospace, Menlo, monospace;
}
.guide span {
  position: absolute;
  left: max(6px, var(--sal));
  padding: 2px 0;
}
.guide.safe-top {
  top: var(--sat);
  border-top: 1px dashed #fff;
}
.guide.safe-bottom {
  bottom: var(--sab);
  border-bottom: 1px dashed #fff;
}
.guide.safe-bottom span {
  bottom: 0;
}
</style>
