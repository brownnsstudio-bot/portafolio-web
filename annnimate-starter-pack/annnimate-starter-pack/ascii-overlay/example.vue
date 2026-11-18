<script setup>
// Demo for AsciiOverlay
//
// Matches the HTML demo: warm-decode character field over a VANTA cycling
// still, revealed as the visitor scrolls.
import AsciiOverlay from './ascii-overlay.vue';
import './ascii-overlay.css';
</script>

<template>
  <AsciiOverlay
    image="https://annnimate.b-cdn.net/preview-assets/vanta/hero_cycling_02.jpg?width=1920"
    :cell-size="8"
    glyphs="1,x,0,X,*,#,@"
    :thresh-low="0.32"
    :thresh-high="0.7"
    :whitening="0.7"
    :opacity="0.9"
    :jitter="0.35"
    :reshuffle-rate="0.6"
    :detail-thresh="0.1"
    :detail-strength="1"
    :char-gap="0.3"
  />
</template>
