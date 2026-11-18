<script>
const DEFAULT_LINKS = [
  { label: 'Work', href: '#' },
  { label: 'Studio', href: '#' },
  { label: 'Journal', href: '#' },
  { label: 'Shop', href: '#' },
]
</script>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(ScrollTrigger, CustomEase)

if (!CustomEase.get('annnimate')) {
  CustomEase.create('annnimate', 'M0,0 C0.3,0.9 0.1,1 1,1')
}
if (!CustomEase.get('annnimateInOut')) {
  CustomEase.create('annnimateInOut', 'M0,0 C0.7,0 0.16,1 1,1')
}

// threshold: Scroll distance in px before the header docks (20-400)
// duration: Length of the dock and undock motion in seconds (0.3-1.2)
// ease: Easing curve for the dock
// mode: 'toggle' plays on a threshold, 'scrub' follows the scroll
// offset: Gap between the docked pill and the top of the viewport (0-24)
// mark: Wordmark letters that stay visible when docked
// hideStart: Element (or ref) where hide-on-scroll-down begins; omit to never hide
const props = defineProps({
  threshold: { type: Number, default: 80 },
  duration: { type: Number, default: 0.42 },
  ease: { type: String, default: 'annnimate' },
  mode: { type: String, default: 'toggle' },
  offset: { type: Number, default: 12 },
  mark: { type: String, default: 'K' },
  wordmark: { type: String, default: 'Kinetic' },
  links: { type: Array, default: () => DEFAULT_LINKS },
  cta: { type: Object, default: () => ({ label: 'Contact', href: '#' }) },
  hideStart: { type: [Object, null], default: null },
})

// --- Constants ---
const HYSTERESIS = 24
const SCRUB_SMOOTH = 0.5
const CONTENT_LAG = 0.04
const LIFT_SCALE = 0.82
const FOLD_SCALE = 0.74
const PILL_PAD = 6
const MARK_INSET = 22
const GLASS_FILL = 0.56
const GLASS_BLUR = 14
const GLASS_SAT = 1.6
const RM_FADE = 0.2
const DEMO_HOLD = 0.9
const RESIZE_DEBOUNCE = 150
const MEASURE_CLASS = 'is-measuring'
const DOCKED_CLASS = 'is-docked'
const HIDDEN_CLASS = 'is-hidden'

// --- Template refs ---
const headerRef = ref(null)
const bgRef = ref(null)
const navRef = ref(null)
const logoRef = ref(null)
const tailInnerRef = ref(null)
const ctaRef = ref(null)
const linkEls = []

function setLinkRef(el, i) {
  if (el) linkEls[i] = el
}

// Wordmark split, rendered by the template (no textContent mutation)
const markPart = computed(() => {
  const word = props.wordmark.trim()
  return props.mark && word.indexOf(props.mark) === 0 ? props.mark : word.charAt(0)
})
const tailPart = computed(() => props.wordmark.trim().slice(markPart.value.length))

// --- State ---
let header = null
let bg = null
let nav = null
let logo = null
let ctaEl = null
let linkItems = []
let items = []
let tailInner = null
let geo = null
let tl = null
let demoTl = null
let rmFade = null
let trigger = null
let hideTrigger = null
let mm = null
let isDocked = false
let scrubbing = false
let reducedMotion = false
let resizeTimer = null
let rafId = 0
let lastWidth = 0
let isReady = false
let destroyed = false
let loadHandler = null

// --- Helpers ---
function isShown(el) {
  return el.getClientRects().length > 0
}

function measure() {
  gsap.set(items.concat([nav]), { x: 0, y: 0 })
  const width = header.getBoundingClientRect().width
  const barH = header.offsetHeight
  const bgH = bg.offsetHeight
  const tops = items.map((el) => el.getBoundingClientRect().left)

  header.classList.add(MEASURE_CLASS)
  const docks = items.map((el) => el.getBoundingClientRect())
  const ctaH = ctaEl.offsetHeight
  header.classList.remove(MEASURE_CLASS)

  const rowLeft = docks[0].left
  const rowRight = docks[docks.length - 1].right
  const pillW = rowRight - rowLeft + MARK_INSET + PILL_PAD
  const pillH = ctaH + PILL_PAD * 2
  const pillX = (width - pillW) / 2
  const shift = pillX + MARK_INSET - rowLeft

  return {
    dx: items.map((el, i) => (isShown(el) ? docks[i].left + shift - tops[i] : 0)),
    dy: props.offset + pillH / 2 - barH / 2,
    clipX: pillX,
    clipTop: props.offset,
    clipBottom: Math.max(0, bgH - props.offset - pillH),
    restBottom: Math.max(0, bgH - barH),
    radius: pillH / 2,
  }
}

function glassVars(p) {
  return {
    '--fnb-fill': GLASS_FILL * p,
    '--fnb-blur': GLASS_BLUR * p + 'px',
    '--fnb-sat': 1 + (GLASS_SAT - 1) * p,
  }
}

function dockSpecs() {
  const duration = props.duration
  const specs = [
    {
      target: bg, at: 0, dur: duration,
      label: 'Edges close into a pill', back: 'Edges open back to full width',
      from: { '--fnb-ct': '0px', '--fnb-cx': '0px', '--fnb-cb': geo.restBottom + 'px', '--fnb-cr': '0px' },
      to: { '--fnb-ct': geo.clipTop + 'px', '--fnb-cx': geo.clipX + 'px', '--fnb-cb': geo.clipBottom + 'px', '--fnb-cr': geo.radius + 'px' },
    },
    {
      target: bg, at: 0, dur: duration,
      label: 'Frosted glass fades in', back: 'Glass clears',
      from: glassVars(0), to: glassVars(1),
    },
    {
      target: logo, at: CONTENT_LAG, dur: duration,
      label: 'Wordmark rides the left edge', back: 'Wordmark rides back out',
      from: { x: 0 }, to: { x: geo.dx[0] },
    },
  ]
  if (tailInner) {
    specs.push({
      target: tailInner, at: CONTENT_LAG, dur: duration * FOLD_SCALE,
      label: 'Wordmark folds into its mark', back: 'Wordmark unfolds',
      from: { xPercent: 0, opacity: 1 }, to: { xPercent: -100, opacity: 0 },
    })
  }
  if (linkItems.length) {
    specs.push({
      target: linkItems, at: CONTENT_LAG, dur: duration,
      label: 'Links tighten toward the center', back: 'Links spread back out',
      from: { x: 0 }, to: { x: (i) => geo.dx[1 + i] },
    })
  }
  specs.push(
    {
      target: ctaEl, at: CONTENT_LAG, dur: duration,
      label: 'Contact rides the right edge', back: 'Contact rides back out',
      from: { x: 0 }, to: { x: geo.dx[items.length - 1] },
    },
    {
      target: nav, at: CONTENT_LAG, dur: duration * LIFT_SCALE,
      label: 'Row lifts into the pill', back: 'Row settles back down',
      from: { y: 0 }, to: { y: geo.dy },
    }
  )
  return specs
}

// --- Animation routines ---
function addSpec(timeline, spec, at, back, reversible) {
  const vars = Object.assign({}, back ? spec.from : spec.to, {
    duration: spec.dur,
    ease: props.ease,
    force3D: true,
    immediateRender: false,
    data: { label: back ? spec.back : spec.label },
  })
  if (reversible) vars.easeReverse = true
  timeline.fromTo(spec.target, back ? spec.to : spec.from, vars, at)
}

function buildTimelines() {
  const specs = dockSpecs()
  tl = gsap.timeline({ paused: true })
  specs.forEach((s) => addSpec(tl, s, s.at, false, !scrubbing))

  const len = tl.duration()
  const backStart = len + DEMO_HOLD
  demoTl = gsap.timeline({ paused: true })
  specs.forEach((s) => addSpec(demoTl, s, s.at, false))
  specs.forEach((s) => addSpec(demoTl, s, backStart + len - (s.at + s.dur), true))
}

function takeOverFromDemo() {
  if (!demoTl) return
  const dp = demoTl.progress()
  if (dp <= 0 || dp >= 1) return
  const len = tl.duration()
  const t = demoTl.time()
  let p = 1
  if (t < len) p = t / len
  else if (t > len + DEMO_HOLD) p = 1 - (t - len - DEMO_HOLD) / len
  demoTl.pause()
  tl.progress(Math.max(0, Math.min(1, p)))
}

function swapReduced(p) {
  tl.pause().progress(p)
  if (rmFade) rmFade.kill()
  rmFade = gsap.fromTo(bg, glassVars(1 - p), Object.assign(glassVars(p), {
    duration: RM_FADE,
    ease: 'power1.out',
  }))
}

function dock() {
  if (!tl || scrubbing || isDocked) return
  isDocked = true
  header.classList.add(DOCKED_CLASS)
  takeOverFromDemo()
  if (reducedMotion) swapReduced(1)
  else tl.play()
}

function undock() {
  if (!tl || scrubbing || !isDocked) return
  isDocked = false
  header.classList.remove(DOCKED_CLASS)
  takeOverFromDemo()
  if (reducedMotion) swapReduced(0)
  else tl.reverse()
}

function currentScroll() {
  return window.pageYOffset || document.documentElement.scrollTop || 0
}

function setProgress(p) {
  tl.progress(1, true)
  if (p < 1) tl.progress(p, true)
}

function collect() {
  header = headerRef.value
  bg = bgRef.value
  nav = navRef.value
  logo = logoRef.value
  ctaEl = ctaRef.value
  tailInner = tailInnerRef.value
  linkItems = linkEls.slice(0, props.links.length).filter(Boolean)
  items = [logo].concat(linkItems, [ctaEl])
}

function setup() {
  if (destroyed || !headerRef.value) return
  collect()
  if (trigger) trigger.kill(false, true)
  trigger = null
  if (tl) tl.kill()
  if (demoTl) demoTl.kill()
  if (rmFade) rmFade.kill()

  const threshold = props.threshold
  const releaseAt = Math.max(1, threshold - HYSTERESIS)
  const scrubSpan = threshold * 2

  scrubbing = props.mode === 'scrub' && !reducedMotion
  geo = measure()
  buildTimelines()
  lastWidth = header.getBoundingClientRect().width

  const y = currentScroll()
  if (scrubbing) {
    isDocked = y >= threshold
    setProgress(Math.min(1, y / scrubSpan))
  } else {
    isDocked = isDocked ? y >= releaseAt : y >= threshold
    setProgress(isDocked ? 1 : 0)
  }
  header.classList.toggle(DOCKED_CLASS, isDocked)
  wireScroll(threshold, releaseAt, scrubSpan)
}

function wireScroll(threshold, releaseAt, scrubSpan) {
  if (scrubbing) {
    trigger = ScrollTrigger.create({
      start: 0,
      end: scrubSpan,
      scrub: SCRUB_SMOOTH,
      animation: tl,
      onUpdate(self) {
        isDocked = self.progress >= 0.5
        header.classList.toggle(DOCKED_CLASS, isDocked)
      },
    })
  } else {
    trigger = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate(self) {
        const y = self.scroll()
        if (!isDocked && y >= threshold) dock()
        else if (isDocked && y < releaseAt) undock()
      },
    })
  }
}

// --- Hide on scroll ---
function resolveHideStart() {
  const v = props.hideStart
  if (!v) return null
  const raw = v.$el || v
  return raw && raw.nodeType === 1 ? raw : null
}

function buildHideTrigger() {
  if (hideTrigger) hideTrigger.kill()
  hideTrigger = null
  const el = resolveHideStart()
  const h = headerRef.value
  if (!el || !h) return
  hideTrigger = ScrollTrigger.create({
    trigger: el,
    start: 'top top',
    end: 'max',
    onUpdate(self) {
      h.classList.toggle(HIDDEN_CLASS, self.direction === 1)
    },
    onLeaveBack() {
      h.classList.remove(HIDDEN_CLASS)
    },
  })
}

// --- Event listeners ---
function handleResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    if (destroyed || !headerRef.value) return
    if (headerRef.value.getBoundingClientRect().width === lastWidth) return
    setup()
  }, RESIZE_DEBOUNCE)
}

function handleVisibility() {
  if (document.hidden) gsap.globalTimeline.pause()
  else gsap.globalTimeline.resume()
}

// --- Public API ---
function demo() {
  if (!demoTl || isDocked || tl.progress() > 0 || demoTl.isActive()) return null
  demoTl.restart(true, false)
  return demoTl
}

watch(() => props.hideStart, buildHideTrigger, { flush: 'post' })

watch(
  () => [props.threshold, props.duration, props.ease, props.mode, props.offset, props.mark, props.wordmark, props.links.length],
  async () => {
    if (!isReady) return
    await nextTick()
    setup()
  }
)

onMounted(() => {
  window.addEventListener('resize', handleResize)
  document.addEventListener('visibilitychange', handleVisibility)

  if (document.readyState !== 'complete') {
    loadHandler = () => { if (isReady) setup() }
    window.addEventListener('load', loadHandler, { once: true })
  }

  mm = gsap.matchMedia()
  mm.add(
    {
      reduce: '(prefers-reduced-motion: reduce)',
      motion: '(prefers-reduced-motion: no-preference)',
    },
    (ctx) => {
      reducedMotion = !!ctx.conditions.reduce
      if (isReady) rafId = requestAnimationFrame(setup)
    }
  )

  setup()
  isReady = true
  buildHideTrigger()
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => setup())
  }
})

onBeforeUnmount(() => {
  destroyed = true
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('visibilitychange', handleVisibility)
  if (loadHandler) window.removeEventListener('load', loadHandler)
  clearTimeout(resizeTimer)
  cancelAnimationFrame(rafId)
  if (mm) mm.revert()
  if (trigger) trigger.kill(false, true)
  if (hideTrigger) hideTrigger.kill()
  if (tl) tl.kill()
  if (demoTl) demoTl.kill()
  if (rmFade) rmFade.kill()
  trigger = hideTrigger = tl = demoTl = rmFade = null
  if (header) {
    gsap.set([bg, nav, tailInner].concat(items).filter(Boolean), { clearProps: 'all' })
    header.classList.remove(DOCKED_CLASS, HIDDEN_CLASS, MEASURE_CLASS)
  }
})

defineExpose({ dock, undock, refresh: setup, demo })
</script>

<template>
  <header
    ref="headerRef"
    class="fnb_wrap"
    data-anm-floating-navbar
    :data-anm-dock-threshold="threshold"
    :data-anm-dock-duration="duration"
    :data-anm-dock-ease="ease"
    :data-anm-dock-mode="mode"
    :data-anm-dock-offset="offset"
    :data-anm-dock-mark="mark"
  >
    <div ref="bgRef" class="fnb_bg" data-anm-fnb-bg aria-hidden="true"></div>

    <nav ref="navRef" class="fnb_nav" data-anm-fnb-nav aria-label="Main">
      <a ref="logoRef" class="fnb_logo" data-anm-fnb-logo href="#" :aria-label="wordmark.trim()">
        <span class="fnb_logo_text" data-anm-fnb-logo-text aria-hidden="true">
          <span class="fnb_logo_mark">{{ markPart }}</span>
          <span v-if="tailPart" class="fnb_logo_tail"><span ref="tailInnerRef" class="fnb_logo_tail_inner">{{ tailPart }}</span></span>
        </span>
      </a>

      <ul class="fnb_links">
        <li v-for="(link, i) in links" :key="link.label" class="fnb_links_item">
          <a :ref="(el) => setLinkRef(el, i)" class="fnb_link" data-anm-fnb-link :href="link.href">{{ link.label }}</a>
        </li>
      </ul>

      <a ref="ctaRef" class="fnb_cta" data-anm-fnb-cta :href="cta.href">{{ cta.label }}</a>
    </nav>
  </header>
</template>
