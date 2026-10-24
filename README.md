# Mobile screen height POC (Vue 3 + Vite)

One job: a **red rectangle that is exactly as high as the screen**, with live debug info about every
measurement that influences "screen height" on mobile — especially iOS Safari, Firefox on iOS and
iOS Home Screen web apps (including the iOS 27 top blur).

The content inside the rectangle is **200 %** of its height and scrolls (ruler on the right).
Two pages, one per scroll behaviour (the panel links between them and keeps the settings):

| Page | URL | Who scrolls | DOM |
| --- | --- | --- | --- |
| **page scrolls** | `/` (`index.html`) | the document (native iOS top fade, Safari toolbars collapse) | `main.screen` › `div.content` (+ fixed footer) |
| **rect scrolls inside** | `/inner.html` | the rectangle itself (document never scrolls, toolbars keep their size) | `main.screen` › `div.scroller` › `div.content` (+ fixed footer) |

The extra `scroller` layer in the inner page exists only so the yellow edge overlay stays pinned to the rectangle instead of
scrolling away. Old links with `?scroll=inner` on `/` redirect to `/inner.html`.

## Findings for the LIQUIDO / POLLY refactor

> **Audience:** this section is written for another coding session that will apply the same layout to the LIQUIDO and POLLY
> apps. It is updated as testing on a real device continues. Evidence labels: **[device]** = observed by the owner on a real
> iPhone 16 Pro, iOS 27.0.1; **[sources]** = third-party reports, no official Apple docs; **[untested]** = implemented here
> but not yet confirmed on a device. Everything else in this README is the tooling, not the findings.

### Recipe that worked (open `/` in this POC to see it)

1. `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
2. **Let the document scroll.** No inner scroll container, no `overflow: hidden` on `html`/`body`. Then the iOS 27 top fade
   works natively: content fades out behind the clock / Wi-Fi / battery. **[device]**
3. **`html` background = the colour that should appear under the status bar** (here red). Safari 26+ fills that area from the
   page background. In the first version `html` and `theme-color` were blue and that blue showed as a bar at the top while the
   red content scrolled "under" it; after making `html` red and removing `theme-color` the bar was gone. **[device]**
   (We changed both at once, so we don't know which of the two was the cause.) Don't set `theme-color` unless you want the tint.
4. **Fixed footer in plain CSS, nothing else:**
   ```css
   .footer {
     position: fixed; left: 0; right: 0; bottom: 0;
     box-sizing: border-box;
     height: calc(var(--footer-h) + env(safe-area-inset-bottom));
     padding-bottom: env(safe-area-inset-bottom); /* padding, not margin: the footer background fills it */
   }
   ```
   * Safari: sits exactly on top of the floating controls and follows their shrink/grow animation without jumping. **[device]**
   * Do **not** position it with `top: calc(100dvh - h)` or from JS (`visualViewport` per frame): both run on the main thread and
     visibly lag/jump while the toolbar animates. **[device]**
   * Firefox on iOS: footer is placed correctly and jumps to the very bottom while scrolling (acceptable). **[device]**
     Firefox reports `safe-area-inset-bottom` = 34px (Safari reports 0), so without the padding the screen's rounded corners cut
     off the footer corners. The padding fix is implemented. **[untested]** on the phone since the fix.
5. Give the page content `padding-bottom: calc(var(--footer-h) + env(safe-area-inset-bottom))` so the last content isn't hidden
   behind the footer. **[untested]** (the POC content is test filler, it doesn't do this).

### Device facts (iPhone 16 Pro, 402×874 @3x, iOS 27.0.1)

| Value | Safari (controls expanded) | Firefox on iOS |
| --- | --- | --- |
| UA | `iPhone OS 18_7` (frozen) + `Version/27.0.1` | `FxiOS`, OS token frozen too |
| `screen` / `outerHeight` | 874 | 874 |
| `innerHeight` = `100dvh` = `visualViewport.height` | 710 | not recorded |
| `100svh` | 710.33 | not recorded |
| `100vh` = `100lvh` | 748.33 (38px more than visible) | not recorded |
| `env(safe-area-inset-*)` | all 0 | bottom 34px (others not recorded) |

* `100vh`/`lvh` is **38px taller than the visible area** while the controls are expanded: don't size layouts with it.
* `viewport-fit=cover` did not give Safari a non-zero top inset: the layout viewport starts below the status bar; the area behind
  it is only filled with the page background (and shows scrolled content when the document scrolls).
* While the toolbar animates, `resize` / `scroll` / `visualViewport.resize` fire hundreds of times (a test session logged 609
  scroll events). Never run expensive work (e.g. `matchMedia` searches, layout reads) per event.

### Traps and what we tried

* **Inner scroll container** (`/inner.html`, "rect scrolls inside"): the bottom iOS controls then **don't change size**
  because the root never scrolls **[device]**, but content is clipped at the top of the viewport and can't scroll under the status
  bar (no native fade), and the area under the status bar shows the page background. Use it only if stable toolbars matter more
  than the fade.
* A fixed red strip at the top (to make that area red in inner mode, based on a WebKit heuristic from **[sources]**) was tried and
  removed again on request; it is not in the code.
* iOS version from the UA: Safari 26+ freezes the OS token (`18_7`); the real version is in `Version/x`. Use `max(OS, Version)`.
  Firefox/Chrome on iOS have no `Version` token.
* The iOS 27.0.1 top blur is much smaller than early reports (62px inset + 38px veil, home-screen app **[sources]**): no extra top
  clearance is needed in Safari. **[device]** The optional "blur shield" strip is unnecessary there.
* Reference site (`de.ra.co`, analysed read-only): page scroll, **fixed 60px header** (`position: fixed; top: 0`) plus a sticky stack
  below it with hard-coded px `top` values, **no fixed footer**, no `viewport-fit=cover`, no `env(safe-area-inset-*)`, no
  `dvh/svh/lvh`, `theme-color=#000` with a black header. It avoids the whole bottom-edge problem by having nothing at the bottom.

### Still to test (update as we go)

- [ ] Layer-colour test on `/` (Safari tab, Firefox, Home Screen): which colour shows where (status bar area, behind the toolbars,
  overscroll, under the footer); does `theme-color` darkred differ visibly from the red `html` background, and in which case?
- [ ] `apple-mobile-web-app-status-bar-style` `default` / `black` / `black-translucent` in the Home Screen app (re-add the icon each time):
  top inset, content under the status bar, colour of the bar.
- [ ] Firefox on iOS: footer after the 34px padding fix; record `innerHeight` / units / insets (Copy JSON).
- [ ] Safari Home Screen app (standalone): top / bottom insets, does the footer sit on the home indicator, top blur, status bar.
- [ ] Firefox Home Screen app.
- [ ] Landscape (side insets, footer, `innerHeight`).
- [ ] iPad.

## Run

```bash
npm install
npm run dev        # listens on the LAN, open the "Network" URL on the phone
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ on the LAN
```

> **iOS Safari caches very aggressively** (HTML, JS, CSS, manifest, icons, even with the dev server). A normal reload often does
> *not* show code changes. To really get the latest version, open the URL in a **new private tab/window** (it starts without any
> cache). The panel's *Reload* button is not enough. For a Home Screen app, delete the icon and add it again (also needed for the
> status-bar style). When a measured value looks like "the old code", suspect the cache first.

Phone and Mac must be on the same Wi-Fi. Use the `Network:` URL Vite prints (e.g. `http://192.168.x.x:5173`).

### Test matrix

| Where | How |
| --- | --- |
| iOS Safari | open the URL |
| Firefox on iOS | open the URL (Firefox is a WKWebView shell: same WebKit, own toolbars and insets) |
| Home Screen app | Safari or Firefox → Share → *Add to Home Screen* (iOS 26+: keep *Open as Web App* on) → start from the icon |

`apple-mobile-web-app-status-bar-style` is only read when the icon is added: after changing it, delete and re-add the icon.
The panel has a **status bar** select (`black-translucent` (default), `default`, `black`; URL `?sb=`) that rewrites the live
`<meta>`; pick a value, then add the icon. The launched icon doesn't carry the URL, so the panel shows the *selected* value, not
necessarily what the installed icon was created with.

**Layer-colour test** (`/` only): `html` background red, `<meta name="theme-color" content="darkred">` (normally it would equal the
background; deliberately different to see where it shows), `.content` dark grey (covers the whole document, so no red should be
visible inside it). The web manifest uses `background_color: red` / `theme_color: darkred` to match. `/inner.html` has no `theme-color`
and no `.content` colour.

## How to read the screen

* **Blue** (`/inner.html` only; on `/` the page background is red) = page background. Any blue you see is area the
  red rectangle does **not** cover (also visible during rubber-band overscroll). There is no `theme-color` meta on purpose.
* **Yellow lines** = top and bottom edge of the rectangle.
* **White dashed lines** = `env(safe-area-inset-top / -bottom)`.
* **Verdict** box: rect height vs `innerHeight`, `visualViewport.height` and screen height, rect top/bottom,
  whether the page can scroll (rect too tall), and whether the content really is 200 %.

Settings are kept in the URL (`?h=dvh&shield=1`, plus `&bar=bottom0` on `/`), so *Reload* (there is no reload button in a
Home Screen app) keeps them. *Copy JSON* copies all values for comparing devices.

## Blue bottom bar (both pages) and Summary box (`/` only)

* **Summary** box at the top (`/` only): browser, iOS major, display-mode (`standalone` is shown as "home screen app"),
  `window.scrollY`, `visualViewport.scale` (yellow alert when zoomed).
* **Blue bar** (56px, `position: fixed`, component `BottomBar.vue`, on **both** pages): where a fixed bottom footer has to sit,
  exactly above the floating Safari controls, which shrink while scrolling. Its label doubles as a status line (bar bottom,
  `100dvh`, `innerHeight`). Strategies (select `blue bar`, URL `?bar=`):
  `bottom0` (default: plain CSS `position: fixed; bottom: 0`, placed by the browser, no JS), `dvh`
  (`top: calc(100dvh - 56px)`) and `js` (`visualViewport.offsetTop + height`, written every frame; both run on the main
  thread and visibly lag/jump while the toolbar animates), `off`. The "Blue bottom bar" section shows bar bottom minus `100dvh`,
  `visualViewport` and `innerHeight`: ✓ = the bar ends exactly at the visible bottom edge.
* The bar's height is `56px + env(safe-area-inset-bottom)`; the inset is **padding**, so the blue background fills the area
  under the home indicator / rounded screen corners (Firefox on iOS reports 34px, Safari 0px). The label stays in the 56px above it.
* The full-width grey lines in the ruler are not drawn on `/` (they are on `/inner.html`).

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

* `index.html` + `src/main-page.ts` + `src/views/PageScrollView.vue`: the **page scrolls** page (rectangle, content, blue bottom bar and its CSS)
* `inner.html` + `src/main-inner.ts` + `src/views/InnerScrollView.vue`: the **rect scrolls inside** page
* `src/components/`: `ScrollRuler`, `EdgeOverlay`, `BlurShield`, `BottomBar` (shared by both pages)
* `src/composables/useSettings.ts`: URL-persisted settings (height mode, blur shield, bar strategy)
* `src/components/DebugPanel.vue`: verdict, settings, debug tables
* `src/composables/useViewportMetrics.ts`: all measurements, height modes
* `src/lib/environment.ts`: browser / iOS version / Home Screen detection, model guess
* `public/manifest.webmanifest`: Home Screen app manifest (colours follow the layer test)
* `src/style.css`: shared safe-area variables, `.screen` / `.content`, height-mode rules (view-specific CSS lives in the views)
* `scripts/make-icons.mjs`: generates the PNG icons (`npm run icons`)
