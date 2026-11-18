<script setup>
import EchoHeadline from './echo-headline.vue'
import './echo-headline.css'
</script>

<template>
  <div class="eh_page">
    <div class="eh_cover"><p class="eh_hint">Scroll down</p></div>
    <EchoHeadline
      text="Endurance"
      :copies="8"
      :depth="1"
      :rotate-x="20"
      :rotate-y="20"
      :rotate-z="0"
      fade="opacity"
      trigger="scrub"
      :scrub="0.5"
      :hold="0.2"
      :once="false"
    />
    <div class="eh_cover"></div>
  </div>
</template>
