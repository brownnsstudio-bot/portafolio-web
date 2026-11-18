<script>
// Module scope: defineProps() is hoisted and cannot reference
// <script setup> locals - defaults must live in a plain script block.
const DEFAULT_PLANS = [
  {
    name: 'Club',
    tint: 'silver',
    monthly: 20,
    yearly: 199,
    popular: false,
    features: [
      'Weekly training plans',
      'Community runs',
      'Member pricing on kit',
      'Monthly journal',
    ],
    cta: 'Join Club',
  },
  {
    name: 'Pro',
    tint: 'champagne',
    monthly: 55,
    yearly: 549,
    popular: true,
    features: [
      'Everything in Club',
      'Coach check-ins',
      'Race-day crew',
      'Recovery sessions',
      'Early access to drops',
    ],
    cta: 'Join Pro',
  },
  {
    name: 'Elite',
    tint: 'ice',
    monthly: 119,
    yearly: 1199,
    popular: false,
    features: [
      'Everything in Pro',
      'Weekly 1:1 coaching',
      'Physio and nutrition plan',
      'Training camp invites',
      'Private locker',
    ],
    cta: 'Join Elite',
  },
]
</script>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(CustomEase)
  CustomEase.create('annnimate', 'M0,0 C0.3,0.9 0.1,1 1,1')
  CustomEase.create('annnimateInOut', 'M0,0 C0.7,0 0.16,1 1,1')
}

const props = defineProps({
  className: { type: String, default: '' },
  plans: { type: Array, default: () => DEFAULT_PLANS },
  rollDuration: { type: Number, default: 0.6 },
  digitStagger: { type: Number, default: 0.04 },
  toggleDuration: { type: Number, default: 0.4 },
  shimmerDuration: { type: Number, default: 2.4 },
  savingsLabel: { type: String, default: 'Save 17%' },
  defaultPeriod: { type: String, default: 'monthly' },
  currency: { type: String, default: 'EUR' },
  showSavingsChip: { type: Boolean, default: true },
  ease: { type: String, default: 'annnimateInOut' },
  disable: { type: String, default: '' },
})

const containerRef = ref(null)
const toggleBtnRef = ref(null)
const knobRef = ref(null)
const chipRef = ref(null)
const chipInnerRef = ref(null)

let priceRefs = []
let periodRefs = []
let currencyRefs = []
let srRefs = []
let nameRefs = []

// --- Constants ---
const KNOB_SMEAR_SCALE = 1.18
const CHIP_DUR = 0.28
const DIGIT_WIDTH = '0.6em'
const PERIOD_ROLL_DUR = 0.4
let KNOB_STRETCH_DUR = 0
let KNOB_SETTLE_DUR = 0

// --- State ---
let period = 'monthly'
let reducedMotion = false
let activeTl = null
let cards = []
let shimmerLoops = []
let mm = null
let resizeTimer = null

// --- Helpers ---

function digitsOf(value) {
  return String(Math.round(value)).split('')
}

function buildDigitColumn(digitChar) {
  const col = document.createElement('span')
  col.className = 'prc_digit_col'
  const roller = document.createElement('span')
  roller.className = 'prc_digit_roller'
  for (let d = 0; d <= 9; d++) {
    const face = document.createElement('span')
    face.className = 'prc_digit_face'
    face.textContent = String(d)
    roller.appendChild(face)
  }
  col.appendChild(roller)
  gsap.set(roller, { y: -parseInt(digitChar, 10) + 'em' })
  return col
}

// Called when a toggle interrupts a running one: columns still clipping
// out are removed now, columns still clipping in snap to full width, so
// the next roll starts from a consistent column set.
function settlePrice(priceEl) {
  Array.prototype.slice.call(priceEl.querySelectorAll('[data-dropping]')).forEach((col) => {
    col.remove()
  })
  gsap.set(priceEl.children, { clearProps: 'width' })
}

// The highlight band of each name gradient sweeps across the text on a
// constant loop (Julian's call, 2026-09-01 - a deliberate exception to
// the no-idle-loop rule), offset per card so the three never sweep in
// unison. The gradient is periodic (two bands over a 200% image), so one
// linear pass from 100% to 0% shifts it by exactly one period and the
// repeat is seamless - no rest, no visible reset. Each card starts a
// third of a cycle apart.
function startShimmerLoop(nameEl, index) {
  if (!nameEl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null
  const t = gsap.fromTo(nameEl, { backgroundPosition: '100% 0%' }, {
    backgroundPosition: '0% 0%',
    duration: props.shimmerDuration,
    ease: 'none',
    repeat: -1,
    data: { label: 'Plan name shimmer loop' },
  })
  t.progress((index / 3) % 1)
  return t
}

function setPriceValue(priceEl, value) {
  priceEl.innerHTML = ''
  digitsOf(value).forEach((ch) => {
    priceEl.appendChild(buildDigitColumn(ch))
  })
}

// Rolls a price to a new value on the master timeline `tl`, at `pos`.
// Digit count can change between plans (20 -> 199): columns the new
// value no longer needs clip out and are removed on complete, columns it
// gains clip in from zero width, and the overlapping right-aligned
// columns just roll like a normal odometer, staggered from the right.
function addPriceRoll(tl, priceEl, value, pos, label) {
  const newDigits = digitsOf(value)
  const cols = Array.prototype.slice.call(priceEl.children)
  const diff = newDigits.length - cols.length

  if (diff > 0) {
    for (let i = 0; i < diff; i++) {
      const col = buildDigitColumn('0')
      gsap.set(col, { width: 0 })
      priceEl.insertBefore(col, priceEl.firstChild)
      tl.to(col, {
        width: DIGIT_WIDTH,
        duration: props.rollDuration,
        ease: 'expo.out',
        overwrite: true,
        data: { label: label + ' gains a digit' },
      }, pos)
    }
  } else if (diff < 0) {
    for (let i = 0; i < -diff; i++) {
      const col = cols[i]
      col.dataset.dropping = '1'
      tl.to(col, {
        width: 0,
        duration: props.rollDuration * 0.7,
        ease: 'expo.inOut',
        overwrite: true,
        data: { label: label + ' drops a digit' },
        onComplete: () => { col.remove() },
      }, pos)
    }
  }

  const remaining = diff < 0
    ? cols.slice(-diff)
    : Array.prototype.slice.call(priceEl.children)
  const alignDigits = newDigits
  const rollers = remaining.map((col) => col.querySelector('.prc_digit_roller'))

  tl.to(rollers, {
    y: (i) => -parseInt(alignDigits[i], 10) + 'em',
    duration: props.rollDuration,
    ease: 'expo.out',
    stagger: { each: props.digitStagger, from: 'end' },
    force3D: true,
    overwrite: true,
    data: { label: label + ' rolls to the new value' },
  }, pos)
}

// A two-face masked roll for the /mo <-> /yr period label. Both faces
// are written once at build time, so a toggle only ever tweens a y
// offset - never a textContent write on animated markup.
function buildSwap(el, textA, textB, startOnB) {
  el.innerHTML = ''
  const mask = document.createElement('span')
  mask.className = 'prc_swap'
  const a = document.createElement('span')
  a.className = 'prc_swap_face'
  a.textContent = textA
  const b = document.createElement('span')
  b.className = 'prc_swap_face prc_swap_face_next'
  b.textContent = textB
  mask.appendChild(a)
  mask.appendChild(b)
  el.appendChild(mask)
  const swap = { mask, a, b }
  gsap.set(mask, { yPercent: startOnB ? -100 : 0 })
  setSwapAria(swap, startOnB)
  return swap
}

function setSwapAria(swap, toB) {
  swap.a.setAttribute('aria-hidden', toB ? 'true' : 'false')
  swap.b.setAttribute('aria-hidden', toB ? 'false' : 'true')
}

function buildCard(i, plan) {
  const priceEl = priceRefs[i]
  const periodEl = periodRefs[i]
  const currencyEl = currencyRefs[i]
  const srEl = srRefs[i]

  if (!priceEl || !periodEl) return null

  if (currencyEl) currencyEl.textContent = props.currency

  const startOnYearly = period === 'yearly'
  const periodSwap = buildSwap(periodEl, '/mo', '/yr', startOnYearly)

  setPriceValue(priceEl, startOnYearly ? plan.yearly : plan.monthly)

  const card = {
    monthly: plan.monthly,
    yearly: plan.yearly,
    priceEl,
    periodSwap,
    srEl,
  }
  updateSrPrice(card, startOnYearly)
  return card
}

function updateSrPrice(card, toYearly) {
  if (!card.srEl) return
  const value = toYearly ? card.yearly : card.monthly
  card.srEl.textContent = props.currency + ' ' + value + ' per ' + (toYearly ? 'year' : 'month')
}

// --- Animation routines ---

function applyPeriod(newPeriod) {
  if (newPeriod === period) return null
  if (activeTl) {
    activeTl.kill()
    activeTl = null
    cards.forEach((card) => { settlePrice(card.priceEl) })
  }
  const toYearly = newPeriod === 'yearly'
  period = newPeriod
  if (toggleBtnRef.value) toggleBtnRef.value.setAttribute('aria-checked', String(toYearly))

  cards.forEach((card) => { updateSrPrice(card, toYearly) })

  if (reducedMotion) {
    const originSide = toYearly ? 'left' : 'right'
    gsap.set(knobRef.value, { transformOrigin: originSide + ' center', x: toYearly ? '100%' : '0%', scaleX: 1 })
    cards.forEach((card) => {
      setPriceValue(card.priceEl, toYearly ? card.yearly : card.monthly)
      gsap.set(card.periodSwap.mask, { yPercent: toYearly ? -100 : 0 })
      setSwapAria(card.periodSwap, toYearly)
    })
    if (chipRef.value) {
      const chipOn = props.showSavingsChip && toYearly
      gsap.set(chipRef.value, { scale: chipOn ? 1 : 0, autoAlpha: chipOn ? 1 : 0 })
    }
    return null
  }

  const originSide = toYearly ? 'left' : 'right'
  gsap.set(knobRef.value, { transformOrigin: originSide + ' center' })

  const tl = gsap.timeline({
    defaults: { force3D: true },
    onComplete: () => { activeTl = null },
  })
  activeTl = tl

  tl.to(knobRef.value, {
    x: toYearly ? '100%' : '0%',
    duration: props.toggleDuration,
    ease: props.ease,
    data: { label: 'Toggle knob travels to the new position' },
  }, 0)
  tl.to(knobRef.value, {
    scaleX: KNOB_SMEAR_SCALE,
    duration: KNOB_STRETCH_DUR,
    ease: 'power2.out',
    data: { label: 'Toggle knob stretches along the travel axis' },
  }, 0)
  tl.to(knobRef.value, {
    scaleX: 1,
    duration: KNOB_SETTLE_DUR,
    ease: 'power2.inOut',
    data: { label: 'Toggle knob snaps back to shape' },
  }, KNOB_STRETCH_DUR)

  if (chipRef.value) {
    if (toYearly && props.showSavingsChip) {
      gsap.set(chipRef.value, { autoAlpha: 1 })
      tl.to(chipRef.value, {
        scale: 1,
        duration: CHIP_DUR,
        ease: 'back.out(1.7)',
        data: { label: 'Savings chip pops in' },
      }, 0.05)
    } else {
      tl.to(chipRef.value, {
        scale: 0,
        duration: CHIP_DUR * 0.8,
        ease: 'power3.out',
        data: { label: 'Savings chip shrinks out' },
        onComplete: () => { gsap.set(chipRef.value, { autoAlpha: 0 }) },
      }, 0)
    }
  }

  cards.forEach((card, i) => {
    const label = 'Card ' + (i + 1) + ' price'
    addPriceRoll(tl, card.priceEl, toYearly ? card.yearly : card.monthly, 0, label)

    setSwapAria(card.periodSwap, toYearly)
    tl.to(card.periodSwap.mask, {
      yPercent: toYearly ? -100 : 0,
      duration: PERIOD_ROLL_DUR,
      ease: 'annnimate',
      data: { label: label + ' period label rolls' },
    }, 0.05)
  })

  return tl
}

function handleToggleClick() {
  applyPeriod(period === 'monthly' ? 'yearly' : 'monthly')
}

function handleResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    // Every measurement here is em/percentage relative - nothing to
    // remeasure, kept for symmetry with the debounced-resize rule.
  }, 150)
}

function handleVisibility() {
  if (document.hidden) gsap.globalTimeline.pause()
  else gsap.globalTimeline.resume()
}

// --- Public API ---

function getPeriod() {
  return period
}

function setPeriod(p) {
  return applyPeriod(p === 'yearly' ? 'yearly' : 'monthly')
}

// Timeline inspector demo (ADR-0011): one full toggle to the opposite
// period, then back to the default. Returns the first switch's timeline
// handle.
function demo() {
  const defaultPeriodNormalized = props.defaultPeriod === 'yearly' ? 'yearly' : 'monthly'
  const target = period === 'monthly' ? 'yearly' : 'monthly'
  const handle = applyPeriod(target)
  setTimeout(() => {
    if (period !== defaultPeriodNormalized) applyPeriod(defaultPeriodNormalized)
  }, (props.toggleDuration + props.rollDuration) * 1000 + 500)
  return handle
}

function refresh() {
  // Plans are read once at mount, mirroring the vanilla/React ports -
  // nothing to rebuild here.
}

function isDisabledOnViewport(disable) {
  if (!disable) return false
  const breakpoints = {
    mobile: '(max-width: 479px)',
    landscape: '(orientation: landscape) and (max-width: 767px)',
    tablet: '(max-width: 991px)',
    desktop: '(min-width: 992px)',
  }
  return disable.split(',').some((v) => {
    const q = breakpoints[v.trim()]
    return q && window.matchMedia(q).matches
  })
}

onMounted(() => {
  const container = containerRef.value
  if (!container || !toggleBtnRef.value || !knobRef.value) return
  if (isDisabledOnViewport(props.disable)) return

  KNOB_STRETCH_DUR = props.toggleDuration * 0.35
  KNOB_SETTLE_DUR = props.toggleDuration * 0.45

  period = props.defaultPeriod === 'yearly' ? 'yearly' : 'monthly'

  cards = props.plans.map((plan, i) => buildCard(i, plan)).filter(Boolean)
  if (!cards.length) return

  shimmerLoops = cards.map((card, i) => startShimmerLoop(nameRefs[i], i)).filter(Boolean)

  container.setAttribute('role', 'region')
  toggleBtnRef.value.setAttribute('role', 'switch')
  toggleBtnRef.value.setAttribute('aria-checked', String(period === 'yearly'))
  toggleBtnRef.value.setAttribute('aria-label', 'Billing period')

  const startOnYearly = period === 'yearly'
  gsap.set(knobRef.value, {
    transformOrigin: (startOnYearly ? 'left' : 'right') + ' center',
    x: startOnYearly ? '100%' : '0%',
    scaleX: 1,
  })
  if (chipRef.value) {
    if (chipInnerRef.value) chipInnerRef.value.textContent = props.savingsLabel
    const chipOn = props.showSavingsChip && startOnYearly
    gsap.set(chipRef.value, {
      transformOrigin: 'center center',
      yPercent: -50,
      scale: chipOn ? 1 : 0,
      autoAlpha: chipOn ? 1 : 0,
    })
  }

  mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: reduce)', () => {
    reducedMotion = true
    return () => { reducedMotion = false }
  })

  window.addEventListener('resize', handleResize)
  document.addEventListener('visibilitychange', handleVisibility)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('visibilitychange', handleVisibility)
  clearTimeout(resizeTimer)
  if (activeTl) { activeTl.kill(); activeTl = null }
  shimmerLoops.forEach((t) => t.kill())
  shimmerLoops = []
  if (mm) { mm.revert(); mm = null }
})

defineExpose({ getPeriod, setPeriod, demo, refresh })
</script>

<template>
  <section ref="containerRef" class="prc_wrap" :class="className" data-anm-pricing>
    <div class="prc_head">
      <img class="prc_logo" src="https://annnimate.b-cdn.net/preview-assets/vanta/brand/vanta-logo-light.svg" alt="Vanta">
      <h2 class="prc_title">Membership</h2>
    </div>

    <div class="prc_toggle_row">
      <button ref="toggleBtnRef" type="button" class="prc_toggle" data-anm-prc-toggle @click="handleToggleClick">
        <span ref="knobRef" class="prc_toggle_knob" data-anm-prc-knob aria-hidden="true"></span>
        <span class="prc_toggle_label">Monthly</span>
        <span class="prc_toggle_label">Yearly</span>
      </button>
      <span ref="chipRef" class="prc_chip" data-anm-prc-chip>
        <span ref="chipInnerRef" data-anm-prc-chip-inner></span>
      </span>
    </div>

    <div class="prc_cards">
      <div
        v-for="(plan, i) in plans"
        :key="plan.name"
        class="prc_card"
        :class="{ prc_card_popular: plan.popular }"
        data-anm-prc-card
        :data-anm-monthly="plan.monthly"
        :data-anm-yearly="plan.yearly"
        :data-anm-popular="plan.popular ? '' : null"
      >
        <span v-if="plan.popular" class="prc_card_badge">Popular</span>
        <div
          :ref="(el) => { if (el) nameRefs[i] = el }"
          class="prc_card_name"
          :class="'prc_name_' + plan.tint"
          data-anm-prc-name
        >{{ plan.name }}</div>
        <div class="prc_card_price">
          <span :ref="(el) => { if (el) currencyRefs[i] = el }" class="prc_price_currency" data-anm-prc-currency></span>
          <span :ref="(el) => { if (el) priceRefs[i] = el }" class="prc_price_value" data-anm-prc-price aria-hidden="true"></span>
          <span :ref="(el) => { if (el) periodRefs[i] = el }" class="prc_price_period" data-anm-prc-period aria-hidden="true"></span>
          <span :ref="(el) => { if (el) srRefs[i] = el }" class="prc_price_sr" data-anm-prc-sr></span>
        </div>
        <ul class="prc_features">
          <li v-for="(feature, fi) in plan.features" :key="fi" class="prc_feature" data-anm-prc-feature>{{ feature }}</li>
        </ul>
        <button type="button" class="prc_cta" :class="{ prc_cta_popular: plan.popular }">{{ plan.cta }}</button>
      </div>
    </div>
  </section>
</template>
