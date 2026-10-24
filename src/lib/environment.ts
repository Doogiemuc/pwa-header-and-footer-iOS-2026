/**
 * Static facts about the device / browser / launch mode.
 *
 * Caveats baked into the logic:
 *  - Safari 26+ freezes the OS token in the UA ("iPhone OS 18_7") while `Version/27.0` stays real,
 *    so the iOS major version is the max of both tokens.
 *  - Third-party iOS browsers (Firefox "FxiOS", Chrome "CriOS", …) are WKWebView shells: same WebKit,
 *    but their own toolbars and their own web-view insets.
 *  - A Home Screen web app runs in Apple's web-app runtime, no matter which browser added it.
 *  - iPadOS Safari sends a desktop ("Macintosh") UA; it is detected via touch points.
 */

export type DisplayMode =
  | 'fullscreen'
  | 'standalone'
  | 'minimal-ui'
  | 'browser'
  | 'window-controls-overlay'
  | 'picture-in-picture'
  | 'unknown'

export interface EnvInfo {
  userAgent: string
  platform: string
  maxTouchPoints: number
  isIOS: boolean
  isIPadDesktopUA: boolean
  isAndroid: boolean
  /** e.g. "Safari 27.0", "Firefox 145.1", "Home Screen web app" */
  browser: string
  /** Browser family key, handy for styling / branching. */
  browserKey: 'safari' | 'firefox' | 'chrome' | 'edge' | 'opera' | 'duckduckgo' | 'webview' | 'other'
  engine: string
  uaOsVersion: string | null
  uaSafariVersion: string | null
  /** Best guess of the iOS / iPadOS major version (null when not iOS or unknown). */
  iosMajor: number | null
  iosMajorNote: string
  displayMode: DisplayMode
  /** iOS-only legacy flag, undefined elsewhere. */
  navigatorStandalone: boolean | undefined
  isHomeScreenApp: boolean
  /** True when the iOS 27 top blur veil is expected (iOS 27+ or a frozen UA we cannot rule out). */
  expectTopBlur: boolean
  /** Model guess from CSS screen size + DPR (portrait). */
  modelGuess: string
}

const DISPLAY_MODES: DisplayMode[] = [
  'fullscreen',
  'standalone',
  'minimal-ui',
  'window-controls-overlay',
  'picture-in-picture',
  'browser',
]

export function currentDisplayMode(): DisplayMode {
  return DISPLAY_MODES.find((m) => matchMedia(`(display-mode: ${m})`).matches) ?? 'unknown'
}

/** CSS-pixel portrait screen sizes → models. Pure heuristic, several models share a size. */
const MODELS: Record<string, string> = {
  '320x568@2': 'iPhone SE (1st gen) / 5s',
  '375x667@2': 'iPhone SE (2nd/3rd gen) / 6–8',
  '414x736@3': 'iPhone 6–8 Plus',
  '375x812@3': 'iPhone X / XS / 11 Pro / 12 mini / 13 mini',
  '414x896@2': 'iPhone XR / 11',
  '414x896@3': 'iPhone XS Max / 11 Pro Max',
  '390x844@3': 'iPhone 12 / 13 / 14 / 16e',
  '428x926@3': 'iPhone 12 / 13 Pro Max, 14 Plus',
  '393x852@3': 'iPhone 14 Pro / 15 / 15 Pro / 16',
  '430x932@3': 'iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus',
  '402x874@3': 'iPhone 16 Pro / 17 / 17 Pro',
  '440x956@3': 'iPhone 16 Pro Max / 17 Pro Max',
  '420x912@3': 'iPhone Air',
  '744x1133@2': 'iPad mini (6th gen+)',
  '768x1024@2': 'iPad (older) / iPad mini 5',
  '810x1080@2': 'iPad (7th–9th gen)',
  '820x1180@2': 'iPad Air (4th gen+) / iPad (10th gen+)',
  '834x1194@2': 'iPad Pro 11" (1st–4th gen)',
  '834x1210@2': 'iPad Pro 11" (M4+)',
  '1024x1366@2': 'iPad Pro 12.9"',
  '1032x1376@2': 'iPad Pro 13" (M4+)',
}

function guessModel(isIOS: boolean): string {
  const w = Math.min(screen.width, screen.height)
  const h = Math.max(screen.width, screen.height)
  const key = `${w}x${h}@${Math.round(devicePixelRatio)}`
  if (!isIOS) return `unknown (${key})`
  return MODELS[key] ? `${MODELS[key]} (${key})` : `unknown iOS device (${key})`
}

function majorOf(v: string | null): number | null {
  if (!v) return null
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

export function detectEnvironment(): EnvInfo {
  const ua = navigator.userAgent
  const platform = navigator.platform ?? ''
  const maxTouchPoints = navigator.maxTouchPoints ?? 0

  const isIPadDesktopUA = /Macintosh/.test(ua) && maxTouchPoints > 1
  const isIOS = /iPhone|iPad|iPod/.test(ua) || isIPadDesktopUA
  const isAndroid = /Android/.test(ua)

  const uaOsVersion = ua.match(/(?:iPhone )?OS (\d+(?:_\d+)*) like Mac OS X/)?.[1]?.replace(/_/g, '.') ?? null
  const uaSafariVersion = ua.match(/Version\/(\d+(?:\.\d+)*)/)?.[1] ?? null

  const displayMode = currentDisplayMode()
  const navigatorStandalone = (navigator as Navigator & { standalone?: boolean }).standalone
  const isHomeScreenApp =
    navigatorStandalone === true || displayMode === 'standalone' || displayMode === 'fullscreen'

  // --- browser ---
  const pick = (re: RegExp) => ua.match(re)?.[1] ?? ''
  let browser: string
  let browserKey: EnvInfo['browserKey']
  if (/FxiOS\//.test(ua)) [browser, browserKey] = [`Firefox (iOS) ${pick(/FxiOS\/([\d.]+)/)}`, 'firefox']
  else if (/CriOS\//.test(ua)) [browser, browserKey] = [`Chrome (iOS) ${pick(/CriOS\/([\d.]+)/)}`, 'chrome']
  else if (/EdgiOS\//.test(ua)) [browser, browserKey] = [`Edge (iOS) ${pick(/EdgiOS\/([\d.]+)/)}`, 'edge']
  else if (/OPiOS\/|OPT\//.test(ua)) [browser, browserKey] = ['Opera (iOS)', 'opera']
  else if (/DuckDuckGo\/|Ddg\//.test(ua)) [browser, browserKey] = ['DuckDuckGo', 'duckduckgo']
  else if (/FBAN|FBAV|Instagram|Line\/|Twitter|LinkedInApp/.test(ua))
    [browser, browserKey] = ['In-app browser (WKWebView)', 'webview']
  else if (isIOS && isHomeScreenApp) [browser, browserKey] = ['Home Screen web app (WebKit)', 'safari']
  else if (isIOS && /Safari\//.test(ua) && uaSafariVersion) [browser, browserKey] = [`Safari ${uaSafariVersion}`, 'safari']
  else if (isIOS) [browser, browserKey] = ['WKWebView (unknown app)', 'webview']
  else if (/Firefox\//.test(ua)) [browser, browserKey] = [`Firefox ${pick(/Firefox\/([\d.]+)/)}`, 'firefox']
  else if (/Edg\//.test(ua)) [browser, browserKey] = [`Edge ${pick(/Edg\/([\d.]+)/)}`, 'edge']
  else if (/Chrome\//.test(ua)) [browser, browserKey] = [`Chrome ${pick(/Chrome\/([\d.]+)/)}`, 'chrome']
  else if (/Safari\//.test(ua)) [browser, browserKey] = [`Safari ${uaSafariVersion ?? ''}`, 'safari']
  else [browser, browserKey] = ['unknown', 'other']

  const engine = isIOS
    ? 'WebKit (all iOS browsers)'
    : /Firefox\//.test(ua)
      ? 'Gecko'
      : /Chrome\//.test(ua)
        ? 'Blink'
        : /AppleWebKit/.test(ua)
          ? 'WebKit'
          : 'unknown'

  // --- iOS major version ---
  let iosMajor: number | null = null
  let iosMajorNote = 'not iOS'
  let frozenAndUnknown = false
  if (isIOS) {
    const fromOs = isIPadDesktopUA ? null : majorOf(uaOsVersion)
    const fromSafari = majorOf(uaSafariVersion)
    iosMajor = Math.max(fromOs ?? 0, fromSafari ?? 0) || null
    iosMajorNote = `max(OS token ${uaOsVersion ?? '–'}, Version token ${uaSafariVersion ?? '–'})`
    // Frozen OS token (18.6+) without a Version token: WebKit features tell us it is at least 26.
    if (!fromSafari && fromOs === 18 && CSS.supports('anchor-name: --probe')) {
      iosMajor = 26
      iosMajorNote = `UA frozen at ${uaOsVersion}; WebKit ≥ 26 detected via CSS anchor positioning → "26+"`
      frozenAndUnknown = true
    }
  }

  return {
    userAgent: ua,
    platform,
    maxTouchPoints,
    isIOS,
    isIPadDesktopUA,
    isAndroid,
    browser,
    browserKey,
    engine,
    uaOsVersion,
    uaSafariVersion,
    iosMajor,
    iosMajorNote,
    displayMode,
    navigatorStandalone,
    isHomeScreenApp,
    expectTopBlur: isIOS && ((iosMajor ?? 0) >= 27 || frozenAndUnknown),
    modelGuess: guessModel(isIOS),
  }
}
