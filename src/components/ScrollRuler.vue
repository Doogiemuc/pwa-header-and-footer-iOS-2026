<script setup lang="ts">
// Ruler in the right gutter of the 200 % tall content: a short tick every 10 % of the rect height.
// `fullWidthLines` adds a full-width line every 50 % (inner-scroll view only).
// The ticks are positioned in px from the rect's height, not in % of the content: the content may be taller than 200 %.
defineProps<{ fullWidthLines?: boolean; rectHeight: number | null }>()

const ticks = Array.from({ length: 20 }, (_, i) => (i + 1) * 10)
</script>

<template>
  <div v-if="rectHeight" class="ruler" aria-hidden="true">
    <div
      v-for="t in ticks"
      :key="t"
      class="tick"
      :class="{ major: fullWidthLines && t % 50 === 0 }"
      :style="{ top: `${(t / 100) * rectHeight}px` }"
    >
      <span>{{ t }}%</span>
    </div>
  </div>
</template>

<style scoped>
.ruler {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
/* Lines are drawn above their position so the 200% tick cannot overflow the content box. */
.tick {
  position: absolute;
  right: 0;
  transform: translateY(-100%);
  width: calc(var(--sar) + 30px);
  border-bottom: 1px solid var(--ruler, rgb(255 255 255 / 0.8));
}
.tick.major {
  width: 100%;
  border-bottom-width: 2px;
}
.tick span {
  position: absolute;
  right: max(3px, var(--sar));
  bottom: 2px;
  font: 700 9px/1 ui-monospace, Menlo, monospace;
  color: var(--ruler, #fff);
}
</style>
