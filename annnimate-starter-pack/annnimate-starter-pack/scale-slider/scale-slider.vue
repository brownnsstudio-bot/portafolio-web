<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(CustomEase, Draggable, InertiaPlugin)
  CustomEase.create('annnimate', 'M0,0 C0.3,0.9 0.1,1 1,1')
  CustomEase.create('annnimateInOut', 'M0,0 C0.7,0 0.16,1 1,1')
}

const DEFAULT_IMAGES = [
  'https://annnimate.b-cdn.net/preview-assets/vanta/roster_profile_06.jpg?width=1600',
  'https://annnimate.b-cdn.net/preview-assets/vanta/roster_profile_01.jpg?width=1600',
  'https://annnimate.b-cdn.net/preview-assets/vanta/roster_cap-profile_02.jpg?width=1600',
  'https://annnimate.b-cdn.net/preview-assets/vanta/roster_cap-profile_01.jpg?width=1600',
  'https://annnimate.b-cdn.net/preview-assets/vanta/roster_profile_09.jpg?width=1600',
  'https://annnimate.b-cdn.net/preview-assets/vanta/roster_profile_07.jpg?width=1600',
  'https://annnimate.b-cdn.net/preview-assets/vanta/silhouette_eyewear-silhouette_01.jpg?width=1600',
  'https://annnimate.b-cdn.net/preview-assets/vanta/roster_profile_02.jpg?width=1600',
  'https://annnimate.b-cdn.net/preview-assets/vanta/roster_profile_10.jpg?width=1600',
  'https://annnimate.b-cdn.net/preview-assets/vanta/roster_eyewear-profile_01.jpg?width=1600',
  'https://annnimate.b-cdn.net/preview-assets/vanta/roster_silhouette_01.jpg?width=1600',
  'https://annnimate.b-cdn.net/preview-assets/vanta/roster_cap-silhouette_01.jpg?width=1600',
]

const props = defineProps({
  // images: One card per image (min 3)
  images: { type: Array, default: () => DEFAULT_IMAGES },
  // direction: Which edge the hero (largest) card is anchored to
  direction: { type: String, default: 'rtl' },
  // count: How many cards tile the viewport. 'auto' picks 5/4/3 by viewport shape
  count: { type: [String, Number], default: 'auto' },
  // minScale: Smallest card size as a fraction of the biggest (0.05-0.8)
  minScale: { type: Number, default: 0.3 },
  // autoplay: Continuous ramp drift speed per frame. 0 = off
  autoplay: { type: Number, default: 0.0016 },
  // drag: Drag-to-travel sensitivity
  drag: { type: Number, default: 0.0012 },
  // scroll: How strongly page scroll accelerates the slider. 0 = off
  scroll: { type: Number, default: 0.0002 },
  // focusY: Vertical cover-crop anchor bias for portrait source images
  focusY: { type: Number, default: 0.22 },
  // radius: Card corner radius in pixels
  radius: { type: Number, default: 0 },
  // parallax: Scale parallax depth on the inner image. 0 = off
  parallax: { type: Number, default: 0 },
})

const wrapRef = ref(null)
const sceneRef = ref(null)
const cardRefs = ref([])
const imgRefs = ref([])
const prevBtnRef = ref(null)
const nextBtnRef = ref(null)

function setCardRef(el, i) {
  if (el) cardRefs.value[i] = el
}
function setImgRef(el, i) {
  if (el) imgRefs.value[i] = el
}

let destroyFn = null
let nextFn = null
let prevFn = null
let goToFn = null

onMounted(() => {
  if (typeof window === 'undefined' || !wrapRef.value || !sceneRef.value) return

  const container = wrapRef.value
  const scene = sceneRef.value
  const cards = imgRefs.value
    .map((img, i) => ({ el: cardRefs.value[i], img }))
    .filter((c) => c.el && c.img)
  const M = cards.length
  if (M < 3) return

  // --- 2. Config ---
  const DIRECTION = props.direction === 'ltr' ? 'ltr' : 'rtl'
  const COUNT_ATTR = props.count === undefined || props.count === null ? 'auto' : props.count
  const MIN_SCALE = Math.min(0.8, Math.max(0.05, props.minScale))
  const AUTOPLAY = props.autoplay
  const DRAG = props.drag
  const SCROLL = props.scroll
  const FOCUS_Y = props.focusY
  const RADIUS = props.radius
  const PARALLAX = Math.max(0, props.parallax)

  // --- 3. Constants ---
  const EASE_KEY = 'annnimateInOut'
  const OVERLAP = 1.5 // px - cards overlap their tail neighbour to hide sub-pixel seams
  const SCROLL_DAMP = 0.9 // per-frame decay of the scroll boost - higher = longer glide
  // drag: content follows the finger. rtl head is on the right, so a
  // rightward drag (+dx) advances travel toward the head; ltr mirrors.
  const DRAG_SIGN = DIRECTION === 'ltr' ? -1 : 1
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // --- 4. State ---
  let viewW = 1, viewH = 1
  let base = 100 // fixed px size of every card frame; size is driven by transform scale
  let visCount = 5
  let rampR = 1.35, rampK = 1, rampXv = 0 // derived in computeRamp()
  let travel = 0
  let dragX = 0
  let scrollY = window.scrollY || 0
  let scrollBoost = 0 // decaying extra drift speed from page scroll
  let running = true
  let drag = null
  let navTween = null // active tween when an arrow is animating to a card
  let resizeTimer = null

  // --- 5. Helpers ---
  function phaseNow() { return travel - Math.floor(travel) }

  // How many cards tile the stage. "auto" scales with viewport shape - more
  // cards on wider screens keeps the head card from exceeding the stage
  // height (a card taller than the stage would be clipped at the top and
  // read as non-square).
  function computeCount() {
    if (COUNT_ATTR !== 'auto') {
      return Math.max(3, Math.min(M - 1, parseInt(COUNT_ATTR, 10) || 5))
    }
    const aspect = viewW / viewH
    return aspect >= 2.2 ? 6 : aspect >= 1.5 ? 5 : aspect >= 1.0 ? 4 : 3
  }

  // Solve the ramp from the two knobs so exactly visCount cards tile
  // [0, viewW] edge-to-edge at EVERY phase - head cropped past the right
  // edge (boundary(0) >= viewW), tail cropped past the left edge at
  // MIN_SCALE (boundary(visCount) <= 0). rampR is the neighbour size ratio
  // (each card R x its tail neighbour) set so the head:tail span == MIN_SCALE
  // across visCount cards. Anchoring the vanishing point at -MIN_SCALE * K
  // (not -MIN_SCALE * K / R) is what keeps the tail pinned to the left edge
  // through the whole cycle instead of drifting inward and leaving a gap.
  function computeRamp() {
    rampR = Math.pow(1 / MIN_SCALE, 1 / (visCount - 1))
    rampK = viewW / (1 - MIN_SCALE)
    rampXv = -MIN_SCALE * rampK
  }

  // Distance of boundary k from the tail edge. Boundary 0 is the head card's
  // outer edge - always at or past the head viewport edge.
  function boundary(k) {
    return rampXv + rampK * Math.pow(rampR, phaseNow() - k)
  }

  // The nearest travel value where image j lands on the head at phase 0
  // (a "landed" state is any whole integer; image = integer mod M).
  function landedForImage(j) {
    const n = ((j % M) + M) % M
    return n + M * Math.round((travel - n) / M)
  }

  // --- 6. Animation routines ---
  // Every card is ALWAYS rendered. Card i is at slot k = (i - floor(travel))
  // mod M; slots >= visCount sit off-screen (boundary <= 0) and are clipped.
  // Never display-toggled, so the recycle - a card jumping from off one edge
  // to off the other - is an invisible off-screen transform jump either way.
  function positionCards() {
    const shift = Math.floor(travel)
    for (let i = 0; i < M; i++) {
      const card = cards[i]
      const el = card.el
      const k = (((i - shift) % M) + M) % M
      const outer = boundary(k)
      const inner = boundary(k + 1)
      const size = Math.max(outer - inner, 1)
      const w = size + OVERLAP
      // rtl: left edge at inner (distance from the left/tail edge), overlap
      // extends tailward (left). ltr mirrors: left edge at viewW - outer,
      // overlap extends tailward (right, via the width).
      const left = DIRECTION === 'ltr' ? (viewW - outer) : (inner - OVERLAP)
      // Size is driven by transform SCALE off a fixed base frame (never by
      // width/height), so nothing re-rasterizes per frame - the image is
      // rasterized once at `base` px and only composited. transform-origin
      // is the frame's bottom-left, so scale keeps the card on the baseline
      // and grows it rightward from `left`.
      const fscale = w / base
      el.style.zIndex = String(visCount - k) // head (small k) on top
      el.style.transform = 'translate3d(' + left.toFixed(1) + 'px,0,0) scale(' + fscale.toFixed(5) + ')'

      // Scale parallax (scale-OUT): the image is largest at the head and
      // eases back to 1x toward the tail. Skip it for off-stage cards.
      if (PARALLAX > 0 && k < visCount) {
        const cx = left + w / 2
        let tailDist = DIRECTION === 'ltr' ? (viewW - cx) / viewW : cx / viewW
        tailDist = tailDist < 0 ? 0 : tailDist > 1 ? 1 : tailDist
        const zoom = 1 + PARALLAX * tailDist
        card.img.style.transform = 'scale(' + zoom.toFixed(4) + ')'
      }
    }
  }

  // Animate travel to a target (an arrow step or a goTo target). While it
  // runs, frame() hands travel over to this tween so autoplay/drag/scroll
  // don't fight it, and it lands exactly on a whole card.
  function animateTo(target) {
    if (navTween) navTween.kill()
    const proxy = { t: travel }
    const dur = Math.min(1.1, 0.45 + 0.12 * Math.abs(target - travel))
    navTween = gsap.to(proxy, {
      t: target,
      duration: dur,
      ease: typeof CustomEase !== 'undefined' ? EASE_KEY : 'power3.inOut',
      onUpdate: function () { travel = proxy.t; positionCards() },
      onComplete: function () { navTween = null },
    })
  }
  function goForward() { animateTo(Math.round(travel) - 1) } // autoplay direction
  function goBackward() { animateTo(Math.round(travel) + 1) }
  function goToImage(j) { animateTo(landedForImage(j)) }

  function frame() {
    if (!running) return
    const sy = window.scrollY || 0
    const scrollDelta = sy - scrollY
    scrollY = sy
    if (navTween) { dragX = 0; return } // nav owns travel; its tween renders
    // Scroll feeds a decaying velocity BOOST rather than moving travel 1:1,
    // so the conveyor accelerates on scroll and glides to a stop instead of
    // freezing the instant scrolling stops. Scrolling either direction adds
    // speed the same way (magnitude only), matching autoplay - never reverses.
    scrollBoost = scrollBoost * SCROLL_DAMP + Math.abs(scrollDelta) * SCROLL
    travel += dragX * DRAG * DRAG_SIGN
      - (reducedMotion ? 0 : AUTOPLAY)
      - scrollBoost
    dragX = 0
    positionCards()
  }

  function resize() {
    const w = scene.clientWidth, h = scene.clientHeight
    if (!w || !h) return
    viewW = w
    viewH = h
    visCount = computeCount()
    computeRamp()
    // Fixed base frame size = the largest a card ever gets, plus parallax
    // headroom so the zoomed image stays sampled from enough pixels. Set on
    // the frames once here (not per frame) so per-frame updates are pure
    // GPU transforms - this is the fix for the autoplay stutter (animating
    // width/height re-rasterized the cover image every frame).
    const maxHero = rampK * (rampR - 1)
    base = (maxHero + OVERLAP) * (1 + PARALLAX)
    const px = base.toFixed(1) + 'px'
    for (let i = 0; i < M; i++) {
      cards[i].el.style.width = px
      cards[i].el.style.height = px
    }
    positionCards()
  }

  function initDrag() {
    if (typeof Draggable === 'undefined') return
    const proxy = document.createElement('div')
    drag = Draggable.create(proxy, {
      type: 'x',
      trigger: scene,
      inertia: typeof InertiaPlugin !== 'undefined',
      allowContextMenu: true,
      dragClickables: true,
      onDragStart: function () { if (navTween) { navTween.kill(); navTween = null } },
      onDrag: function () { dragX += this.deltaX },
      onThrowUpdate: function () { dragX += this.deltaX },
    })[0]
  }

  // --- 7. Event listeners ---
  function onKeydown(e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); (DIRECTION === 'ltr' ? goBackward : goForward)() }
    else if (e.key === 'ArrowRight') { e.preventDefault(); (DIRECTION === 'ltr' ? goForward : goBackward)() }
  }
  container.setAttribute('tabindex', container.getAttribute('tabindex') || '0')
  container.addEventListener('keydown', onKeydown)

  function onPrev() { goBackward() }
  function onNext() { goForward() }
  if (prevBtnRef.value) prevBtnRef.value.addEventListener('click', onPrev)
  if (nextBtnRef.value) nextBtnRef.value.addEventListener('click', onNext)

  const ro = new ResizeObserver(function () {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(resize, 150)
  })
  ro.observe(scene)

  function onVis() { running = !document.hidden }
  document.addEventListener('visibilitychange', onVis)

  // --- 8. Initial DOM state ---
  const objPos = '50% ' + (FOCUS_Y * 100).toFixed(1) + '%'
  for (let i = 0; i < M; i++) {
    cards[i].img.style.objectPosition = objPos
    if (RADIUS > 0) cards[i].el.style.borderRadius = RADIUS + 'px'
  }
  resize() // positions every card (transforms) while still display:none
  for (let i = 0; i < M; i++) cards[i].el.style.display = 'block' // reveal, already placed
  initDrag()

  // --- 9. Reduced motion ---
  // The ticker still runs so drag + scroll + nav respond; only autoplay is
  // gated above (reducedMotion -> AUTOPLAY contributes 0).
  gsap.ticker.add(frame)
  gsap.ticker.lagSmoothing(0)

  // --- 10. Public API ---
  // next/prev advance the conveyor one card (next = the autoplay direction);
  // goTo animates a specific image index to the featured head.
  nextFn = function () { goForward() }
  prevFn = function () { goBackward() }
  goToFn = function (j) { goToImage(j) }

  destroyFn = function destroy() {
    running = false
    gsap.ticker.remove(frame)
    clearTimeout(resizeTimer)
    if (navTween) navTween.kill()
    if (drag) drag.kill()
    ro.disconnect()
    document.removeEventListener('visibilitychange', onVis)
    container.removeEventListener('keydown', onKeydown)
    if (prevBtnRef.value) prevBtnRef.value.removeEventListener('click', onPrev)
    if (nextBtnRef.value) nextBtnRef.value.removeEventListener('click', onNext)
  }
})

onBeforeUnmount(() => {
  destroyFn?.()
})

defineExpose({
  next: () => nextFn?.(),
  prev: () => prevFn?.(),
  goTo: (j) => goToFn?.(j),
})
</script>

<template>
  <div
    ref="wrapRef"
    class="scs_wrap"
    data-anm-scale-slider
    role="group"
    aria-label="Image slider"
    aria-roledescription="carousel"
    tabindex="0"
  >
    <div ref="sceneRef" class="scs_scene" data-anm-scale-slider-scene>
      <div
        v-for="(src, i) in images"
        :key="src + i"
        :ref="(el) => setCardRef(el, i)"
        class="scs_card"
        data-anm-scale-slider-card
      >
        <img
          :ref="(el) => setImgRef(el, i)"
          class="scs_img"
          :src="src"
          alt=""
          draggable="false"
        />
      </div>
    </div>

    <div class="scs_pill" role="group" aria-label="Slide controls">
      <button ref="prevBtnRef" class="scs_arrow" data-anm-scale-slider-prev type="button" aria-label="Previous">
        <svg class="scs_arrow_icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <button ref="nextBtnRef" class="scs_arrow" data-anm-scale-slider-next type="button" aria-label="Next">
        <svg class="scs_arrow_icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </div>
</template>
