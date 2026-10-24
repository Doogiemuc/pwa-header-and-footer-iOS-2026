<script setup lang="ts">
import { nextTick, ref, watch, watchEffect } from 'vue'
import DebugPanel from './components/DebugPanel.vue'
import {
  isBarMode,
  isHeightMode,
  useViewportMetrics,
  type BarMode,
  type HeightMode,
  type ScrollMode,
} from './composables/useViewportMetrics'
import { detectEnvironment } from './lib/environment'

const env = detectEnvironment()

// Settings live in the URL so a reload (or a shared link) keeps them.
const params = new URLSearchParams(location.search)
const initialMode = params.get('h')
const mode = ref<HeightMode>(isHeightMode(initialMode) ? initialMode : 'dvh')
const blurShield = ref(params.get('shield') === '1')
// 'page' = the document scrolls (native iOS top fade); 'inner' = the rectangle scrolls its own content.
const scrollMode = ref<ScrollMode>(params.get('scroll') === 'inner' ? 'inner' : 'page')

// Blue bottom bar (future footer): how its position above the floating Safari controls is calculated.
const initialBar = params.get('bar')
const barMode = ref<BarMode>(isBarMode(initialBar) ? initialBar : 'bottom0')

const rectEl = ref<HTMLElement | null>(null)
const scrollerEl = ref<HTMLElement | null>(null)
const contentEl = ref<HTMLElement | null>(null)
const barEl = ref<HTMLElement | null>(null)
const { metrics, events, lastEvent, measure } = useViewportMetrics(rectEl, scrollerEl, contentEl, barEl)

watchEffect(() => {
  const root = document.documentElement
  root.dataset.heightMode = mode.value
  root.dataset.scroll = scrollMode.value
  root.dataset.bar = barMode.value
})

// 'js' bar mode: the Safari toolbar animates for ~0.3 s without reliable resize events, so read the
// visual viewport on every frame and publish its bottom edge as a CSS variable.
watchEffect((onCleanup) => {
  if (scrollMode.value !== 'page' || barMode.value !== 'js') return
  const root = document.documentElement
  let raf = 0
  let last = NaN
  const tick = () => {
    const vv = window.visualViewport
    const bottom = vv ? vv.offsetTop + vv.height : window.innerHeight
    if (bottom !== last) {
      last = bottom
      root.style.setProperty('--vv-bottom', `${bottom}px`)
    }
    raf = requestAnimationFrame(tick)
  }
  tick()
  onCleanup(() => {
    cancelAnimationFrame(raf)
    root.style.removeProperty('--vv-bottom')
  })
})

watch([mode, blurShield, scrollMode, barMode], async () => {
  const url = new URL(location.href)
  url.searchParams.set('h', mode.value)
  url.searchParams.set('shield', blurShield.value ? '1' : '0')
  url.searchParams.set('scroll', scrollMode.value)
  url.searchParams.set('bar', barMode.value)
  history.replaceState(null, '', url)
  await nextTick()
  measure()
})

// Ruler ticks every 10% of the rect height, across the 200% tall content.
const ticks = Array.from({ length: 20 }, (_, i) => (i + 1) * 10)
</script>

<template>
  <main ref="rectEl" class="screen">
    <div ref="scrollerEl" class="scroller">
      <div ref="contentEl" class="content">
        <DebugPanel
          v-model:mode="mode"
          v-model:blur-shield="blurShield"
          v-model:scroll-mode="scrollMode"
          v-model:bar-mode="barMode"
          :env="env"
          :metrics="metrics"
          :events="events"
          :last-event="lastEvent"
        />
        <div class="ruler" aria-hidden="true">
          <div
            v-for="t in ticks"
            :key="t"
            class="tick"
            :class="{ major: scrollMode === 'inner' && t % 50 === 0 }"
            :style="{ bottom: `${100 - t / 2}%` }"
          >
            <span>{{ t }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Overlay pinned to the rectangle (does not scroll with the content). -->
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
  </main>

  <!--
    Workaround for the iOS 27 top blur: WebKit hides it when a position:fixed box with a background,
    ≥ ~90% wide and > 10px tall, sits at the very top. Darker red so it never fakes coverage.
  -->
  <div v-if="blurShield" class="blur-shield" aria-hidden="true"></div>

  <!-- Blue bar = where a fixed bottom footer has to sit: directly above the (animated) Safari controls. -->
  <div v-if="scrollMode === 'page' && barMode !== 'off'" ref="barEl" class="bottom-bar" aria-hidden="true">
    <strong>fixed bottom bar (LIQUIDO footer) · {{ barMode }}</strong>
    <span v-if="metrics?.bar && metrics.units.dvh != null">
      bar bottom {{ +metrics.bar.bottom.toFixed(1) }}px · 100dvh {{ +metrics.units.dvh.toFixed(1) }}px · innerHeight
      {{ metrics.window.innerHeight }}px
    </span>
  </div>
</template>

<style scoped>
.scroller {
  position: absolute;
  inset: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.content {
  position: relative;
  box-sizing: border-box;
  height: 200%;
  /* Below the status bar inset; clear of notch sides and home indicator. */
  padding: calc(var(--sat) + 12px) max(12px, var(--sar)) calc(var(--sab) + 12px) max(12px, var(--sal));
}

.content > :deep(.panel) {
  z-index: 1;
}

/* Scroll ruler in the right gutter: a short tick every 10% of the rect height; in the inner-scroll mode also a full-width line every 50%. */
.ruler {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
/* Lines are drawn above their position so the 200% tick cannot overflow the content box. */
.tick {
  position: absolute;
  right: 0;
  width: calc(var(--sar) + 30px);
  border-bottom: 1px solid rgb(255 255 255 / 0.8);
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
}

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

.blur-shield {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 12px;
  z-index: 100;
  background: #b30000;
  pointer-events: none;
}
</style>
