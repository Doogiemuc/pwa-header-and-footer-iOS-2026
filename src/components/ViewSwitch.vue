<script setup lang="ts">
import { computed } from 'vue'
import { viewHref } from '../lib/viewLinks'

// Round button, fixed at the top right: links to the other page (keeps the settings in the URL).
const props = defineProps<{ target: 'page' | 'inner' }>()

const href = computed(() => viewHref(props.target === 'page' ? 'index.html' : 'inner.html'))
const label = computed(() => (props.target === 'page' ? 'Go to "Full Page scrolls"' : 'Go to "Inner DIV scrolls"'))
</script>

<template>
  <a class="view-switch" :href="href" :aria-label="label" :title="label">
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <!-- target "inner": a box inside a box; target "page": a tall page with text lines -->
      <template v-if="target === 'inner'">
        <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
        <rect x="8" y="8" width="8" height="8" rx="1.5" />
      </template>
      <template v-else>
        <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
        <path d="M9.5 8h5M9.5 12h5M9.5 16h3" />
      </template>
    </svg>
  </a>
</template>

<style scoped>
.view-switch {
  position: fixed;
  z-index: 60;
  top: calc(var(--sat) + 8px);
  right: calc(var(--sar) + 8px);
  display: grid;
  place-items: center;
  width: 44px; /* 44px = minimum touch target on iOS */
  height: 44px;
  border-radius: 50%;
  background: #fff;
  color: #000;
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.35);
  -webkit-tap-highlight-color: transparent;
}
.view-switch:active {
  transform: scale(0.94);
}
</style>
