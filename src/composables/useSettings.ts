import { nextTick, ref, watch, watchEffect } from 'vue'
import { isHeightMode, type HeightMode } from './useViewportMetrics'

export type View = 'page' | 'inner'

/** Values of <meta name="apple-mobile-web-app-status-bar-style">. iOS reads it when the icon is added to the Home Screen. */
export const STATUS_BAR_STYLES = ['default', 'black-translucent', 'black'] as const
export type StatusBarStyle = (typeof STATUS_BAR_STYLES)[number]
const isStatusBarStyle = (v: unknown): v is StatusBarStyle => STATUS_BAR_STYLES.includes(v as StatusBarStyle)

/**
 * Settings shared by both views. They live in the URL so a reload (there is no reload button in a Home Screen
 * app) or a shared link keeps them: ?h=<height mode>&sb=<status bar style>.
 */
export function useSettings(view: View, onChange: () => void) {
  const params = new URLSearchParams(location.search)

  const initialHeight = params.get('h')
  // `position: fixed` rect cannot scroll the document, so it only exists in the inner-scroll view.
  const mode = ref<HeightMode>(
    isHeightMode(initialHeight) && !(view === 'page' && initialHeight === 'fixed') ? initialHeight : 'dvh',
  )

  const initialStatusBar = params.get('sb')
  const statusBar = ref<StatusBarStyle>(isStatusBarStyle(initialStatusBar) ? initialStatusBar : 'default')

  watchEffect(() => {
    // Keep the live <meta> in sync: "Add to Home Screen" picks the value up from the loaded page.
    document
      .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
      ?.setAttribute('content', statusBar.value)
  })

  watchEffect(() => {
    const root = document.documentElement
    root.dataset.heightMode = mode.value
  })

  watch([mode, statusBar], async () => {
    const url = new URL(location.href)
    url.searchParams.set('h', mode.value)
    url.searchParams.set('sb', statusBar.value)
    history.replaceState(null, '', url)
    await nextTick()
    onChange()
  })

  return { mode, statusBar }
}
