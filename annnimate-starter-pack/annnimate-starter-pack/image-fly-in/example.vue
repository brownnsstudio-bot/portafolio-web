<script setup>
import ImageFlyIn from './image-fly-in.vue'
import './image-fly-in.css'
</script>

<template>
  <!-- The ambient depth loop plays immediately (matches the "scroll-cover" preview template). The headline reveal plays on mount since the section fills
       the first viewport. -->
  <ImageFlyIn />
</template>
