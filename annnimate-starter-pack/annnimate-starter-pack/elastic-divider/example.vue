<script setup>
import ElasticDivider from './elastic-divider.vue'
import './elastic-divider.css'
</script>

<template>
  <section class="eldv_stage">
    <div class="eldv_container">
      <div class="eldv_block">
        <span class="eldv_label">01 Approach</span>
        <p class="eldv_text">Every frame is strung by hand.</p>
      </div>
      <ElasticDivider
        color="#101010"
        :weight="1"
        :frequency="2.6"
        :damping="0.72"
        :sensitivity="1"
        :max-amplitude="38"
      />
    </div>
  </section>
</template>
