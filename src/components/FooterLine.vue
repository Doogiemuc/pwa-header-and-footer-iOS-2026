<template>
  <!--
    Yellow line that sits exactly on the top edge of the footer while the page is not scrolled. Unlike the footer it is part
    of the scrolling content, so it scrolls away: it shows where the footer started and how far the page has moved since.
    Positioned from the bottom of its container (= the rect, whose height is the visible height at load) minus the footer's
    full height (content + safe-area padding, --bar-total).
  -->
  <div class="footer-line" aria-hidden="true"><span>footer top at scroll 0</span></div>
</template>

<style scoped>
.footer-line {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% - 3px - var(--bar-total, 0px));
  height: 3px;
  background: var(--edge);
  z-index: 3;
  pointer-events: none;
}
/* No footer: the line marks the bottom edge of the rect instead. */
html[data-bar='off'] .footer-line {
  top: calc(100% - 3px);
}
.footer-line span {
  position: absolute;
  left: max(6px, var(--sal));
  bottom: 4px;
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--edge);
  color: #000;
  font: 700 10px/1.2 ui-monospace, Menlo, monospace;
}
</style>
