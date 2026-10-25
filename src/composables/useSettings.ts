import { nextTick, ref, watch, watchEffect } from 'vue'
import { isBarMode, isHeightMode, type BarMode, type HeightMode } from './useViewportMetrics'

export type View = 'page' | 'inner'

/** Values of <meta name="apple-mobile-web-app-status-bar-style">. iOS reads it when the icon is added to the Home Screen. */
export const STATUS_BAR_STYLES = ['black-translucent', 'default', 'black'] as const
export type StatusBarStyle = (typeof STATUS_BAR_STYLES)[number]
const isStatusBarStyle = (v: unknown): v is StatusBarStyle => STATUS_BAR_STYLES.includes(v as StatusBarStyle)

/**
 * Settings shared by both views. They live in the URL so a reload (there is no reload button in a Home Screen
 * app) or a shared link keeps them: ?h=<height mode>&sb=<status bar style>&bar=<bar strategy>&shield=0|1.
 */
export function useSettings(view: View, onChange: () => void) {
  const params = new URLSearchParams(location.search)

  const initialHeight = params.get('h')
  // `position: fixed` rect cannot scroll the document, so it only exists in the inner-scroll view.
  const mode = ref<HeightMode>(
    isHeightMode(initialHeight) && !(view === 'page' && initialHeight === 'fixed') ? initialHeight : 'dvh',
  )
  // Experiment: fixed strip at the very top (see BlurShield.vue).
  const blurShield = ref(params.get('shield') === '1')
  const initialBar = params.get('bar')
  const barMode = ref<BarMode>(isBarMode(initialBar) ? initialBar : 'bottom0')

  const initialStatusBar = params.get('sb')
  const statusBar = ref<StatusBarStyle>(isStatusBarStyle(initialStatusBar) ? initialStatusBar : 'black-translucent')

  watchEffect(() => {
    // Keep the live <meta> in sync: "Add to Home Screen" picks the value up from the loaded page.
    document
      .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
      ?.setAttribute('content', statusBar.value)
  })

  watchEffect(() => {
    const root = document.documentElement
    root.dataset.heightMode = mode.value
    root.dataset.bar = barMode.value
  })

  // 'js' bar strategy: the Safari toolbar animates for ~0.3 s without reliable resize events, so read the
  // visual viewport on every frame and publish its bottom edge as a CSS variable.
  watchEffect((onCleanup) => {
    if (barMode.value !== 'js') return
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

  watch([mode, barMode, statusBar, blurShield], async () => {
    const url = new URL(location.href)
    url.searchParams.set('h', mode.value)
    url.searchParams.set('sb', statusBar.value)
    url.searchParams.set('bar', barMode.value)
    url.searchParams.set('shield', blurShield.value ? '1' : '0')
    history.replaceState(null, '', url)
    await nextTick()
    onChange()
  })

  return { mode, barMode, statusBar, blurShield }
}
