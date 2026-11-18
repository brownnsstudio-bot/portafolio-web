<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText)
}

const props = defineProps({
  // type: Split type for reveal animation (lines | words | chars)
  type: {
    type: String,
    default: 'words'
  },
  // start: ScrollTrigger start position
  start: {
    type: String,
    default: 'top 80%'
  },
  // end: ScrollTrigger end position (for scrubbed animations)
  end: {
    type: String,
    default: ''
  },
  // scrub: Link animation to scroll position (false | true | smoothness number)
  scrub: {
    type: [Boolean, Number, String],
    default: false
  },
  // duration: Animation duration in seconds (0.3-2)
  duration: {
    type: Number,
    default: 0.8
  },
  // ease: GSAP easing function
  ease: {
    type: String,
    default: 'power4.out'
  },
  // stagger: Stagger delay between words/characters (0.01-0.2s)
  stagger: {
    type: Number,
    default: 0.05
  },
  // delay: Delay before animation starts (0-2s)
  delay: {
    type: Number,
    default: 0
  },
  // opacity: Starting opacity value (0-1)
  opacity: {
    type: Number,
    default: 0
  },
  // yPercent: Starting Y position as percentage (-100 to 100)
  yPercent: {
    type: Number,
    default: 100
  },
  // markers: Show ScrollTrigger debug markers
  markers: {
    type: Boolean,
    default: false
  }
})

const containerRef = ref(null)
const textRef = ref(null)

let ctx
let splitInstance = null

function parseScrub(value) {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  const num = parseFloat(value)
  return isNaN(num) ? false : num
}

function buildAnimation() {
  if (ctx) ctx.revert()
  if (splitInstance) {
    splitInstance.revert()
    splitInstance = null
  }

  if (!containerRef.value || !textRef.value) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const typesToSplit =
    props.type === 'lines'
      ? 'lines'
      : props.type === 'words'
        ? 'lines,words'
        : 'lines,words,chars'

  const scrubValue = parseScrub(props.scrub)

  ctx = gsap.context(() => {
    splitInstance = SplitText.create(textRef.value, {
      type: typesToSplit,
      mask: 'lines',
      autoSplit: true,
      linesClass: 'split-line',
      wordsClass: 'split-word',
      charsClass: 'split-char',
      onSplit(instance) {
        const targets = instance[props.type]

        gsap.set(targets, {
          yPercent: props.yPercent,
          opacity: props.opacity,
          force3D: true,
          willChange: 'transform'
        })

        gsap.set(textRef.value, { autoAlpha: 1 })

        return gsap.to(targets, {
          yPercent: 0,
          opacity: 1,
          duration: props.duration,
          stagger: props.stagger,
          ease: props.ease,
          delay: props.delay,
          force3D: true,
          scrollTrigger: {
            trigger: containerRef.value,
            start: props.start,
            end: props.end || undefined,
            scrub: scrubValue,
            once: !scrubValue,
            invalidateOnRefresh: true,
            markers: props.markers
          },
          onComplete() {
            gsap.set(targets, { willChange: 'auto' })
          }
        })
      }
    })
  }, containerRef.value)
}

onMounted(async () => {
  await document.fonts.ready
  buildAnimation()
})

onUnmounted(() => {
  if (splitInstance) {
    splitInstance.revert()
    splitInstance = null
  }
  ctx?.revert()
})

watch(
  () => [props.type, props.start, props.end, props.scrub, props.duration, props.ease, props.stagger, props.delay, props.opacity, props.yPercent, props.markers],
  async () => {
    await document.fonts.ready
    buildAnimation()
  }
)
</script>

<template>
  <div ref="containerRef" class="text_reveal_wrap">
    <div
      ref="textRef"
      class="text_reveal_text"
      data-anm-scroll-text-reveal
      style="visibility: hidden"
    >
      <slot />
    </div>
  </div>
</template>
