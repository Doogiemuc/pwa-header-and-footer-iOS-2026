import { onBeforeUnmount, onMounted, reactive, ref, shallowRef, type Ref } from 'vue'

export const HEIGHT_MODES = {
  dvh: { label: '100dvh (default)', description: 'dynamic viewport, follows the browser toolbars (fallback 100vh)' },
  svh: { label: '100svh', description: 'small viewport = toolbars expanded' },
  lvh: { label: '100lvh', description: 'large viewport = toolbars collapsed' },
  vh: { label: '100vh', description: 'legacy unit, equals lvh on iOS' },
  percent: { label: 'height: 100%', description: 'html, body, #app and rect at 100% (initial containing block)' },
  fill: { label: '-webkit-fill-available', description: 'old iOS Safari hack on html, body, #app and rect' },
  js: { label: 'JS innerHeight', description: 'height = window.innerHeight px, updated on every resize' },
  fixed: { label: 'fixed; inset: 0', description: 'position: fixed with top/right/bottom/left 0, no height' },
} as const

export type HeightMode = keyof typeof HEIGHT_MODES
export type ScrollMode = 'page' | 'inner'

/** Strategies for the blue bar that must sit exactly on top of the floating Safari controls (default: bottom0). */
export const BAR_MODES = {
  bottom0: {
    label: 'fixed; bottom: 0 (CSS only)',
    description: 'plain position: fixed; bottom: 0. No JS, placed by the browser itself, so it cannot lag',
  },
  dvh: { label: 'top = 100dvh − bar', description: 'CSS, but re-evaluated on the main thread: may lag while the toolbar animates' },
  js: { label: 'JS visualViewport', description: 'top from visualViewport, written every frame: main thread, may lag' },
  off: { label: 'off', description: 'no bar' },
} as const
export type BarMode = keyof typeof BAR_MODES
export function isBarMode(value: unknown): value is BarMode {
  return typeof value === 'string' && value in BAR_MODES
}

export function isHeightMode(value: unknown): value is HeightMode {
  return typeof value === 'string' && value in HEIGHT_MODES
}

export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

export interface Metrics {
  measuredAt: string
  isLandscape: boolean
  orientationType: string
  screen: {
    width: number
    height: number
    availWidth: number
    availHeight: number
    /** screen.height for the current orientation (iOS never swaps width/height). */
    heightOriented: number
    dpr: number
  }
  window: {
    innerWidth: number
    innerHeight: number
    outerWidth: number
    outerHeight: number
    clientWidth: number
    clientHeight: number
    scrollY: number
    scrollHeight: number
  }
  visualViewport: {
    width: number
    height: number
    offsetTop: number
    offsetLeft: number
    pageTop: number
    scale: number
  } | null
  /** Measured heights of probe elements; null = unit not supported. */
  units: {
    vh: number | null
    svh: number | null
    lvh: number | null
    dvh: number | null
    fillAvailable: number | null
    fixedInset0: number
  }
  safeArea: Insets
  /** env(safe-area-max-inset-*), null when unsupported. */
  safeAreaMax: Insets | null
  /** Integer values found by binary-searching media queries; null = feature unsupported. */
  media: {
    deviceWidth: number | null
    deviceHeight: number | null
    width: number | null
    height: number | null
  }
  rect: {
    top: number
    bottom: number
    width: number
    height: number
    scrollTop: number
    scrollHeight: number
    clientHeight: number
    contentHeight: number
  } | null
  bar: { top: number; bottom: number; height: number } | null
  overflow: { html: string; body: string }
  reduceTransparency: string
}

const VIEWPORT_UNITS = ['vh', 'svh', 'lvh', 'dvh'] as const

interface Probes {
  host: HTMLElement
  units: Record<(typeof VIEWPORT_UNITS)[number], HTMLElement | null>
  fill: HTMLElement | null
  fixedInset0: HTMLElement
  safe: HTMLElement
  safeMax: HTMLElement
}

/**
 * Invisible probe elements inside a zero-sized position:fixed host, so none of them can make the
 * document scrollable (that would falsify the overflow test).
 */
function createProbes(): Probes {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none'
  const make = (css: string) => {
    const el = document.createElement('div')
    el.style.cssText = css
    host.appendChild(el)
    return el
  }
  const unitProbe = (unit: string) =>
    CSS.supports('height', `100${unit}`) ? make(`position:absolute;top:0;left:0;width:1px;height:100${unit}`) : null

  const probes: Probes = {
    host,
    units: { vh: unitProbe('vh'), svh: unitProbe('svh'), lvh: unitProbe('lvh'), dvh: unitProbe('dvh') },
    fill: CSS.supports('height', '-webkit-fill-available')
      ? make('position:fixed;top:0;left:0;width:1px;height:-webkit-fill-available')
      : null,
    fixedInset0: make('position:fixed;top:0;bottom:0;left:0;width:1px'),
    safe: make(
      'position:absolute;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)',
    ),
    // Negative fallback = "this env() variable does not exist".
    safeMax: make(
      'position:absolute;margin:env(safe-area-max-inset-top,-1px) env(safe-area-max-inset-right,-1px) env(safe-area-max-inset-bottom,-1px) env(safe-area-max-inset-left,-1px)',
    ),
  }
  document.body.appendChild(host)
  return probes
}

function readInsets(el: HTMLElement, prop: 'padding' | 'margin'): Insets {
  const cs = getComputedStyle(el)
  return {
    top: parseFloat(cs.getPropertyValue(`${prop}-top`)),
    right: parseFloat(cs.getPropertyValue(`${prop}-right`)),
    bottom: parseFloat(cs.getPropertyValue(`${prop}-bottom`)),
    left: parseFloat(cs.getPropertyValue(`${prop}-left`)),
  }
}

const mediaCache = new Map<string, number | null>()

/**
 * Largest integer N for which `(min-<feature>: Npx)` matches. ~14 matchMedia calls per search, so the
 * result is cached per feature + `key` (the viewport size): scroll events must stay cheap.
 */
function mediaPx(feature: string, key: string): number | null {
  const cacheKey = `${feature}@${key}`
  const hit = mediaCache.get(cacheKey)
  if (hit !== undefined) return hit
  const value = searchMediaPx(feature)
  mediaCache.set(cacheKey, value)
  return value
}

function searchMediaPx(feature: string): number | null {
  const matches = (n: number) => matchMedia(`(min-${feature}: ${n}px)`).matches
  if (!matches(0)) return null
  let lo = 0
  let hi = 16384
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (matches(mid)) lo = mid
    else hi = mid - 1
  }
  return lo
}

function reduceTransparency(): string {
  if (matchMedia('(prefers-reduced-transparency: reduce)').matches) return 'reduce'
  if (matchMedia('(prefers-reduced-transparency: no-preference)').matches) return 'no-preference'
  return 'not supported'
}

export function useViewportMetrics(
  rectEl: Ref<HTMLElement | null>,
  scrollerEl: Ref<HTMLElement | null>,
  contentEl: Ref<HTMLElement | null>,
  barEl: Ref<HTMLElement | null>,
) {
  const metrics = shallowRef<Metrics | null>(null)
  const events = reactive<Record<string, number>>({})
  const lastEvent = ref('–')

  let probes: Probes | null = null
  let frame = 0
  let interval = 0
  const cleanups: Array<() => void> = []

  function measure() {
    frame = 0
    if (!probes) return
    const root = document.documentElement
    // Feed the "js" height mode before reading anything back.
    root.style.setProperty('--js-inner-height', `${window.innerHeight}px`)

    const height = (el: HTMLElement | null) => (el ? el.getBoundingClientRect().height : null)
    const safeMax = readInsets(probes.safeMax, 'margin')
    const isLandscape = matchMedia('(orientation: landscape)').matches
    const orientationKey = isLandscape ? 'landscape' : 'portrait'
    const viewportKey = `${window.innerWidth}x${window.innerHeight}`
    const vv = window.visualViewport
    const rect = rectEl.value
    const scroller = scrollerEl.value
    const content = contentEl.value
    const box = rect?.getBoundingClientRect()
    const bar = barEl.value?.getBoundingClientRect()

    metrics.value = {
      measuredAt: new Date().toLocaleTimeString(),
      isLandscape,
      orientationType: screen.orientation?.type ?? (isLandscape ? 'landscape' : 'portrait'),
      screen: {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        heightOriented: isLandscape
          ? Math.min(screen.width, screen.height)
          : Math.max(screen.width, screen.height),
        dpr: window.devicePixelRatio,
      },
      window: {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
        clientWidth: root.clientWidth,
        clientHeight: root.clientHeight,
        scrollY: window.scrollY,
        scrollHeight: (document.scrollingElement ?? root).scrollHeight,
      },
      visualViewport: vv
        ? {
            width: vv.width,
            height: vv.height,
            offsetTop: vv.offsetTop,
            offsetLeft: vv.offsetLeft,
            pageTop: vv.pageTop,
            scale: vv.scale,
          }
        : null,
      units: {
        vh: height(probes.units.vh),
        svh: height(probes.units.svh),
        lvh: height(probes.units.lvh),
        dvh: height(probes.units.dvh),
        fillAvailable: height(probes.fill),
        fixedInset0: probes.fixedInset0.getBoundingClientRect().height,
      },
      safeArea: readInsets(probes.safe, 'padding'),
      safeAreaMax: safeMax.top < 0 ? null : safeMax,
      media: {
        deviceWidth: mediaPx('device-width', orientationKey),
        deviceHeight: mediaPx('device-height', orientationKey),
        width: mediaPx('width', viewportKey),
        height: mediaPx('height', viewportKey),
      },
      rect:
        box && scroller && content
          ? {
              // Document coordinates: stays 0 / innerHeight while the page scrolls under the status bar.
              top: box.top + window.scrollY,
              bottom: box.bottom + window.scrollY,
              width: box.width,
              height: box.height,
              scrollTop: scroller.scrollTop,
              scrollHeight: scroller.scrollHeight,
              clientHeight: scroller.clientHeight,
              contentHeight: content.getBoundingClientRect().height,
            }
          : null,
      bar: bar ? { top: bar.top, bottom: bar.bottom, height: bar.height } : null,
      overflow: {
        html: getComputedStyle(root).overflowY,
        body: getComputedStyle(document.body).overflowY,
      },
      reduceTransparency: reduceTransparency(),
    }
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(measure)
  }

  function listen(target: EventTarget | null | undefined, type: string, label = type) {
    if (!target) return
    const handler = () => {
      events[label] = (events[label] ?? 0) + 1
      lastEvent.value = `${label} @ ${new Date().toLocaleTimeString()}`
      schedule()
    }
    target.addEventListener(type, handler, { passive: true })
    cleanups.push(() => target.removeEventListener(type, handler))
  }

  onMounted(() => {
    probes = createProbes()
    listen(window, 'resize', 'window.resize')
    listen(window, 'orientationchange', 'window.orientationchange')
    listen(window, 'scroll', 'window.scroll')
    listen(window, 'pageshow', 'window.pageshow')
    listen(window.visualViewport, 'resize', 'visualViewport.resize')
    listen(window.visualViewport, 'scroll', 'visualViewport.scroll')
    listen(screen.orientation, 'change', 'screen.orientation.change')
    listen(matchMedia('(display-mode: standalone)'), 'change', 'display-mode.change')
    listen(scrollerEl.value, 'scroll', 'rect.scroll')
    // Toolbar animations do not always fire events; poll as a safety net (directly, since
    // requestAnimationFrame pauses in background tabs).
    interval = window.setInterval(measure, 500)
    measure()
  })

  onBeforeUnmount(() => {
    cleanups.forEach((fn) => fn())
    cancelAnimationFrame(frame)
    clearInterval(interval)
    probes?.host.remove()
  })

  return { metrics, events, lastEvent, measure: schedule }
}
