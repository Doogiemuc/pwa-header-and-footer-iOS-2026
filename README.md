# Mobile screen height POC (Vue 3 + Vite)

One job: a **red rectangle that is exactly as high as the screen**, with live debug info about every
measurement that influences "screen height" on mobile — especially iOS Safari, Firefox on iOS and
iOS Home Screen web apps (including the iOS 27 top blur).

The content inside the rectangle is **200 %** of its height and scrolls (ruler on the right).
The **scroll** switch in the panel chooses who scrolls: the page itself (native iOS top fade) or the rectangle inside.

## Run

```bash
npm install
npm run dev        # listens on the LAN, open the "Network" URL on the phone
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ on the LAN
```

Phone and Mac must be on the same Wi-Fi. Use the `Network:` URL Vite prints (e.g. `http://192.168.x.x:5173`).

### Test matrix

| Where | How |
| --- | --- |
| iOS Safari | open the URL |
| Firefox on iOS | open the URL (Firefox is a WKWebView shell: same WebKit, own toolbars and insets) |
| Home Screen app | Safari or Firefox → Share → *Add to Home Screen* (iOS 26+: keep *Open as Web App* on) → start from the icon |

`apple-mobile-web-app-status-bar-style` is only read when the icon is added: after changing it, delete and re-add the icon.

## How to read the screen

* **Blue** = page background. Any blue you see is area the red rectangle does **not** cover
  (also visible during rubber-band overscroll). `theme-color` is blue too, so browser chrome never fakes red coverage.
* **Yellow lines** = top and bottom edge of the rectangle.
* **White dashed lines** = `env(safe-area-inset-top / -bottom)`.
* **Verdict** box: rect height vs `innerHeight`, `visualViewport.height` and screen height, rect top/bottom,
  whether the page can scroll (rect too tall), and whether the content really is 200 %.

Settings are kept in the URL (`?h=dvh&scroll=page&shield=1`), so *Reload* (there is no reload button in a
Home Screen app) keeps them. *Copy JSON* copies all values for comparing devices.

## Page-scroll mode extras (`scroll=page`, the default)

Only in "page scrolls" mode (the "rect scrolls inside" mode is unchanged):

* **Summary** box at the top: browser, iOS major, display-mode (`standalone` is shown as "home screen app"),
  `window.scrollY`, `visualViewport.scale` (yellow alert when zoomed).
* **Blue bar** (56px, `position: fixed`): where a fixed bottom footer has to sit, exactly above the floating Safari
  controls, which shrink while scrolling. Strategies (select `blue bar`, URL `?bar=`):
  `bottom0` (default: plain CSS `position: fixed; bottom: 0`, placed by the browser, no JS), `dvh`
  (`top: calc(100dvh - 56px)`) and `js` (`visualViewport.offsetTop + height`, written every frame; both run on the main
  thread and visibly lag/jump while the toolbar animates), `off`. The "Blue bottom bar" section shows bar bottom minus `100dvh`,
  `visualViewport` and `innerHeight`: ✓ = the bar ends exactly at the visible bottom edge.
* The bar's height is `56px + env(safe-area-inset-bottom)`; the inset is **padding**, so the blue background fills the area
  under the home indicator / rounded screen corners (Firefox on iOS reports 34px, Safari 0px). The label stays in the 56px above it.
* The full-width grey lines in the ruler are not drawn.

## Height strategies (select in the panel)

| Mode | CSS |
| --- | --- |
| `dvh` (default) | `height: 100vh; height: 100dvh` |
| `svh` / `lvh` / `vh` | `height: 100svh` / `100lvh` / `100vh` |
| `percent` | `html, body, #app, .screen { height: 100% }` |
| `fill` | `-webkit-fill-available` on `html, body, #app, .screen` |
| `js` | `height: <window.innerHeight>px`, updated on every resize |
| `fixed` | `position: fixed; inset: 0` |

The rectangle is in normal flow (except `fixed`), so a rectangle that is too tall makes the page scroll further than
expected: the "document scroll range" / "page scrollable by" row turns red.

## What is taken into account

* `viewport-fit=cover`: the page extends under notch / Dynamic Island / home indicator, so
  `env(safe-area-inset-*)` reports real values. The red rectangle goes edge to edge; the debug content is padded by the insets.
* Home Screen app: `manifest.webmanifest` (`display: standalone`), `apple-mobile-web-app-capable`,
  `black-translucent` status bar (the only way to draw under the status bar = true full screen height), apple-touch-icon.
* Browser / mode detection: `display-mode` media query, `navigator.standalone`, `FxiOS` / `CriOS` / `EdgiOS` UA tokens,
  iPadOS desktop UA (via touch points).
* iOS version: Safari 26+ **freezes the OS token** in the UA (`iPhone OS 18_7`) while `Version/27.0` stays real, so the
  version is `max(OS token, Version token)`. Without a Version token (Firefox/Chrome on iOS) a frozen `18.x` UA plus
  WebKit 26 features is reported as "26+".
* Measured live (events + 500 ms polling): `screen.*`, `devicePixelRatio`, `window.inner/outer*`,
  `documentElement.client*`, `visualViewport.*` (incl. pinch-zoom scale), probe elements for
  `100vh/svh/lvh/dvh`, `-webkit-fill-available`, `position: fixed; top: 0; bottom: 0`, `env(safe-area-inset-*)`,
  `env(safe-area-max-inset-*)`, media queries `device-width/height` and `width/height`,
  `prefers-reduced-transparency`, scroll state of page and rectangle, and an event counter.

### iOS 27 top blur

iOS 27 paints a translucent veil over the top of web content, reaching below the status bar, most visibly in Home
Screen apps. Early community measurements (no official Apple docs) on an iPhone Home Screen app: `safe-area-inset-top` = 62px,
veil fades out at about 100px. **iOS 27.0.1 on an iPhone 16 Pro (tested in Safari): the blur is much smaller; content only
fades above the top edge of the rectangle, under the system bar.** So no extra clearance is reserved any more: content
starts at `safe-area-inset-top` + 12px.

* **Blur shield** (checkbox, off by default): a `position: fixed` 12px strip at the very top. WebKit hides the top
  blur when a fixed/sticky box with a background, ≥ ~90 % wide and > 10px tall, sits at the top edge. The strip is a
  darker red, so it can never hide a gap in the rectangle. Not verified by Apple, so test it on the device.
* Side effect worth knowing: in `fixed` height mode the rectangle itself is such a box.
* The iOS setting *Reduce Transparency* removes the veil; the panel shows `prefers-reduced-transparency` where supported.

Sources: [grappa-irc#2190](https://github.com/vjt/grappa-irc/issues/2190) (measurements),
[milkbox#55](https://github.com/kypflug/milkbox/pull/55) (WebKit heuristic),
[OJapp tips](https://tips.ojapp.app/en/ios-27-pwa-top-blur-workaround-2/) (workarounds).

## Files

* `src/App.vue`: rectangle, 200 % content + ruler, edge overlay, blur shield
* `src/components/DebugPanel.vue`: verdict, settings, debug tables
* `src/composables/useViewportMetrics.ts`: all measurements, height modes
* `src/lib/environment.ts`: browser / iOS version / Home Screen detection, model guess
* `src/style.css`: safe-area variables, height-mode rules, overflow lock
* `scripts/make-icons.mjs`: generates the PNG icons (`npm run icons`)
