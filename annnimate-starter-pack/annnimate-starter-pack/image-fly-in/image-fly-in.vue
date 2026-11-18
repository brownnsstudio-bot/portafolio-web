<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { CustomEase } from 'gsap/CustomEase'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase)
  CustomEase.create('annnimate', 'M0,0 C0.3,0.9 0.1,1 1,1')
}

const DEFAULT_IMAGES = [
  { src: 'https://annnimate.b-cdn.net/preview-assets/vanta/product_tennis-racket_02.jpg?width=640', alt: 'Tennis racket detail', aspect: 'portrait_lg' },
  { src: 'https://annnimate.b-cdn.net/preview-assets/vanta/product_tennis-racket_05.jpg?width=640', alt: 'Tennis racket detail', aspect: 'portrait_md' },
  { src: 'https://annnimate.b-cdn.net/preview-assets/vanta/product_football-boot_01.jpg?width=640', alt: 'Football boot', aspect: 'portrait_sm' },
  { src: 'https://annnimate.b-cdn.net/preview-assets/vanta/product_half-zip_01.jpg?width=640', alt: 'Half-zip top', aspect: 'portrait_lg', hideMobile: true },
  { src: 'https://annnimate.b-cdn.net/preview-assets/vanta/product_shoe_01.jpg?width=640', alt: 'Running shoe', aspect: 'portrait_md' },
  { src: 'https://annnimate.b-cdn.net/preview-assets/vanta/product_ball_02.jpg?width=640', alt: 'Ball detail', aspect: 'portrait_sm', hideMobile: true },
  { src: 'https://annnimate.b-cdn.net/preview-assets/vanta/product_tennis-net_01.jpg?width=640', alt: 'Tennis net', aspect: 'portrait_lg', hideMobile: true },
  { src: 'https://annnimate.b-cdn.net/preview-assets/vanta/product_football-boot_06.jpg?width=640', alt: 'Football boot, side view', aspect: 'landscape_lg' },
  { src: 'https://annnimate.b-cdn.net/preview-assets/vanta/product_shoe_06.jpg?width=640', alt: 'Sneaker, side view', aspect: 'landscape_sm', hideMobile: true },
  { src: 'https://annnimate.b-cdn.net/preview-assets/vanta/texture_tennis-macro_01.jpg?width=640', alt: 'Tennis ball macro texture', aspect: 'square_lg' },
  { src: 'https://annnimate.b-cdn.net/preview-assets/vanta/scatter_ball-rackets_01.jpg?width=640', alt: 'Ball and rackets', aspect: 'square_sm', hideMobile: true },
  { src: 'https://annnimate.b-cdn.net/preview-assets/vanta/texture_fabric-macro_01.jpg?width=640', alt: 'Fabric macro texture', aspect: 'square_sm' },
]

const EXIT_Z = 400
const PLATEAU_Z_START = -200
const PLATEAU_Z_END = -80
const HOLE_X_MAX = 0.42
const HOLE_Y_MAX = 0.35
const HOLE_SOFT_EDGE = 80
const VELOCITY_LERP = 0.06
const VELOCITY_DIVISOR = 60
const PAN_LERP_DUR = 1.2
const PAN_Y_RATIO = 0.8

function smoothstep(t) {
  return t * t * (3 - 2 * t)
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

// images: array of { src, alt, aspect, hideMobile } - defaults to the 12 VANTA demo images
// headline / support: manifesto copy
// duration: full fly-in cycle length in seconds at base speed (default 10)
// depth: spawn depth in px (default 2000)
// speed: base drift speed multiplier (default 1)
// scrollBoost: max scroll-velocity speed multiplier, 0 disables (default 3.5)
// pan: max cursor pan of the field in px, 0 disables cursor parallax (default 40)
// holeBuffer: extra px of clearance around the measured content zone (default 120)
// The content element's rectangle is MEASURED at runtime - images never spawn
// inside it (plus breathing room). No content = no exclusion.
// NOTE: the images default is an empty array, NOT DEFAULT_IMAGES - defineProps
// is compiler-hoisted outside setup() and cannot reference locally declared
// variables (vue3-sfc-loader rejects it). resolvedImages applies the fallback.
const props = defineProps({
  images: { type: Array, default: () => [] },
  headline: { type: String, default: 'Everything else is noise.' },
  support: { type: String, default: 'Focus is what remains when the season strips away everything you do not need.' },
  duration: { type: Number, default: 10 },
  depth: { type: Number, default: 2000 },
  speed: { type: Number, default: 1 },
  scrollBoost: { type: Number, default: 3.5 },
  pan: { type: Number, default: 40 },
  holeBuffer: { type: Number, default: 120 },
})

const resolvedImages = computed(() =>
  props.images && props.images.length > 0 ? props.images : DEFAULT_IMAGES
)

const rootRef = ref(null)
const stageRef = ref(null)
const contentRef = ref(null)
const headlineRef = ref(null)
const supportRef = ref(null)
const cardRefs = ref([])

function setCardRef(el) {
  if (el && !cardRefs.value.includes(el)) cardRefs.value.push(el)
}

let running = false
let tick = null
let onScroll = null
let onResize = null
let onPointerMove = null
let onPointerLeave = null
let onVisibilityChange = null
let io = null
let split = null
let supportSplit = null
let revealTl = null
let revealSt = null
let stopTickerFn = null

onMounted(async () => {
  const root = rootRef.value
  const stage = stageRef.value
  const content = contentRef.value
  const cards = cardRefs.value
  if (!root || !stage || !cards.length) return

  const reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)')
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches
  const reduced = reducedMQ.matches

  let viewportW = window.innerWidth
  let viewportH = window.innerHeight
  let velocityMultiplier = 1
  let lastScrollY = window.scrollY || window.pageYOffset || 0

  const cardStates = []
  const setters = []

  let holeXHalfPx = 0
  let holeYHalfPx = 0
  const perspectivePx = parseFloat(getComputedStyle(root).perspective) || 1200
  const cardHalfW = []
  const cardHalfH = []

  // Measure the centre content element and derive the spawn-free zone from
  // its actual rectangle plus the buffer. No content = no exclusion.
  function measureHole() {
    holeXHalfPx = 0
    holeYHalfPx = 0
    if (!content) return
    const rect = content.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    holeXHalfPx = Math.min(rect.width / 2 + props.holeBuffer, viewportW * HOLE_X_MAX)
    holeYHalfPx = Math.min(rect.height / 2 + props.holeBuffer, viewportH * HOLE_Y_MAX)
  }

  // The spawn test and the per-frame zone fade need the card EDGES, not just
  // its centre.
  function measureCards() {
    cards.forEach((card, i) => {
      cardHalfW[i] = card.offsetWidth / 2
      cardHalfH[i] = card.offsetHeight / 2
    })
  }

  function randomScatterPosition(halfW, halfH) {
    let x, y, attempts = 0
    do {
      x = Math.random() - 0.5
      y = Math.random() - 0.5
      attempts += 1
    } while (
      Math.abs(x) * viewportW < holeXHalfPx + halfW &&
      Math.abs(y) * viewportH < holeYHalfPx + halfH &&
      attempts < 12
    )
    return { xFrac: x, yFrac: y }
  }

  function spawnCard(state, delayIntoCycle, i) {
    const pos = randomScatterPosition(cardHalfW[i] || 0, cardHalfH[i] || 0)
    state.xFrac = pos.xFrac
    state.yFrac = pos.yFrac
    state.progress = delayIntoCycle || 0
  }

  // Per-frame dim so a card never reads on top of the content zone. Works in
  // PROJECTED screen space: the perspective divide pulls far cards toward the
  // centre and the cursor pan shifts the whole field, so a spawn-time test
  // alone cannot keep the zone clear.
  function holeFadeFactor(i, z, panX, panY) {
    if (!holeXHalfPx && !holeYHalfPx) return 1
    const s = perspectivePx / (perspectivePx - z)
    const state = cardStates[i]
    const projX = (state.xFrac * viewportW + panX) * s
    const projY = (state.yFrac * viewportH + panY) * s
    const sepX = Math.abs(projX) - (holeXHalfPx + (cardHalfW[i] || 0) * s)
    const sepY = Math.abs(projY) - (holeYHalfPx + (cardHalfH[i] || 0) * s)
    return smoothstep(clamp01(Math.max(sepX, sepY) / HOLE_SOFT_EDGE))
  }

  function opacityForZ(z) {
    if (z <= -props.depth) return 0
    if (z < PLATEAU_Z_START) {
      const t = (z + props.depth) / (PLATEAU_Z_START + props.depth)
      return smoothstep(clamp01(t))
    }
    if (z <= PLATEAU_Z_END) return 1
    if (z < EXIT_Z) {
      const t = (z - PLATEAU_Z_END) / (EXIT_Z - PLATEAU_Z_END)
      return 1 - smoothstep(clamp01(t))
    }
    return 0
  }

  measureHole()
  measureCards()

  cards.forEach((card, i) => {
    const state = { xFrac: 0, yFrac: 0, progress: i / cards.length }
    cardStates.push(state)
    spawnCard(state, i / cards.length, i)
    setters.push({
      x: gsap.quickSetter(card, 'x', 'px'),
      y: gsap.quickSetter(card, 'y', 'px'),
      z: gsap.quickSetter(card, 'z', 'px'),
      opacity: gsap.quickSetter(card, 'opacity'),
    })
  })

  tick = function () {
    if (!running) return
    const dt = gsap.ticker.deltaRatio(60) / 60
    const rate = (props.speed * velocityMultiplier) / props.duration
    velocityMultiplier += (1 - velocityMultiplier) * VELOCITY_LERP
    const totalTravel = EXIT_Z - -props.depth

    const panX = quickPanX ? Number(gsap.getProperty(stage, 'x')) || 0 : 0
    const panY = quickPanY ? Number(gsap.getProperty(stage, 'y')) || 0 : 0

    for (let i = 0; i < cardStates.length; i++) {
      const state = cardStates[i]
      state.progress += rate * dt
      if (state.progress >= 1) spawnCard(state, state.progress - 1, i)
      const z = -props.depth + state.progress * totalTravel
      const opacity = opacityForZ(z) * holeFadeFactor(i, z, panX, panY)
      setters[i].x(state.xFrac * viewportW)
      setters[i].y(state.yFrac * viewportH)
      setters[i].z(z)
      setters[i].opacity(opacity)
    }
  }

  function startTicker() {
    if (running) return
    running = true
    gsap.ticker.add(tick)
  }

  function stopTicker() {
    running = false
    gsap.ticker.remove(tick)
  }

  stopTickerFn = stopTicker

  // Cursor pan (no rotation): the field slides WITH the pointer - cursor left
  // moves the field further left. Perspective makes near cards shift more than
  // far ones, so depth parallax comes for free. Long quickTo duration keeps it
  // fluid rather than responsive.
  let quickPanX, quickPanY

  onPointerMove = function (e) {
    const rect = root.getBoundingClientRect()
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1
    quickPanX(nx * props.pan)
    quickPanY(ny * props.pan * PAN_Y_RATIO)
  }

  onPointerLeave = function () {
    quickPanX(0)
    quickPanY(0)
  }

  if (!isCoarsePointer && !reduced && props.pan > 0) {
    quickPanX = gsap.quickTo(stage, 'x', { duration: PAN_LERP_DUR, ease: 'power3.out' })
    quickPanY = gsap.quickTo(stage, 'y', { duration: PAN_LERP_DUR, ease: 'power3.out' })
    root.addEventListener('pointermove', onPointerMove)
    root.addEventListener('pointerleave', onPointerLeave)
  }

  onScroll = function () {
    const y = window.scrollY || window.pageYOffset || 0
    const dlt = Math.abs(y - lastScrollY)
    lastScrollY = y
    if (props.scrollBoost > 0) {
      const boost = 1 + Math.min(dlt / VELOCITY_DIVISOR, 1) * (props.scrollBoost - 1)
      velocityMultiplier = Math.max(velocityMultiplier, boost)
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true })

  let resizeTimer
  onResize = function () {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      viewportW = window.innerWidth
      viewportH = window.innerHeight
      measureHole()
      measureCards()
      ScrollTrigger.refresh()
    }, 150)
  }
  window.addEventListener('resize', onResize)

  let isIntersecting = true
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        isIntersecting = entry.isIntersecting
        if (isIntersecting && !document.hidden) startTicker()
        else stopTicker()
      })
    }, { threshold: 0 })
    io.observe(root)
  }

  onVisibilityChange = function () {
    if (document.hidden) {
      stopTicker()
      gsap.globalTimeline.pause()
    } else {
      gsap.globalTimeline.resume()
      if (isIntersecting) startTicker()
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  // --- Headline reveal ---
  const headlineEl = headlineRef.value
  const supportEl = supportRef.value

  await (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve())

  // The content box grows when the web font arrives - re-measure so late
  // spawns respect the real rectangle.
  measureHole()

  if (headlineEl) {
    split = SplitText.create(headlineEl, { type: 'lines', mask: 'lines', linesClass: 'ifi_headline_line' })
    if (supportEl) supportSplit = SplitText.create(supportEl, { type: 'lines', mask: 'lines', linesClass: 'ifi_support_line' })

    const headlineLines = split.lines
    const supportLines = supportSplit ? supportSplit.lines : []

    gsap.set(headlineLines, { yPercent: 110, y: 0 })
    if (supportLines.length) gsap.set(supportLines, { yPercent: 110, y: 0 })

    revealTl = gsap.timeline({ paused: true, defaults: { ease: 'annnimate', force3D: true } })
    revealTl.fromTo(headlineLines, { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: 1.1, stagger: 0.08 })
    if (supportLines.length) {
      revealTl.fromTo(supportLines, { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: 0.9, stagger: 0.05 }, '-=0.6')
    }

    function inFirstViewport() {
      const r = root.getBoundingClientRect()
      return r.top < window.innerHeight && r.bottom > 0
    }

    requestAnimationFrame(() => {
      if (inFirstViewport()) {
        revealTl.restart()
      } else {
        revealSt = ScrollTrigger.create({
          trigger: root,
          start: 'top 80%',
          once: true,
          onEnter: () => revealTl.restart(),
        })
      }
      ScrollTrigger.refresh()
    })
  }

  // --- Init ---
  gsap.set(cards, { force3D: true, willChange: 'transform, opacity' })
  gsap.set(stage, { force3D: true })
  if (content) gsap.set(content, { force3D: true })

  if (reduced) {
    cards.forEach((card, i) => {
      const state = cardStates[i]
      gsap.set(card, { x: state.xFrac * viewportW, y: state.yFrac * viewportH, z: -200, opacity: 0.9 })
    })
    if (revealTl) revealTl.timeScale(20)
  } else {
    startTicker()
  }
})

onBeforeUnmount(() => {
  if (stopTickerFn) stopTickerFn()
  if (tick) gsap.ticker.remove(tick)
  if (onScroll) window.removeEventListener('scroll', onScroll)
  if (onResize) window.removeEventListener('resize', onResize)
  if (onPointerMove && rootRef.value) rootRef.value.removeEventListener('pointermove', onPointerMove)
  if (onPointerLeave && rootRef.value) rootRef.value.removeEventListener('pointerleave', onPointerLeave)
  if (onVisibilityChange) document.removeEventListener('visibilitychange', onVisibilityChange)
  if (io) io.disconnect()
  if (revealTl) revealTl.kill()
  if (revealSt) revealSt.kill()
  if (split) split.revert()
  if (supportSplit) supportSplit.revert()
})
</script>

<template>
  <section
    ref="rootRef"
    class="ifi_section"
    data-anm-image-fly-in
  >
    <div ref="stageRef" class="ifi_stage" data-anm-ifi-stage>
      <div
        v-for="(img, i) in resolvedImages"
        :key="img.src + i"
        :ref="setCardRef"
        :class="['ifi_card', `ifi_card_${img.aspect}`, img.hideMobile ? 'ifi_card_hide_mobile' : '']"
        data-anm-ifi-card
      >
        <img class="ifi_card_img" :src="img.src" :alt="img.alt || ''">
      </div>
    </div>

    <div ref="contentRef" class="ifi_content" data-anm-ifi-content>
      <h2 ref="headlineRef" class="ifi_headline" data-anm-ifi-headline>{{ headline }}</h2>
      <p v-if="support" ref="supportRef" class="ifi_support" data-anm-ifi-support>{{ support }}</p>
    </div>
  </section>
</template>
