<script>
// Module scope: defineProps defaults may not reference <script setup> locals.
const DEFAULT_WORDS = [
  'Sprint', 'Hurdles', 'Long jump', 'High jump', 'Pole vault',
  'Relay', 'Steeplechase', 'Decathlon', 'Cross country', 'Marathon',
]
</script>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, CustomEase)
  CustomEase.create('annnimate', 'M0,0 C0.3,0.9 0.1,1 1,1')
  CustomEase.create('annnimateInOut', 'M0,0 C0.7,0 0.16,1 1,1')
}

// One entry per word. The last word is where the spin lands.
// For scrub mode, wrap the wheel's sticky stage in a tall element carrying
// data-anm-rw-track; the drum then turns across that wrapper's scroll.
const props = defineProps({
  words: { type: Array, default: () => DEFAULT_WORDS.slice() },
  scrub: { type: Boolean, default: true },
  spin: { type: Number, default: 2.4 },
  settle: { type: Number, default: 0.15 },
  step: { type: Number, default: 18 },
  hold: { type: Number, default: 0 },
  snap: { type: Boolean, default: false },
  snapDelay: { type: Number, default: 0.1 },
  start: { type: String, default: 'top 75%' },
  once: { type: Boolean, default: false },
  nav: { type: Boolean, default: true },
  blur: { type: Number, default: 8 },
  disable: { type: String, default: '' },
})

const rootRef = ref(null)
const listRef = ref(null)
// Plain arrays, not refs: function refs write into them during render.
const itemEls = []
const dotEls = []
const isBuilt = ref(false)
let cleanup = null
let goToImpl = null

const FALLBACK_EASE = 'expo.out'
const SPIN_EASE = 'annnimate'
const SETTLE_EASE = 'annnimateInOut'
const SETTLE_DURATION = 0.6
const GOTO_DURATION = 0.9
// Neighbour words sit this light; the centre word is fully dark.
const DIM = 0.14
// The landing word steps up in weight and tightens its tracking, so it
// clicks in like a dial instead of just getting darker.
const WEIGHT_REST = 300
const WEIGHT_ACTIVE = 500
const TRACK_REST = -0.02
const TRACK_ACTIVE = -0.045
// Distance between two neighbour words on the drum, in item heights.
const ITEM_GAP = 1.5
const PERSPECTIVE = 4
// Nav dots: the one for the centre word stretches into a pill.
const DOT_STRETCH = 2.6
const DOT_DIM = 0.3
const DRUM_SMOOTH = 0.9
// Blur on the words themselves, by how far they have curved away: none
// near the centre (BLUR_FROM of the way to the edge), the full amount at
// the edge. A backdrop-filter overlay cannot see 3D-transformed content in
// Safari, so the blur lives on each word. Rounded to half pixels so tiny
// changes do not repaint.
const BLUR_FROM = 0.2
const SNAP_DURATION = { min: 0.25, max: 0.7 }
const RESIZE_DEBOUNCE = 150
const BREAKPOINTS = {
  mobile: '(max-width: 479px)',
  landscape: '(orientation: landscape) and (max-width: 767px)',
  tablet: '(max-width: 991px)',
  desktop: '(min-width: 992px)',
}

function isDisabled() {
  if (!props.disable) return false
  return props.disable.split(',').some((v) => {
    const q = BREAKPOINTS[v.trim()]
    return q && window.matchMedia(q).matches
  })
}

function resolveEase(name) {
  return gsap.parseEase(name) ? name : FALLBACK_EASE
}

function setup() {
  const root = rootRef.value
  const list = listRef.value
  const items = itemEls.filter(Boolean)
  if (!root || !list || items.length < 2) return null
  // Scrub mode reads its scroll distance from a tall track around the
  // sticky stage when there is one; without it the drum turns while the
  // wheel crosses the viewport.
  const track = root.closest('[data-anm-rw-track]')
  const dots = props.nav ? dotEls.filter(Boolean) : []
  const hold = Math.min(0.9, Math.max(0, props.hold))
  const step = props.step

  const last = items.length - 1
  const drum = { p: 0 }
  const scrollProxy = { t: 0 }
  let radius = 0
  let tl = null
  let st = null
  let goTween = null
  let active = false
  let resizeTimer = null
  let lastWidth = window.innerWidth

  // Scrub: optionally linger on each word, then turn to the next. `hold`
  // is the share of every word-to-word stretch spent standing still (0 =
  // an even turn). Word i always sits exactly at progress i / last.
  function shape(t) {
    const raw = t * last
    const i = Math.min(last, Math.floor(raw))
    const f = raw - i
    if (!hold) return raw
    const g = Math.min(1, Math.max(0, (f - hold / 2) / (1 - hold)))
    return i + g * g * (3 - 2 * g)
  }

  // Radius from the item height: neighbours sit ITEM_GAP item heights
  // apart along the drum's surface.
  function layout() {
    const itemH = items[0].offsetHeight || 1
    radius = (itemH * ITEM_GAP) / (2 * Math.sin((step * Math.PI) / 360))
    list.style.height = Math.round(radius * 2) + 'px'
    list.style.perspective = Math.round(radius * PERSPECTIVE) + 'px'
    render()
  }

  function render() {
    const p = drum.p
    for (let i = 0; i < items.length; i++) {
      const el = items[i]
      const d = i - p
      const a = d * step
      if (Math.abs(a) >= 90) {
        el.style.visibility = 'hidden'
        continue
      }
      const near = Math.max(0, 1 - Math.abs(d))
      const fade = 1 - Math.abs(a) / 90
      el.style.visibility = ''
      el.style.transform = 'translate(-50%, -50%) translateZ(' + (-radius) + 'px) rotateX(' + (-a) + 'deg) translateZ(' + radius + 'px)'
      el.style.opacity = String(DIM * fade + (1 - DIM) * near)
      el.style.fontWeight = String(Math.round(WEIGHT_REST + (WEIGHT_ACTIVE - WEIGHT_REST) * near))
      el.style.letterSpacing = (TRACK_REST + (TRACK_ACTIVE - TRACK_REST) * near) + 'em'
      if (props.blur > 0) {
        const depth = Math.max(0, (Math.abs(a) / 90 - BLUR_FROM) / (1 - BLUR_FROM))
        const b = Math.round(props.blur * depth * depth * 2) / 2
        el.style.filter = b > 0 ? 'blur(' + b + 'px)' : ''
      }
    }
    const current = Math.round(p)
    dots.forEach((dot, k) => {
      const near = Math.max(0, 1 - Math.abs(k - p))
      dot.style.setProperty('--rw-dot', String(1 + (DOT_STRETCH - 1) * near))
      dot.style.opacity = String(DOT_DIM + (1 - DOT_DIM) * near)
      if (k === current) dot.setAttribute('aria-current', 'true')
      else dot.removeAttribute('aria-current')
    })
  }

  // Click a dot: scrub mode scrolls the page to where that word sits; spin
  // mode turns the wheel there directly.
  function goTo(i) {
    if (props.scrub && st) {
      const target = st.start + (st.end - st.start) * (i / last)
      window.scrollTo({ top: target, behavior: 'smooth' })
      return
    }
    if (tl) tl.pause()
    if (goTween) goTween.kill()
    goTween = gsap.to(drum, { p: i, duration: GOTO_DURATION, ease: resolveEase(SETTLE_EASE), onUpdate: render })
  }

  function buildEnterTimeline() {
    const t = gsap.timeline({ paused: true })
    t.fromTo(drum, { p: 0 }, {
      p: last + props.settle, duration: props.spin, ease: resolveEase(SPIN_EASE), onUpdate: render,
      data: { label: 'Drum spins through the list' },
    }, 0)
    t.to(drum, {
      p: last, duration: SETTLE_DURATION, ease: resolveEase(SETTLE_EASE), onUpdate: render,
      data: { label: 'Drum settles on the last word' },
    }, props.spin)
    return t
  }

  function scrubRange() {
    return track
      ? { trigger: track, start: 'top top', end: 'bottom bottom' }
      : { trigger: root, start: 'top bottom', end: 'bottom top' }
  }

  function build() {
    layout()
    if (props.scrub) {
      const drumTween = gsap.fromTo(scrollProxy, { t: 0 }, {
        t: 1, ease: 'none', paused: true,
        onUpdate: () => { drum.p = shape(scrollProxy.t); render() },
        data: { label: 'Drum turns with the scroll' },
      })
      const config = Object.assign({ scrub: DRUM_SMOOTH, animation: drumTween }, scrubRange())
      // Snap: when scrolling stops, the page settles so a word sits in the
      // centre.
      if (props.snap) config.snap = { snapTo: 1 / last, duration: SNAP_DURATION, delay: Math.max(0, props.snapDelay), ease: resolveEase(SETTLE_EASE) }
      st = ScrollTrigger.create(config)
    } else {
      tl = buildEnterTimeline()
      st = ScrollTrigger.create({
        trigger: root,
        start: props.start,
        once: props.once,
        toggleActions: props.once ? 'play none none none' : 'play none none reverse',
        animation: tl,
      })
    }
    gsap.set(root, { autoAlpha: 1 })
  }

  function teardown() {
    if (st) st.kill()
    if (tl) tl.kill()
    if (goTween) goTween.kill()
    st = null
    tl = null
    goTween = null
  }

  // Reduced motion or a disabled viewport: the wheel rests on its last
  // word, nothing moves (the dots still jump to a word).
  function showStatic() {
    drum.p = last
    layout()
    gsap.set(root, { autoAlpha: 1 })
  }

  function whenFontsReady(cb) {
    const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()
    ready.then(cb)
  }

  function enable() {
    if (isDisabled()) {
      whenFontsReady(showStatic)
      return undefined
    }
    active = true
    drum.p = 0
    scrollProxy.t = 0
    gsap.set(root, { autoAlpha: 0 })
    whenFontsReady(() => { if (active) build() })
    return () => {
      active = false
      teardown()
    }
  }

  // Width only: a mobile URL bar changes the height on every scroll.
  function onResize() {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (window.innerWidth === lastWidth) return
      lastWidth = window.innerWidth
      layout()
      ScrollTrigger.refresh()
    }, RESIZE_DEBOUNCE)
  }

  function onVisibility() {
    if (document.hidden) gsap.globalTimeline.pause()
    else gsap.globalTimeline.resume()
  }

  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVisibility)

  // Without JS the words are a plain centred list; the built class turns
  // them into the drum.
  isBuilt.value = true
  goToImpl = goTo

  const mm = gsap.matchMedia()
  mm.add({ motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' }, (ctx) => {
    if (ctx.conditions.motion) return enable()
    whenFontsReady(showStatic)
    return undefined
  })

  return () => {
    clearTimeout(resizeTimer)
    window.removeEventListener('resize', onResize)
    document.removeEventListener('visibilitychange', onVisibility)
    mm.revert()
    teardown()
    active = false
    goToImpl = null
    isBuilt.value = false
    items.forEach((el) => el.removeAttribute('style'))
    // Dots carry template-bound attributes; clear only what JS set.
    dots.forEach((dot) => {
      dot.style.removeProperty('--rw-dot')
      dot.style.opacity = ''
      dot.removeAttribute('aria-current')
    })
    list.removeAttribute('style')
    gsap.set(root, { clearProps: 'visibility,opacity' })
  }
}

function goTo(i) {
  if (goToImpl) goToImpl(i)
}

function rebuildAll() {
  if (cleanup) cleanup()
  cleanup = setup()
}

onMounted(rebuildAll)
watch(
  () => [props.words.join('\n'), props.scrub, props.spin, props.settle, props.step, props.hold, props.snap, props.snapDelay, props.start, props.once, props.nav, props.blur, props.disable],
  rebuildAll,
  { flush: 'post' }
)
onBeforeUnmount(() => { if (cleanup) cleanup() })

defineExpose({ goTo })
</script>

<template>
  <div ref="rootRef" data-anm-rotating-words :class="{ 'rw_is-built': isBuilt }">
    <ul ref="listRef" class="rw_list" data-anm-rw-list>
      <li
        v-for="(word, i) in words"
        :key="i"
        :ref="(el) => { itemEls[i] = el }"
        class="rw_item"
      >{{ word }}</li>
    </ul>
    <div v-if="nav" class="rw_nav">
      <button
        v-for="(word, i) in words"
        :key="i"
        :ref="(el) => { dotEls[i] = el }"
        type="button"
        class="rw_dot"
        :aria-label="'Go to ' + String(word).trim()"
        @click="goTo(i)"
      />
    </div>
  </div>
</template>
