<template>
  <header class="app-header">HEADER</header>
</template>

<style scoped>
/*
  Fixed header: top: 0, white, content centered. In a Home Screen app the status bar area (and the iOS 27 blur) lies over it:
  the header grows by env(safe-area-inset-top) and its content starts below the inset.
*/
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 45;
  box-sizing: border-box;
  height: var(--header-total);
  /* the inset is padding, so the white background also covers the area under the status bar */
  padding: var(--sat) var(--sar) 0 var(--sal);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #1b3a5c;
  font: 700 20px/1 system-ui, -apple-system, sans-serif;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 0 rgb(0 0 0 / 0.08);
}
</style>
