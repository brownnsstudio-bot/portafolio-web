<script>
// Module scope: defineProps() is hoisted and cannot reference <script setup>
// locals - defaults must live in a plain script block.
const VANTA = 'https://annnimate.b-cdn.net/preview-assets/vanta/'
const DEFAULT_CARDS = [
  {
    label: 'Running',
    src: VANTA + 'environment_track_04.jpg?width=1920&format=auto',
    alt: 'Lane line on a red running track',
  },
  {
    label: 'Training',
    src: VANTA + 'hero_profile_03.jpg?width=1920&format=auto',
    alt: 'Athlete in profile against orange light',
  },
  {
    label: 'Tennis',
    src: VANTA + 'texture_clay_05.jpg?width=1920&format=auto',
    alt: 'Swirls drawn into orange tennis clay',
  },
  {
    label: 'Basketball',
    src: VANTA + 'action_basketball-dunk_01.jpg?width=1920&format=auto',
    alt: 'Basketball player rising for a dunk',
  },
  {
    label: 'Recovery',
    src: VANTA + 'hero_walk_01.jpg?width=1920&format=auto',
    alt: 'Athlete walking away into warm light',
  },
]
</script>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, CustomEase)
}

// Stacking Cards - a sticky stage where each card slides up over the last
// while the page scrolls. Props derived from attributes.json configurables,
// read once at mount like the vanilla data-anm-* (refresh() re-reads them).
const props = defineProps({
  // stepHeight: Scroll distance per card, in vh (30-120)
  stepHeight: { type: Number, default: 50 },
  // scrub: Seconds the cards take to catch up with the scroll, 0 ties them to it (0-3)
  scrub: { type: Number, default: 0.5 },
  // tilt: Degrees a covered card turns as it sinks (0-6)
  tilt: { type: Number, default: 2 },
  // zoom: How far the covered photo zooms in (1-2)
  zoom: { type: Number, default: 1.2 },
  // drop: How far a covered card sinks, in percent of its height (0-60)
  drop: { type: Number, default: 20 },
  // drift: How far the incoming photo trails its card, in percent (0-30)
  drift: { type: Number, default: 10 },
  // shrink: How much a covered card closes in from its edges (0-2)
  shrink: { type: Number, default: 1 },
  // shade: How dark a covered card gets (0-1)
  shade: { type: Number, default: 0.5 },
  // radius: Corner radius of the frame and every card, in px (0-40)
  radius: { type: Number, default: 4 },
  // labelDelay: Percent of the slide-in before the incoming label rises (0-95)
  labelDelay: { type: Number, default: 60 },
  // disable: Comma-separated viewport names that get the plain list
  disable: { type: String, default: '' },
  className: { type: String, default: '' },
  ariaLabel: { type: String, default: 'Product lines' },
  // cards: Card data - {label, src, alt}; later cards slide over earlier ones
  cards: { type: Array, default: () => DEFAULT_CARDS },
})

// --- Template refs ---
const containerRef = ref(null)
const indexRef = ref(null)
// v-for function refs; a node Vue removes hands back null, so its slot clears
const cardEls = []
const clipEls = []
const figEls = []
const imgEls = []
const labelEls = []
const textEls = []
const numEls = []
const tickEls = []
function setEl(list, i, el) {
  list[i] = el
}

let instance = null

function pad2(i) {
  return (i < 10 ? '0' : '') + i
}

function initStackingCards(root) {
  // --- 1. Selectors ---
  // root is the tall scroll track; the stage inside it sticks while the
  // track scrolls past, and the cards slide through the frame in order.
  // Template refs stand in for the vanilla queries; a card without a label
  // has no label or text ref.
  const cardState = props.cards.map((_, i) => ({
    card: cardEls[i],
    clip: clipEls[i],
    fig: figEls[i],
    img: imgEls[i] || null,
    label: labelEls[i] || null,
    text: textEls[i] || null,
  }))
  const index = indexRef.value
  if (cardState.length < 2 || cardState.some((c) => !c.clip || !c.fig)) return null

  // --- 2. Config ---
  // The covered card sinks `drop` percent, shrinks by `shrink` times the
  // base clip and darkens to `shade`; its photo zooms to `zoom`, which with
  // the shared tilt turns the photo inside its shrinking frame. The incoming
  // photo trails its card by `drift` percent, and its label rises once the
  // card is `labelDelay` of the way in.
  const stepHeight = readNum(props.stepHeight, 50, 20, 150)
  const tilt = readNum(props.tilt, 2, -10, 10)
  const zoom = readNum(props.zoom, 1.2, 1, 2)
  const drop = readNum(props.drop, 20, 0, 60)
  const drift = readNum(props.drift, 10, 0, 30)
  const labelDelay = readNum(props.labelDelay, 60, 0, 95) / 100
  const shrink = readNum(props.shrink, 1, 0, 2)
  const shade = readNum(props.shade, 0.5, 0, 1)
  const radius = readNum(props.radius, 4, 0, 40)
  const scrub = readNum(props.scrub, 0.5, 0, 3)
  const disable = props.disable || ''

  // --- 3. Constants ---
  CustomEase.create('annnimate', 'M0,0 C0.3,0.9 0.1,1 1,1')
  // Share of a step the covered card's label takes to fade.
  const LABEL_OUT = 0.1
  // The incoming label and the counter play on their own clock, not the scrub.
  const LABEL_RISE_DUR = 0.8
  const LABEL_DROP_DUR = 0.4
  // clears the mask with the descender padding included
  const LABEL_HIDE = 120
  const COUNT_DUR = 0.6
  // a click holds the counter on its target until the page arrives there
  const CLICK_LOCK = 1.5
  const JUMP_DUR = 0.6
  const BREAKPOINTS = {
    mobile: '(max-width: 479px)',
    landscape: '(orientation: landscape) and (max-width: 767px)',
    tablet: '(max-width: 991px)',
    desktop: '(min-width: 992px)',
  }

  // --- 4. State ---
  const n = cardState.length
  // the template renders the counter, one number and one tick per card
  const nums = index ? numEls.slice(0, n) : []
  const ticks = index ? tickEls.slice(0, n) : []
  const risen = []
  let tl = null
  let mm = null
  let active = -1
  let lockTo = -1
  let lockUntil = 0
  let lastY = null

  // --- 5. Helpers ---
  function readNum(value, fallback, min, max) {
    const v = parseFloat(value)
    return isNaN(v) ? fallback : Math.min(max, Math.max(min, v))
  }

  function isDisabled(conditions) {
    if (!disable) return false
    return disable.split(',').some((v) => conditions[v.trim()])
  }

  function nameOf(c) {
    return c.label ? c.label.textContent.trim() : 'Card'
  }

  function scrollToY(y) {
    if (window.lenis) {
      window.lenis.scrollTo(y, { duration: JUMP_DUR, easing: (t) => 1 - Math.pow(1 - t, 3) })
      return
    }
    const scroller = document.querySelector('[data-transition-content]')
    if (scroller && scroller.scrollHeight > scroller.clientHeight) scroller.scrollTo({ top: y, behavior: 'smooth' })
    else window.scrollTo({ top: y, behavior: 'smooth' })
  }

  // --- 6. Animation routines ---
  // One step per card after the first: it slides up through the frame with
  // its photo trailing inside it, while the card under it shrinks back,
  // tilts and sinks. The scale lets the trailing photo still cover the card.
  function buildStep(out, inc, i) {
    const step = gsap.timeline({ data: { label: nameOf(inc) + ' slides over ' + nameOf(out) } })
    step.fromTo(inc.card, { yPercent: 101, y: 0 }, { yPercent: 0, y: 0, duration: 1, ease: 'none', force3D: true }, 0)
    if (drift && inc.img) {
      step.fromTo(inc.img, { yPercent: -drift, y: 0, scale: 1 + drift / 50 }, {
        yPercent: 0, y: 0, scale: 1, duration: 1, ease: 'none', force3D: true,
      }, 0)
    }
    step.fromTo(out.clip, { rotation: 0, yPercent: 0, y: 0, '--stk-c': 0 }, {
      rotation: tilt, yPercent: drop, y: 0, '--stk-c': 1, duration: 1, ease: 'none', force3D: true,
    }, 0)
    step.fromTo(out.fig, { scale: 1, rotation: 0 }, { scale: zoom, rotation: tilt, duration: 1, ease: 'none', force3D: true }, 0)
    if (out.label) step.fromTo(out.label, { opacity: 1 }, { opacity: 0, duration: LABEL_OUT, ease: 'none' }, 0)
    if (ticks[i]) step.fromTo(ticks[i], { '--stk-f': 0 }, { '--stk-f': 1, duration: 1, ease: 'none' }, 0)
    return step
  }

  function setLabel(i, up, now) {
    const text = cardState[i].text
    if (!text || risen[i] === up) return
    risen[i] = up
    const yPercent = up ? 0 : LABEL_HIDE
    if (now) gsap.set(text, { yPercent: yPercent, y: 0, overwrite: true })
    else gsap.to(text, { yPercent: yPercent, y: 0, duration: up ? LABEL_RISE_DUR : LABEL_DROP_DUR, ease: 'annnimate', overwrite: true })
  }

  // The old number leaves the way the scroll is going and the new one
  // follows it in; a change mid-roll carries on from where it is.
  function setActive(i, now) {
    if (i === active) return
    const prev = active
    const dir = i > prev ? 1 : -1
    active = i
    ticks.forEach((t, k) => {
      if (k === i) t.setAttribute('aria-current', 'true')
      else t.removeAttribute('aria-current')
    })
    if (!nums.length) return
    if (now || prev < 0) {
      nums.forEach((d, k) => gsap.set(d, { yPercent: k === i ? 0 : 100, y: 0, overwrite: true }))
      return
    }
    gsap.to(nums[prev], { yPercent: -100 * dir, y: 0, duration: COUNT_DUR, ease: 'annnimate', overwrite: true })
    gsap.fromTo(nums[i], { yPercent: 100 * dir, y: 0 }, { yPercent: 0, y: 0, duration: COUNT_DUR, ease: 'annnimate', overwrite: true })
  }

  // A scroll plays the changes; a refresh at the same scroll position only
  // sets them, so nothing plays without input.
  function sync(self) {
    const y = self.scroll()
    const now = lastY === null || y === lastY
    lastY = y
    const pos = self.progress * (n - 1)
    for (let i = 1; i < n; i++) setLabel(i, pos >= i - 1 + labelDelay, now)
    if (lockTo >= 0) {
      if (Math.round(pos) !== lockTo && performance.now() < lockUntil) return
      lockTo = -1
    }
    setActive(Math.round(pos), now)
  }

  function scrollToCard(i) {
    const st = tl && tl.scrollTrigger
    if (!st || i < 0) return
    lockTo = i
    lockUntil = performance.now() + CLICK_LOCK * 1000
    setActive(i, false)
    scrollToY(st.start + (st.end - st.start) * (i / (n - 1)))
  }

  // The track is one screen plus one step per card after the first, so the
  // stage sticks exactly while the steps run, back to back.
  function build() {
    root.classList.remove('stk_is-static')
    root.style.setProperty('--stk-n', n)
    root.style.setProperty('--stk-step', stepHeight)
    tl = gsap.timeline({
      scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: scrub || true, onUpdate: sync },
    })
    for (let i = 1; i < n; i++) tl.add(buildStep(cardState[i - 1], cardState[i], i), i - 1)
    risen.length = 0
    active = -1
    lastY = null
    sync(tl.scrollTrigger)
  }

  function teardown() {
    root.style.removeProperty('--stk-n')
    root.style.removeProperty('--stk-step')
    const rolled = nums.concat(cardState.map((c) => c.text).filter(Boolean))
    gsap.killTweensOf(rolled)
    gsap.set(rolled, { clearProps: 'transform' })
    ticks.forEach((t) => t.removeAttribute('aria-current'))
    tl = null
  }

  // --- 7. Event listeners ---
  // The ticks are template buttons (onTick), so Vue owns their click listeners.
  function onVisibility() {
    if (document.hidden) gsap.globalTimeline.pause()
    else gsap.globalTimeline.resume()
  }

  document.addEventListener('visibilitychange', onVisibility)

  // --- 8. Initial DOM state ---
  // The look-only settings are CSS variables. A prop always has a value, so
  // they are always written; the defaults match the CSS.
  root.style.setProperty('--stk-shrink', shrink)
  root.style.setProperty('--stk-shade', shade)
  root.style.setProperty('--stk-radius', radius + 'px')

  // --- 9. Reduced motion ---
  // Reduced motion and disabled viewports get the plain list of cards.
  mm = gsap.matchMedia()
  mm.add(Object.assign({
    motion: '(prefers-reduced-motion: no-preference)',
    reduce: '(prefers-reduced-motion: reduce)',
  }, BREAKPOINTS), (context) => {
    if (context.conditions.reduce || isDisabled(context.conditions)) {
      root.classList.add('stk_is-static')
      return undefined
    }
    build()
    return teardown
  })

  // --- 10. Public API ---
  return {
    scrollToCard: scrollToCard,
    kill() {
      ['--stk-shrink', '--stk-shade', '--stk-radius'].forEach((v) => root.style.removeProperty(v))
      document.removeEventListener('visibilitychange', onVisibility)
      mm.revert()
      root.classList.remove('stk_is-static')
    },
  }
}

function onTick(i) {
  if (instance) instance.scrollToCard(i)
}

// --- Public API ---
// refresh() rebuilds with the current props, like the vanilla refresh()
// picking up changed attributes
function refresh() {
  if (instance) instance.kill()
  instance = containerRef.value ? initStackingCards(containerRef.value) : null
}

function kill() {
  if (instance) instance.kill()
  instance = null
}

defineExpose({ refresh, kill })

onMounted(() => {
  if (!containerRef.value) return
  instance = initStackingCards(containerRef.value)
})

// before unmount, so the teardown still finds every node in place
onBeforeUnmount(kill)
</script>

<template>
  <section
    ref="containerRef"
    :class="['stk_section', className]"
    data-anm-stacking-cards
    :aria-label="ariaLabel"
  >
    <div class="stk_stage">
      <div class="stk_view">
        <ol class="stk_frame">
          <li
            v-for="(card, i) in cards"
            :key="i"
            :ref="(el) => setEl(cardEls, i, el)"
            class="stk_card"
            data-anm-stk-card
          >
            <div :ref="(el) => setEl(clipEls, i, el)" class="stk_clip" data-anm-stk-clip>
              <figure :ref="(el) => setEl(figEls, i, el)" class="stk_fig" data-anm-stk-fig>
                <img
                  :ref="(el) => setEl(imgEls, i, el)"
                  class="stk_img"
                  :src="card.src"
                  :alt="card.alt"
                >
                <figcaption
                  v-if="card.label"
                  :ref="(el) => setEl(labelEls, i, el)"
                  class="stk_label"
                  data-anm-stk-label
                ><span :ref="(el) => setEl(textEls, i, el)" class="stk_label_text">{{ card.label }}</span></figcaption>
              </figure>
            </div>
          </li>
        </ol>
        <nav ref="indexRef" class="stk_index" data-anm-stk-index aria-label="Card index">
          <template v-if="cards.length >= 2">
            <span class="stk_count" aria-hidden="true">
              <span class="stk_num">
                <span v-for="(card, i) in cards" :key="i" :ref="(el) => setEl(numEls, i, el)">{{ pad2(i + 1) }}</span>
              </span>
              <span class="stk_total">/ {{ pad2(cards.length) }}</span>
            </span>
            <span class="stk_ticks">
              <button
                v-for="(card, i) in cards"
                :key="i"
                :ref="(el) => setEl(tickEls, i, el)"
                class="stk_tick"
                type="button"
                :aria-label="card.label || 'Card'"
                @click="onTick(i)"
              ></button>
            </span>
          </template>
        </nav>
      </div>
    </div>
  </section>
</template>
