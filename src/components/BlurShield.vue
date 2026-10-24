<template>
  <!--
    Experiment for the iOS 27 top blur: WebKit reportedly hides it when a position:fixed box with a background,
    ≥ ~90% wide and > 10px tall, sits at the very top. Darker red so it never fakes coverage.
  -->
  <div class="blur-shield" aria-hidden="true"></div>
</template>

<style scoped>
.blur-shield {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 12px;
  z-index: 100;
  background: #b30000;
  pointer-events: none;
}
</style>
