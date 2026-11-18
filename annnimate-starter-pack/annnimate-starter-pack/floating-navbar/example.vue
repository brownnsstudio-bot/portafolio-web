<script setup>
import { ref } from 'vue'
import FloatingNavbar from './floating-navbar.vue'
import './floating-navbar.css'

const bodyEl = ref(null)
</script>

<template>
  <div class="fnb_page">
    <FloatingNavbar
      :threshold="80"
      :duration="0.42"
      ease="annnimate"
      mode="toggle"
      :offset="12"
      mark="K"
      :hide-start="bodyEl"
    />

    <section class="fnb_hero">
      <img
        class="fnb_hero_img"
        src="https://annnimate.b-cdn.net/preview-assets/vanta/hero_run_01.jpg?width=2400&format=auto"
        alt="Runner mid-stride in a shaft of light"
        decoding="async"
      />
      <div class="fnb_hero_scrim" aria-hidden="true"></div>
      <h1 class="fnb_hero_title">Run the long way</h1>
    </section>

    <section ref="bodyEl" class="fnb_body" data-anm-fnb-hide-start>
      <p class="fnb_text">Built for the early miles and the last ones. Every pair is tested on the same loop, in every weather.</p>

      <figure class="fnb_media fnb_media_wide">
        <img
          class="fnb_media_img"
          src="https://annnimate.b-cdn.net/preview-assets/vanta/environment_track_02.jpg?width=1600&format=auto"
          alt="Lane lines curving across a red running track"
          decoding="async"
        />
      </figure>

      <figure class="fnb_media fnb_media_tall">
        <img
          class="fnb_media_img"
          src="https://annnimate.b-cdn.net/preview-assets/vanta/product_shoe_04.jpg?width=1200&format=auto"
          alt="Running shoe with a coral midsole floating on grey"
          decoding="async"
        />
      </figure>
    </section>
  </div>
</template>
