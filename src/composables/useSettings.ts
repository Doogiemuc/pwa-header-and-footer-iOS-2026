import { nextTick, ref, watch, watchEffect } from 'vue'
import { isBarMode, isHeightMode, type BarMode, type HeightMode } from './useViewportMetrics'

export type View = 'page' | 'inner'

/**
 * Settings shared by both views. They live in the URL so a reload (there is no reload button in a Home Screen
 * app) or a shared link keeps them: ?h=<height mode>&shield=0|1&bar=<bar strategy> (bar: page view only).
 */
export function useSettings(view: View, onChange: () => void) {
  const params = new URLSearchParams(location.search)

  const initialHeight = params.get('h')
  // `position: fixed` rect cannot scroll the document, so it only exists in the inner-scroll view.
  const mode = ref<HeightMode>(
    isHeightMode(initialHeight) && !(view === 'page' && initialHeight === 'fixed') ? initialHeight : 'dvh',
  )
  const blurShield = ref(params.get('shield') === '1')
  const initialBar = params.get('bar')
  const barMode = ref<BarMode>(isBarMode(initialBar) ? initialBar : 'bottom0')

  watchEffect(() => {
    const root = document.documentElement
    root.dataset.heightMode = mode.value
    if (view === 'page') root.dataset.bar = barMode.value
  })

  // 'js' bar strategy: the Safari toolbar animates for ~0.3 s without reliable resize events, so read the
  // visual viewport on every frame and publish its bottom edge as a CSS variable.
  if (view === 'page') {
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
  }

  watch([mode, blurShield, barMode], async () => {
    const url = new URL(location.href)
    url.searchParams.set('h', mode.value)
    url.searchParams.set('shield', blurShield.value ? '1' : '0')
    if (view === 'page') url.searchParams.set('bar', barMode.value)
    history.replaceState(null, '', url)
    await nextTick()
    onChange()
  })

  return { mode, blurShield, barMode }
}
