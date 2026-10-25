# Mobile screen height POC (Vue 3 + Vite) — state `v4.0`

A proof of concept for laying out a full-height mobile web app (header at the top, footer at the bottom, scrolling content between)
that behaves on **iOS Safari, Firefox on iOS and as an iOS Home Screen web app** (iOS 27). It measures everything that influences
"screen height" and shows it in a debug panel.

> **Audience:** a coding session that wants to apply this layout to a mobile web app of its own. This README only contains the
> learnings and results of the current state (`v4.0`); older states are tagged `v1.0`–`v3.0`. Evidence labels:
> **[device]** = observed by the owner on a real iPhone 16 Pro (402×874 @3x, iOS 27.0.1) · **[sources]** = third-party reports, no official
> Apple docs · **[untested]** = implemented here, not yet confirmed on a device.
> The owner leans towards the **"Inner DIV scrolls"** variant (`/inner.html`).

## 1. The layout to copy

Two pages show two ways to scroll. Both have the same header, footer and content; the structure is deliberately minimal:

| Page | URL | Who scrolls | DOM |
| --- | --- | --- | --- |
| **Full Page scrolls** | `/` | the document: native iOS top fade, Safari toolbars collapse | `main.screen` › `div.content` (+ fixed header, fixed footer) |
| **Inner DIV scrolls** | `/inner.html` | an inner container: the document never scrolls, toolbars keep their size | `main.screen` › `div.scroller` › `div.content` (+ fixed header, fixed footer) |

```css
:root { --header-h: 56px; --footer-h: 56px; }
html  { background: #fff; }                          /* canvas colour: see 2.4 */

.screen { position: relative; height: 100vh; height: 100dvh; }   /* the screen-high container */
@media (display-mode: standalone) { .screen { height: 100lvh; } } /* Home Screen app: see 3 */

.header { position: fixed; top: 0; left: 0; right: 0; z-index: 45; box-sizing: border-box; background: #fff;
          height: calc(var(--header-h) + env(safe-area-inset-top));
          padding-top: env(safe-area-inset-top); }      /* padding: the white also covers the status bar area */
.footer { position: fixed; bottom: 0; left: 0; right: 0; z-index: 40; box-sizing: border-box;
          height: calc(var(--footer-h) + env(safe-area-inset-bottom));
          padding-bottom: env(safe-area-inset-bottom); } /* padding, not margin: the footer colour fills it */

.content { box-sizing: border-box; min-height: 100%;     /* min-height, not height: see 2.5 */
           padding-top:    calc(var(--header-h) + env(safe-area-inset-top)    + 12px);
           padding-bottom: calc(var(--footer-h) + env(safe-area-inset-bottom) + 12px); } /* last content can leave the footer */

/* Inner DIV variant only: the document must not scroll */
.screen { overflow: hidden; }
.scroller { position: absolute; inset: 0; overflow-y: auto; }
```

Plus `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` (real `env(safe-area-inset-*)` values).
See `src/style.css`, `src/components/AppHeader.vue`, `src/components/BottomBar.vue` and `src/views/*.vue` for the working code.
Page background of the POC: `--app-gradient: radial-gradient(120% 70% at 50% 10%, #ffffff 0%, #eef5fc 45%, #dbe8f6 100%)` on `#app`
(inner page) or `.content` (page scroll; there the document is taller than `#app`, the gradient must sit on the element that spans the whole
scrollable area). `html` stays white.

## 2. Learnings (Safari / Firefox tab)

1. **Viewport units** **[device]** (Safari, toolbars expanded): `innerHeight` = `100dvh` = `visualViewport.height` = 710, `100svh` = 710.33,
   `100vh` = `100lvh` = 748.33. So `100vh` / `lvh` is **38px taller than the visible area** and hides the bottom behind the toolbar.
   Use `dvh` (fallback `vh`). In the Inner DIV page the document never scrolls, so toolbars don't collapse and `dvh` = `svh` there.
   On the Full Page page `dvh` changes while the toolbars collapse (the rect resizes); `svh` would stay constant (not compared on the phone).
2. **Footer: plain `position: fixed; bottom: 0`, nothing else.** **[device]** In Safari it sits exactly on top of the floating controls and follows
   their shrink/grow animation without jumping; in Firefox it is placed correctly (it jumps to the very bottom while scrolling, acceptable).
   Do **not** position it with `top: calc(100dvh − h)` or from JS (`visualViewport` per frame): both run on the main thread and visibly
   lag/jump while the toolbar animates. **[device]**
3. **`safe-area-inset-bottom`: Safari reports 0, Firefox on iOS 34px, the Home Screen app 34px.** **[device]** Add it as **padding** to the
   footer (not margin), otherwise the screen's rounded corners cut off the footer's corners. (Applied; checked in Chrome emulation, not
   re-checked in Firefox on the phone since. **[untested]**)
4. **The `html` background is the canvas colour and shows everywhere the document has no content:** in the status bar zone above the
   document, i.e. behind the iOS blur, and in rubber-band overscroll. **[device]** Set `html` to the colour you want there (white here). The
   content's own background does not reach that zone. A `theme-color` that differs from `html` is another colour source for browser chrome:
   keep it equal (white); we saw red in the Firefox pull-down area while red layers were still present, fixed by removing all red
   (**[untested]** on the phone since).
5. **Content that must be at least N tall: `min-height`, not `height`.** With `height: 200%` taller children overflowed the content box and drew
   over the bare `html` background (a red band in the POC) and the document grew past it.
6. **Reserve the footer's height as bottom padding of the scrollable content**, otherwise the last content can never be scrolled out from behind
   the fixed footer (in the POC the last two debug boxes were completely hidden at maximum scroll). Verified in Chrome emulation at 402×710
   (18px gap above the footer). **[untested]** on the phone.
7. **Header: `position: fixed; top: 0`, white, height = content + `env(safe-area-inset-top)` as padding.** Works in Safari and Firefox tabs
   **[device]**; in a tab the inset is 0, so it is just a 56px bar. Behaviour as Home Screen app: see 3. **[untested]**
8. **Full Page scrolls vs Inner DIV scrolls:** Full Page gives the native iOS top fade (content fades out behind clock/battery), but the Safari toolbars
   collapse and `dvh` moves. Inner DIV keeps the bottom iOS controls **at a constant size** because the root never scrolls **[device]**, but the
   scrolling content is clipped at the top of the viewport (no native fade under the status bar; an opaque header makes that moot).
9. **`apple-mobile-web-app-*` meta tags** (the only ones on Apple's [Supported Meta Tags](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html)
   page: `viewport`, `format-detection`, `apple-mobile-web-app-capable` (`yes` = full-screen web app, detect with `navigator.standalone`),
   `apple-mobile-web-app-status-bar-style` = `default` / `black` / `black-translucent`, **no effect unless capable = `yes`**).
   `apple-mobile-web-app-title`, `mobile-web-app-capable`, `theme-color` are not on that page. The status-bar style is only read when the
   icon is added to the Home Screen (delete and re-add the icon after changing it). The POC's head: viewport (above), `format-detection: telephone=no`,
   both `*-capable` = `yes`, status-bar style `black-translucent` (selectable in the panel; the owner's Home Screen tests used `default`),
   `theme-color: white`, `apple-touch-icon`, `manifest.webmanifest` (`display: standalone`, white colours).
10. **iOS version from the UA:** Safari 26+ freezes the OS token (`iPhone OS 18_7`); the real version is in `Version/27.0.1`. Use
    `max(OS, Version)`. Firefox/Chrome on iOS have no `Version` token. `resize` / `scroll` / `visualViewport` events fire hundreds of times while the
    toolbar animates: never run expensive work per event.

## 3. Home Screen app (standalone)

* **The large iOS 27 top blur only exists here**, not in a Safari/Firefox tab (tab: small blur, as high as the top iOS controls). **[device]**
  `safe-area-inset-top` = **62px**, bottom = **34px**; the page is drawn under the status bar even with `apple-mobile-web-app-status-bar-style: default`. **[device]**
* **iOS starts the Home Screen app with a STALE viewport.** **[device]** At launch `innerHeight` = `100dvh` = `100svh` = `html.clientHeight` = **812**
  (= 874 − 62) while the screen is 874 and `100lvh` is already 874; a footer positioned with `100dvh` sits 62px too high with a white strip below it
  until the first scroll/pull makes `innerHeight` / `dvh` jump to 874 (`html.clientHeight` stays 812).
* **Fix, standalone only: `@media (display-mode: standalone) { .screen { height: 100lvh } }`.** There are no collapsing toolbars in a Home Screen app,
  so `lvh` is the true full height from the first frame. The footer stays plain `bottom: 0`. **[device: works]** Side effect: the rect (874) is taller than
  the stale layout viewport (812), so the document can scroll by 62px (it already could after the first pull).
* **Blur area:** the blur height cannot be reduced and the space is not usable for content. A fixed, wide, coloured strip at the top ("blur shield")
  only turns the blur area into one coloured area (no extra usable height). **[device]** Use the area with the fixed white header whose padding covers
  `safe-area-inset-top` (the blur then sits over white): header in the Home Screen app **[untested]**. (The earlier `v3.0` solution without a
  header was +10px content padding below the inset: **[device: works]**.) Reduce Transparency in iOS removes the veil. **[sources]**

## 4. Tried and rejected

* Footer placed with `top: calc(100dvh − h)`, with JS (`visualViewport` every frame), or with `top: calc(100lvh − h)`: lags/jumps or not needed.
* "Blur shield" strip at the top (twice), a red top strip to colour the status bar zone in the inner page: no gain.
* `100vh` / `100lvh` in a tab: too tall (38px). `-webkit-fill-available`, `height: 100%`, JS `innerHeight`: available as modes in the panel, not better.
* Reference site `de.ra.co` (read-only analysis): page scroll, fixed 60px header + sticky stack with hard-coded `top` values, **no footer**, no `viewport-fit`, no
  safe-area usage, no `dvh/svh/lvh`, `theme-color` black with a black header. It avoids the bottom-edge problem by having nothing at the bottom.

## 5. Still to test

- [ ] The fixed header **in the Home Screen app** (blur over white, content below it, `lvh` rect, footer).
- [ ] Firefox on iOS: footer with the 34px padding; record `innerHeight` / units / insets (*Copy JSON*); Firefox Home Screen app.
- [ ] `apple-mobile-web-app-status-bar-style` `default` / `black` / `black-translucent` in the Home Screen app (re-add the icon each time).
- [ ] Last content scrolls above the footer on the phone; pull-down colour in Firefox after removing all red.
- [ ] Landscape (side insets, footer, `innerHeight`); iPad.

## 6. Run and test

```bash
npm install
npm run dev        # listens on the LAN (any Host header allowed): open the "Network" URL on the phone
npm run build      # type-check + production build into dist/
npm run preview    # serve dist/ on the LAN
```

> **iOS Safari caches very aggressively** (HTML, JS, CSS, manifest, icons, even with the dev server). A normal reload often does *not* show code changes.
> Open the URL in a **new private tab** to really get the latest version; the panel's *Reload* button is not enough. For a Home Screen app delete
> the icon and add it again (also needed for the status-bar style). When a value looks like "the old code", suspect the cache first.

Phone and Mac on the same Wi-Fi (or a tunnel). Test matrix: iOS Safari tab · Firefox on iOS tab (a WKWebView shell: same WebKit, own toolbars and
insets) · Home Screen app (Share → *Add to Home Screen*, keep *Open as Web App* on).

## 7. The debug tooling

Settings live in the URL (so *Reload* keeps them, there is no reload button in a Home Screen app): `?h=<height mode>&sb=<status bar style>&bar=<footer strategy>`.
*Copy JSON* copies all measurements for comparing devices. A round button at the top right (100px below the top) switches between the two pages.

* **Verdict:** rect height vs `innerHeight` / `visualViewport.height` / screen height (in the Home Screen app the screen height), rect top/bottom,
  document scroll range, content ≥ 200 % (it grows when the debug panel is taller), a "viewport vs screen" row that shows the stale launch viewport.
* **Summary** (browser, iOS major, display-mode, scroll position, pinch-zoom scale) and **Mobile HTML tags** (live values of the `<head>` tags, checked against Apple's page).
* **Yellow lines:** top/bottom edge of the rectangle; a yellow line "footer top at scroll 0" on the footer's top edge before scrolling; a dashed white line inside the
  footer where the safe-area padding starts (the footer's 3rd text line shows the measured inset); dashed black lines for the insets; a black ruler in the right gutter
  (ticks every 10 % of the rect height). The rectangle itself has no colour.
* **Height modes** (select): `dvh` (default), `svh`, `lvh`, `vh`, `percent`, `fill` (`-webkit-fill-available`), `js` (`innerHeight`), `fixed` (inner page only).
  **Footer strategies** (`?bar=`): `bottom0` (default), `dvh`, `js`, `off`. In the Home Screen app the default `dvh` height mode is overridden by `100lvh`.
* Measured live (events + 500 ms polling): `screen.*`, `devicePixelRatio`, `window.inner/outer*`, `documentElement.client*`, `visualViewport.*`, probe elements for
  `100vh/svh/lvh/dvh`, `env(safe-area-inset-*)` and `-max-inset-*`, media queries, `prefers-reduced-transparency`, scroll state, an event counter.

Files: `index.html` + `src/views/PageScrollView.vue` (Full Page) · `inner.html` + `src/views/InnerScrollView.vue` (Inner DIV) · `src/components/`
(`AppHeader`, `BottomBar`, `DebugPanel`, `ScrollRuler`, `EdgeOverlay`, `FooterLine`, `ViewSwitch`) · `src/composables/` (`useSettings`, `useViewportMetrics`) ·
`src/lib/environment.ts` (browser / iOS version / Home Screen detection) · `src/style.css` (shared variables, `.screen`, `.content`, height modes) ·
`public/manifest.webmanifest` · `scripts/make-icons.mjs` (`npm run icons`).
