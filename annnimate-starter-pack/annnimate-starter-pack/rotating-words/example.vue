<script setup>
import RotatingWords from './rotating-words.vue'
import './rotating-words.css'

const demoWords = [
  'Sprint', 'Hurdles', 'Long jump', 'High jump', 'Pole vault',
  'Relay', 'Steeplechase', 'Decathlon', 'Cross country', 'Marathon',
]
</script>

<template>
  <div class="rw_page">
    <div class="rw_cover"><p class="rw_hint">Scroll down</p></div>
    <div class="rw_track" data-anm-rw-track>
      <section class="rw_stage">
        <RotatingWords
          class="rw_wheel"
          :words="demoWords"
          :scrub="true"
          :spin="2.4"
          :settle="0.15"
          :step="18"
          :hold="0"
          :snap="false"
          :snap-delay="0.1"
          start="top 75%"
          :once="false"
          :nav="true"
          :blur="8"
        />
      </section>
    </div>
  </div>
</template>
