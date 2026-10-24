<script setup lang="ts">
import { computed, ref } from 'vue'
import { STATUS_BAR_STYLES, type StatusBarStyle } from '../composables/useSettings'
import { BAR_MODES, HEIGHT_MODES, type BarMode, type HeightMode, type Metrics } from '../composables/useViewportMetrics'
import type { EnvInfo } from '../lib/environment'

type Status = 'ok' | 'bad' | 'info'
interface Row {
  label: string
  value: string
  status?: Status
}
interface Section {
  title: string
  open: boolean
  rows: Row[]
}

const props = defineProps<{
  env: EnvInfo
  metrics: Metrics | null
  events: Record<string, number>
  lastEvent: string
  /** 'page' = the document scrolls (index.html), 'inner' = the rect scrolls its content (inner.html). */
  view: 'page' | 'inner'
}>()
const mode = defineModel<HeightMode>('mode', { required: true })
const blurShield = defineModel<boolean>('blurShield', { required: true })
const statusBar = defineModel<StatusBarStyle>('statusBar', { default: 'black-translucent' })
// Bottom bar strategy (both views have the bar).
const barMode = defineModel<BarMode>('barMode', { default: 'bottom0' })

const TOLERANCE = 1 // px – unit values can be fractional (e.g. 873.67)

const px = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? 'n/a' : `${+n.toFixed(2)}px`)
const size = (w: number, h: number) => `${+w.toFixed(2)} × ${+h.toFixed(2)}`
const near = (a: number, b: number) => Math.abs(a - b) < TOLERANCE
const signed = (n: number) => `${n > 0 ? '+' : ''}${+n.toFixed(2)}px`
// The Summary box exists in the page view only; the inner view keeps the original wording and layout.
const pageMode = computed(() => props.view === 'page')
const displayLabel = (d: string) => (pageMode.value && d === 'standalone' ? 'home screen app' : d)
const PAGE_ONLY_SECTIONS = ['Summary']
const yesNo = (b: boolean | undefined) => (b === undefined ? 'undefined' : b ? 'yes' : 'no')

const verdict = computed(() => {
  const m = props.metrics
  if (!m?.rect) return null
  const target = m.window.innerHeight
  const delta = m.rect.height - target
  const fills = near(delta, 0) && near(m.rect.top, 0)
  const screenDelta = m.screen.heightOriented - m.rect.height
  return {
    fills,
    headline: fills
      ? `✓ Fills the viewport exactly: ${px(m.rect.height)}`
      : `✗ Rect ${px(m.rect.height)} vs viewport ${px(target)} (${signed(delta)}, top ${px(m.rect.top)})`,
    screenLine: near(screenDelta, 0)
      ? `✓ = screen height ${px(m.screen.heightOriented)} (true full screen)`
      : `screen ${px(m.screen.heightOriented)} − rect = ${px(screenDelta)} owned by browser UI / system bars`,
  }
})

const sections = computed<Section[]>(() => {
  const m = props.metrics
  const e = props.env
  if (!m) return []
  const vv = m.visualViewport
  const r = m.rect
  const bar = m.bar
  const docOverflow = m.window.scrollHeight - m.window.clientHeight
  const unitRow = (label: string, v: number | null): Row => ({
    label,
    value: v == null ? 'not supported' : px(v),
    status: v != null && near(v, m.window.innerHeight) ? 'ok' : 'info',
  })
  // The content is at least 200 % of the rect; it grows beyond that when the debug panel is taller (never overflows).
  const contentIs200 = r ? near(r.contentHeight, 2 * r.height) : false
  const contentGrew = r ? r.contentHeight > 2 * r.height + TOLERANCE : false

  const all: Section[] = [
    {
      title: 'Summary',
      open: true,
      rows: [
        { label: 'browser', value: e.browser },
        { label: 'iOS major', value: e.iosMajor == null ? 'n/a' : String(e.iosMajor) },
        {
          label: 'display-mode',
          value: displayLabel(e.displayMode),
          status: e.displayMode === 'standalone' ? 'ok' : undefined,
        },
        { label: 'window.scrollY', value: px(m.window.scrollY) },
        {
          label: 'visualVP scale',
          value: vv ? `${+vv.scale.toFixed(3)}${vv.scale !== 1 ? ' (zoomed!)' : ''}` : 'n/a',
          status: vv && vv.scale !== 1 ? 'bad' : undefined,
        },
      ],
    },
    {
      title: 'Verdict',
      open: true,
      rows: r
        ? [
            { label: 'rect height', value: px(r.height) },
            {
              label: 'vs innerHeight',
              value: `${px(m.window.innerHeight)} (${signed(r.height - m.window.innerHeight)})`,
              status: near(r.height, m.window.innerHeight) ? 'ok' : 'bad',
            },
            {
              label: 'vs visualViewport',
              value: vv ? `${px(vv.height)} (${signed(r.height - vv.height)})` : 'n/a',
              status: vv ? (near(r.height, vv.height) ? 'ok' : 'bad') : 'info',
            },
            {
              label: 'vs screen height',
              value: `${px(m.screen.heightOriented)} (${signed(r.height - m.screen.heightOriented)})`,
              status: near(r.height, m.screen.heightOriented) ? 'ok' : 'info',
            },
            {
              label: 'rect top / bottom',
              value: `${px(r.top)} / ${px(r.bottom)}`,
              status: near(r.top, 0) && near(r.bottom, m.window.innerHeight) ? 'ok' : 'bad',
            },
            pageMode.value
              ? {
                  label: 'document scroll range',
                  value: `${px(docOverflow)} (expected ≈ ${px(r.contentHeight - m.window.clientHeight)}: content − viewport)`,
                  status: near(docOverflow, r.contentHeight - m.window.clientHeight) ? 'ok' : 'bad',
                }
              : {
                  label: 'page scrollable by',
                  value: docOverflow > 0 ? `${px(docOverflow)} (rect taller than viewport)` : '0px',
                  status: docOverflow > 0 ? 'bad' : 'ok',
                },
            {
              label: 'content / rect',
              value: `${+((r.contentHeight / r.height) * 100).toFixed(1)}% (${px(r.contentHeight)})${
                contentGrew ? ' — grew: the panel is taller than 200%, all of it stays reachable' : ''
              }`,
              status: contentIs200 ? 'ok' : contentGrew ? 'info' : 'bad',
            },
          ]
        : [],
    },
    {
      title: 'Environment',
      open: true,
      rows: [
        { label: 'device (guess)', value: e.modelGuess },
        { label: 'browser', value: e.browser },
        { label: 'engine', value: e.engine },
        { label: 'iOS major', value: e.iosMajor == null ? 'n/a' : `${e.iosMajor} — ${e.iosMajorNote}` },
        { label: 'display-mode', value: displayLabel(e.displayMode) },
        { label: 'nav.standalone', value: yesNo(e.navigatorStandalone) },
        { label: 'Home Screen app', value: yesNo(e.isHomeScreenApp), status: e.isHomeScreenApp ? 'ok' : 'info' },
        { label: 'status-bar-style meta', value: `${statusBar.value} (iOS reads it when the icon is added)` },
        { label: 'platform / touch', value: `${e.platform} / ${e.maxTouchPoints}${e.isIPadDesktopUA ? ' (iPad, desktop UA)' : ''}` },
        { label: 'user agent', value: e.userAgent },
      ],
    },
    {
      title: 'Safe area — env(safe-area-inset-*)',
      open: true,
      rows: [
        {
          label: 'top',
          value: m.safeArea.top > 0 ? `${px(m.safeArea.top)} — drawn under status bar` : '0px — below status bar / no notch',
        },
        {
          label: 'bottom',
          value: m.safeArea.bottom > 0 ? `${px(m.safeArea.bottom)} — drawn under home indicator` : '0px — toolbar below / no indicator',
        },
        { label: 'left / right', value: `${px(m.safeArea.left)} / ${px(m.safeArea.right)}` },
        {
          label: 'max-inset t/r/b/l',
          value: m.safeAreaMax
            ? [m.safeAreaMax.top, m.safeAreaMax.right, m.safeAreaMax.bottom, m.safeAreaMax.left].map(px).join(' ')
            : 'not supported',
        },
      ],
    },
    {
      title: 'CSS units (✓ = innerHeight)',
      open: true,
      rows: [
        unitRow('100vh', m.units.vh),
        unitRow('100svh', m.units.svh),
        unitRow('100lvh', m.units.lvh),
        unitRow('100dvh', m.units.dvh),
        unitRow('fill-available', m.units.fillAvailable),
        unitRow('fixed top0 bottom0', m.units.fixedInset0),
        {
          label: 'lvh − svh',
          value: m.units.lvh != null && m.units.svh != null ? `${px(m.units.lvh - m.units.svh)} (collapsible toolbars)` : 'n/a',
        },
      ],
    },
    {
      title: 'Blue bottom bar (above the Safari controls)',
      open: false,
      rows: bar
        ? [
            { label: 'strategy', value: `${BAR_MODES[barMode.value].label}: ${BAR_MODES[barMode.value].description}` },
            { label: 'bar top / bottom', value: `${px(bar.top)} / ${px(bar.bottom)}` },
            ...(r
              ? [
                  {
                    label: 'scroll end clearance',
                    value: `content padding-bottom ${px(r.contentPaddingBottom)} vs bar ${px(bar.height)}`,
                    status: (r.contentPaddingBottom >= bar.height ? 'ok' : 'bad') as Status,
                  },
                ]
              : []),
            {
              label: 'bar height',
              value: `${px(bar.height)} = 56px + ${px(m.safeArea.bottom)} inset (padding)`,
              status: near(bar.height, 56 + m.safeArea.bottom) ? 'ok' : 'bad',
            },
            {
              label: 'bar bottom − 100dvh',
              value: signed(bar.bottom - (m.units.dvh ?? NaN)),
              status: m.units.dvh != null && near(bar.bottom, m.units.dvh) ? 'ok' : 'bad',
            },
            {
              label: 'bar bottom − vv bottom',
              value: vv ? signed(bar.bottom - (vv.offsetTop + vv.height)) : 'n/a',
              status: vv ? (near(bar.bottom, vv.offsetTop + vv.height) ? 'ok' : 'bad') : 'info',
            },
            { label: 'bar bottom − innerHeight', value: signed(bar.bottom - m.window.innerHeight) },
            { label: '100svh / 100lvh', value: `${px(m.units.svh)} / ${px(m.units.lvh)}` },
            { label: 'collapsed now by', value: m.units.lvh != null ? px(m.units.lvh - (m.units.dvh ?? m.units.lvh)) : 'n/a' },
            { label: 'safe-area bottom', value: px(m.safeArea.bottom) },
          ]
        : [{ label: 'bar', value: 'off' }],
    },
    {
      title: 'iOS 27 top blur',
      open: e.expectTopBlur,
      rows: [
        { label: 'expected here', value: e.expectTopBlur ? 'yes (iOS ≥ 27 or frozen UA)' : 'no' },
        { label: 'Reduce Transp.', value: m.reduceTransparency },
        { label: 'blur shield', value: blurShield.value ? 'ON (fixed 12px strip at top)' : 'off' },
      ],
    },
    {
      title: 'Viewport',
      open: false,
      rows: [
        { label: 'inner W × H', value: size(m.window.innerWidth, m.window.innerHeight) },
        { label: 'outer W × H', value: size(m.window.outerWidth, m.window.outerHeight) },
        { label: 'html client W × H', value: size(m.window.clientWidth, m.window.clientHeight) },
        { label: 'visualVP W × H', value: vv ? size(vv.width, vv.height) : 'not supported' },
        { label: 'visualVP offset T/L', value: vv ? `${px(vv.offsetTop)} / ${px(vv.offsetLeft)}` : 'n/a' },
        { label: 'visualVP pageTop', value: vv ? px(vv.pageTop) : 'n/a' },
        {
          label: 'visualVP scale',
          value: vv ? `${+vv.scale.toFixed(3)}${vv.scale !== 1 ? ' (zoomed!)' : ''}` : 'n/a',
          status: vv && vv.scale !== 1 ? 'bad' : undefined,
        },
        { label: '@media W × H', value: `${px(m.media.width)} × ${px(m.media.height)}` },
        { label: 'screen − inner', value: `${px(m.screen.heightOriented - m.window.innerHeight)} (UI outside page)` },
      ],
    },
    {
      title: 'Screen / device',
      open: false,
      rows: [
        { label: 'screen W × H', value: size(m.screen.width, m.screen.height) },
        { label: 'avail W × H', value: size(m.screen.availWidth, m.screen.availHeight) },
        { label: 'height (oriented)', value: px(m.screen.heightOriented) },
        { label: 'devicePixelRatio', value: String(m.screen.dpr) },
        {
          label: 'physical px',
          value: `${Math.round(m.screen.width * m.screen.dpr)} × ${Math.round(m.screen.height * m.screen.dpr)}`,
        },
        { label: 'orientation', value: m.orientationType },
        { label: '@media device-W', value: px(m.media.deviceWidth) },
        { label: '@media device-H', value: px(m.media.deviceHeight) },
      ],
    },
    {
      title: 'Rectangle & document',
      open: false,
      rows: [
        { label: 'scroll container', value: pageMode.value ? 'document (html)' : 'inside the rect' },
        { label: 'height mode', value: `${HEIGHT_MODES[mode.value].label}: ${HEIGHT_MODES[mode.value].description}` },
        { label: 'rect W × H', value: r ? size(r.width, r.height) : 'n/a' },
        { label: 'rect scrollTop', value: r ? px(r.scrollTop) : 'n/a' },
        { label: 'scrollH / clientH', value: r ? `${px(r.scrollHeight)} / ${px(r.clientHeight)}` : 'n/a' },
        { label: 'overflow html/body', value: `${m.overflow.html} / ${m.overflow.body}` },
        { label: 'window.scrollY', value: px(m.window.scrollY) },
        { label: 'doc scrollH/clientH', value: `${px(m.window.scrollHeight)} / ${px(m.window.clientHeight)}` },
      ],
    },
    {
      title: 'Events',
      open: false,
      rows: [
        ...Object.entries(props.events).map(([label, count]) => ({ label, value: String(count) })),
        { label: 'last event', value: props.lastEvent },
        { label: 'last measured', value: m.measuredAt },
      ],
    },
  ]
  return pageMode.value ? all : all.filter((sec) => !PAGE_ONLY_SECTIONS.includes(sec.title))
})

// The two views are two pages; the links keep the shared settings.
const heightModes = computed(
  () =>
    Object.entries(HEIGHT_MODES).filter(([key]) => pageMode.value || key !== 'fixed') as [
      HeightMode,
      (typeof HEIGHT_MODES)[HeightMode],
    ][],
)

function viewHref(file: string) {
  const url = new URL(file, location.href)
  url.search = location.search
  return url.href
}

const copyState = ref('Copy JSON')

async function copyJson() {
  const text = JSON.stringify(
    {
      settings: { view: props.view, mode: mode.value, blurShield: blurShield.value, statusBarStyle: statusBar.value, bar: barMode.value },
      env: props.env,
      metrics: props.metrics,
      events: props.events,
    },
    null,
    2,
  )
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Clipboard API needs a secure context; plain http on the LAN falls back to execCommand.
    const area = Object.assign(document.createElement('textarea'), { value: text, readOnly: true })
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
  copyState.value = 'Copied ✓'
  setTimeout(() => (copyState.value = 'Copy JSON'), 1500)
}

function reload() {
  location.reload()
}
</script>

<template>
  <div class="panel">
    <div v-if="verdict" class="verdict" :class="{ fail: !verdict.fills }">
      <strong>{{ verdict.headline }}</strong>
      <span>{{ verdict.screenLine }}</span>
    </div>

    <div class="box controls">
      <div class="row">
        <select v-model="mode" aria-label="Height mode">
          <option v-for="[key, m] in heightModes" :key="key" :value="key">{{ m.label }}</option>
        </select>
        <button type="button" @click="copyJson">{{ copyState }}</button>
        <button type="button" @click="reload">Reload</button>
      </div>
      <small>{{ HEIGHT_MODES[mode].description }}</small>
      <nav class="views" aria-label="View">
        scroll:
        <strong v-if="pageMode">page scrolls (native top fade)</strong>
        <a v-else :href="viewHref('index.html')">page scrolls (native top fade)</a>
        ·
        <strong v-if="!pageMode">rect scrolls inside (blue bg)</strong>
        <a v-else :href="viewHref('inner.html')">rect scrolls inside (blue bg)</a>
      </nav>
      <label class="check">
        status bar
        <select v-model="statusBar" aria-label="Status bar style">
          <option v-for="s in STATUS_BAR_STYLES" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
      <small>
        apple-mobile-web-app-status-bar-style: iOS only reads it when the icon is added to the Home Screen: pick a value,
        delete the old icon, add it again (the URL keeps the choice, the icon launches without it). No effect in a Safari tab.
      </small>
      <label class="check">
        blue bar
        <select v-model="barMode" aria-label="Blue bottom bar strategy">
          <option v-for="(b, key) in BAR_MODES" :key="key" :value="key">{{ b.label }}</option>
        </select>
      </label>
      <label class="check">
        <input v-model="blurShield" type="checkbox" />
        iOS 27 blur shield (fixed strip at top)
      </label>
      <small class="legend">
        <template v-if="!pageMode"><span class="swatch gap"></span>blue = NOT covered by rect · </template><span class="swatch edge"></span>rect edges ·
        <span class="swatch safe"></span>safe area
        <template v-if="pageMode">
          · <span class="swatch" style="background: red"></span>html bg · <span class="swatch" style="background: darkred"></span>theme-color
          · <span class="swatch" style="background: darkgrey"></span>.content
        </template>
      </small>
    </div>

    <div class="sections">
      <details v-for="section in sections" :key="section.title" class="box" :open="section.open">
        <summary>{{ section.title }}</summary>
        <dl>
          <template v-for="row in section.rows" :key="row.label">
            <dt>{{ row.label }}</dt>
            <dd :class="row.status">
              <span v-if="row.status === 'ok'" class="badge">✓</span>
              <span v-else-if="row.status === 'bad'" class="badge">✗</span>
              {{ row.value }}
            </dd>
          </template>
        </dl>
      </details>
    </div>
  </div>
</template>

<style scoped>
.panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  /* Gutter for the scroll ruler on the right. */
  margin-right: 30px;
  font: 11px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace;
}

.verdict,
.box {
  background: rgb(0 0 0 / 0.35);
  border-radius: 10px;
  padding: 6px 8px;
}

.verdict {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  border: 2px solid #fff;
}
.verdict.fail {
  border-color: #ffeb3b;
  color: #ffeb3b;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
select {
  flex: 1 1 9em;
  min-width: 0;
}
select,
button {
  /* < 16px makes iOS zoom in on focus, which would skew visualViewport. */
  font: 600 16px/1.2 system-ui, -apple-system, sans-serif;
  color: #000;
  background: #fff;
  border: 0;
  border-radius: 8px;
  padding: 6px 10px;
  touch-action: manipulation;
}
.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
input[type='checkbox'] {
  width: 20px;
  height: 20px;
  margin: 0;
}

.legend {
  opacity: 0.9;
}
.swatch {
  display: inline-block;
  width: 12px;
  height: 8px;
  margin-right: 3px;
  vertical-align: middle;
}
.swatch.gap {
  background: var(--gap);
  outline: 1px solid #fff;
}
.swatch.edge {
  background: var(--edge);
}
.swatch.safe {
  border-top: 2px dashed #fff;
}

/* One column on phones in portrait; 2+ columns in landscape / tablets so it stays within 200%. */
.sections {
  columns: 26em;
  column-gap: 6px;
}
.sections > details {
  break-inside: avoid;
  margin-bottom: 6px;
}

nav.views {
  font-size: 12px;
}
nav.views a {
  color: #fff;
}

summary {
  font-weight: 700;
  cursor: pointer;
  user-select: none;
}

dl {
  display: grid;
  grid-template-columns: fit-content(45%) minmax(0, 1fr);
  gap: 1px 10px;
  margin: 4px 0 0;
}
dt {
  opacity: 0.8;
  overflow-wrap: anywhere;
}
dd {
  margin: 0;
  overflow-wrap: anywhere;
}
dd.bad {
  color: #ffeb3b;
  font-weight: 700;
}
.badge {
  display: inline-block;
  min-width: 1.3em;
  text-align: center;
  border-radius: 4px;
  font-weight: 700;
  background: #fff;
  color: #0a7a1f;
}
dd.bad .badge {
  background: #ffeb3b;
  color: #000;
}
</style>
