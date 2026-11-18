<script>
// Module scope: defineProps() is hoisted and cannot reference <script setup>
// locals - defaults must live in a plain script block.
const DEFAULT_STEPS = [
  {
    num: '01',
    title: 'Scan',
    text: 'Both feet are scanned in store, standing and mid-stride.',
    image: 'https://annnimate.b-cdn.net/preview-assets/vanta/product_shoe_01.jpg?width=800',
    alt: 'A running shoe in tan and cream',
  },
  {
    num: '02',
    title: 'Cut',
    text: 'A last is milled to the scan and the upper is cut around it.',
    image: 'https://annnimate.b-cdn.net/preview-assets/vanta/texture_fabric-macro_05.jpg?width=800',
    alt: 'Close-up of grey technical fabric',
  },
  {
    num: '03',
    title: 'Build',
    text: 'Sole, plate and upper are bonded by hand in Berlin.',
    image: 'https://annnimate.b-cdn.net/preview-assets/vanta/product_shoe_05.jpg?width=800',
    alt: 'A finished running shoe with a white sole',
  },
  {
    num: '04',
    title: 'Run',
    text: 'Delivered in twelve days, with a second fitting after fifty kilometres.',
    image: 'https://annnimate.b-cdn.net/preview-assets/vanta/action_runner_01.jpg?width=800',
    alt: 'A runner mid-stride on a red track',
  },
]
</script>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, DrawSVGPlugin, CustomEase)

// Process Rail - a how-it-works row on a line. The root is a scroll track and
// the stage inside it is CSS position: sticky (no JS pin). One scrubbed
// timeline moves the bead along the line and draws the line up to it; each
// step's arrival (card tier, image, number) plays in seconds when the bead
// reaches it and plays back out when the page scrolls above it.
// Props derived from attributes.json configurables.
const props = defineProps({
  className: { type: String, default: '' },
  // [{ num, title, text, image, alt }] - image is optional
  steps: { type: Array, default: () => DEFAULT_STEPS },
  // scrub catch-up in seconds; 0 locks the bead to the scroll
  scrub: { type: Number, default: 0.6 },
  // bead diameter, px
  beadSize: { type: Number, default: 10 },
  // hold the stage with CSS sticky while the track scrolls past (desktop only)
  sticky: { type: Boolean, default: true },
  // seconds between the card brightening, its image coming in and its number rolling
  stagger: { type: Number, default: 0.08 },
  // comma-separated viewports to disable on
  disable: { type: String, default: '' },
})

const EASE = 'annnimate'
// extra scroll the sticky stage holds for, in viewport heights
const TRACK_VH = 200
// a click scrolls just past the step's anchor, so the step is reached
const ARRIVE = 0.02
// only the bead and the line are scrubbed; a step's arrival plays in seconds
const CARD_DUR = 0.5
const MEDIA_DUR = 0.8
const ROLL_DUR = 0.6
const ROLL_STAGGER = 0.05
// opacity tiers: not reached yet, already passed, active is 1
const UPCOMING = 0.42
const VISITED = 0.72
// a step's image scales up from MEDIA_FROM when the bead reaches it, then stays
const MEDIA_FROM = 0.9
// on mobile the bead reaches a step's number as that number crosses this height
const MOBILE_READ = '60%'
const BREAKPOINTS = {
  mobile: '(max-width: 479px)',
  landscape: '(orientation: landscape) and (max-width: 767px)',
  tablet: '(max-width: 991px)',
  desktop: '(min-width: 992px)',
}
// authored paths; layout() fits them to the steps at runtime
const DESKTOP_D = 'M 20 20 L 1180 20'
const MOBILE_D = 'M 40 16 L 40 544'

const containerRef = ref(null)
const railRef = ref(null)
const beadRef = ref(null)
const desktopPathRef = ref(null)
const mobilePathRef = ref(null)
const desktopGhostRef = ref(null)
const mobileGhostRef = ref(null)
const stepEls = []
const btnEls = []
const mediaEls = []
const stripEls = []

// The index text becomes one column per digit: a 1em window over a strip of
// glyphs 0..d that starts one glyph below the window (empty slot) and rolls
// up until d is in view. Non-digits stay as plain text.
function columnsFor(num) {
  let k = 0
  return String(num == null ? '' : num).trim().split('').map((ch) => {
    if (!/[0-9]/.test(ch)) return { digit: false, ch }
    const d = parseInt(ch, 10)
    const len = d + 1
    return {
      digit: true,
      k: k++,
      glyphs: Array.from({ length: len }, (_, g) => String(g)),
      hidden: 100 / len,
      target: -d * 100 / len,
    }
  })
}

const columns = computed(() => props.steps.map((s) => columnsFor(s.num)))

function setStripRef(i, k, el) {
  if (!stripEls[i]) stripEls[i] = []
  stripEls[i][k] = el
}

let mm = null
let tl = null
let current = null
let active = -1
let reduced = false
let resizeTimer = null
let stepState = []
let onResize = null
let onRefreshed = null
let onVisibility = null
// filled in onMounted; read at call time so the handle works from first render
let relayout = () => {}
let scrollToStep = () => {}

function stepClick(i) {
  scrollToStep(i)
}

onMounted(() => {
  const container = containerRef.value
  const rail = railRef.value
  const bead = beadRef.value
  const liveSteps = stepEls.filter(Boolean)
  if (!container || !rail || !bead || !liveSteps.length) return

  CustomEase.create('annnimate', 'M0,0 C0.3,0.9 0.1,1 1,1')

  const scrubValue = props.scrub > 0 ? props.scrub : true
  const sticky = props.sticky
  const stagger = props.stagger
  const disableList = String(props.disable).split(',').map((s) => s.trim()).filter(Boolean)
  const cols = columns.value

  stepState = liveSteps.map((el, i) => {
    const digits = (cols[i] || []).filter((c) => c.digit)
    return {
      el,
      btn: btnEls[i] || el,
      num: el.querySelector('[data-anm-prl-num]'),
      media: mediaEls[i] || null,
      strips: (stripEls[i] || []).filter(Boolean),
      hidden: digits.map((c) => c.hidden),
      targets: digits.map((c) => c.target),
      tier: null,
      shown: null,
      rolled: null,
    }
  })

  mm = gsap.matchMedia()

  // Where each step sits on the line, as path progress. layout() measures it:
  // desktop, the middle of each step's column; mobile, each step's number.
  function anchorAt(i) {
    return current && current.anchors ? current.anchors[i] : 0
  }

  function pathFor(isMobile) {
    return (isMobile ? mobilePathRef.value : desktopPathRef.value) || desktopPathRef.value
  }

  function ghostFor(path) {
    return path === mobilePathRef.value ? mobileGhostRef.value : desktopGhostRef.value
  }

  // Fits the line to the steps and measures where each step sits on it. The
  // svg's viewBox is the element's own pixel size, so path units are pixels.
  // Desktop: the steps are equal CSS grid columns, the line runs the rail's
  // full width (its left end is the first step's left edge) and a step's
  // anchor is the middle of its column. Mobile: the steps are equal-height
  // rows and the vertical line runs from the first step's number to the last.
  function layout() {
    if (!current) return
    const path = current.path
    const svg = path.ownerSVGElement
    const rr = rail.getBoundingClientRect()
    const sr = svg.getBoundingClientRect()
    const w = Math.max(1, Math.round(sr.width))
    const h = Math.max(1, Math.round(sr.height))
    const n = stepState.length
    let d
    if (current.isMobile) {
      const ys = stepState.map((s) => {
        const r = (s.num || s.el).getBoundingClientRect()
        return Math.round(r.top - sr.top + r.height / 2)
      })
      d = 'M ' + w / 2 + ' ' + ys[0] + ' L ' + w / 2 + ' ' + ys[n - 1]
      current.anchors = stepState.map((s, i) => (n > 1 ? i / (n - 1) : 0.5))
    } else {
      d = 'M 0 ' + h / 2 + ' L ' + w + ' ' + h / 2
      current.anchors = stepState.map((s) => {
        const r = s.el.getBoundingClientRect()
        return gsap.utils.clamp(0, 1, (r.left + r.width / 2 - sr.left) / w)
      })
    }
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h)
    if (path.getAttribute('d') !== d) {
      path.setAttribute('d', d)
      const ghost = ghostFor(path)
      if (ghost) ghost.setAttribute('d', d)
    }
    const raw = MotionPathPlugin.getRawPath(path)
    MotionPathPlugin.cacheRawPathMeasurements(raw)
    const toRail = (pt) => ({ x: sr.left - rr.left + pt.x, y: sr.top - rr.top + pt.y })
    current.pts = stepState.map((s, i) => toRail(MotionPathPlugin.getPositionOnPath(raw, anchorAt(i))))
    current.start = toRail(MotionPathPlugin.getPositionOnPath(raw, 0))
    current.end = toRail(MotionPathPlugin.getPositionOnPath(raw, 1))
  }

  function stepIndexAt(progress) {
    // nothing is reached before the page has scrolled into the track, even
    // where the line starts exactly on the first step (mobile)
    if (!tl || progress <= 0) return -1
    const t = progress * tl.duration()
    let idx = -1
    stepState.forEach((s, i) => { if (t >= anchorAt(i) - 0.0001) idx = i })
    return idx
  }

  // The bead's position picks the active step; what a step does on arrival is
  // a normal tween, not scrubbed. Reached steps keep their number and image,
  // and scrolling back above a step plays its arrival back out.
  function setActive(i) {
    if (i === active) return
    active = i
    stepState.forEach((s, k) => {
      if (k === i) s.btn.setAttribute('aria-current', 'step')
      else s.btn.removeAttribute('aria-current')
      const reached = k <= i
      setTier(s, k === i ? 1 : (reached ? VISITED : UPCOMING))
      showMedia(s, reached)
      rollNumber(s, reached)
    })
  }

  // Tear-down without playing anything back; the next build parks every step.
  function clearActive() {
    active = -1
    stepState.forEach((s) => {
      s.btn.removeAttribute('aria-current')
      gsap.killTweensOf([s.el, s.media].concat(s.strips).filter(Boolean))
    })
  }

  function setTier(s, opacity) {
    if (s.tier === opacity) return
    s.tier = opacity
    if (reduced) {
      gsap.set(s.el, { opacity })
      return
    }
    gsap.to(s.el, {
      opacity, duration: CARD_DUR, ease: EASE, overwrite: true,
      data: { label: 'Step card changes tier' },
    })
  }

  function showMedia(s, reached) {
    if (!s.media || s.shown === reached) return
    s.shown = reached
    const to = reached ? { opacity: 1, scale: 1 } : { opacity: 0, scale: MEDIA_FROM }
    if (reduced) {
      gsap.set(s.media, to)
      return
    }
    gsap.to(s.media, Object.assign(to, {
      duration: reached ? MEDIA_DUR : MEDIA_DUR * 0.6,
      delay: reached ? stagger : 0,
      ease: EASE, overwrite: true, force3D: true,
      data: { label: 'Step image ' + (reached ? 'fades and scales in' : 'fades out') },
    }))
  }

  // Digits roll up into their slot when the step is reached and back down out
  // of it when the page scrolls above the step.
  function rollNumber(s, reached) {
    if (!s.strips.length || s.rolled === reached) return
    s.rolled = reached
    const to = (k) => (reached ? s.targets[k] : s.hidden[k])
    if (reduced) {
      s.strips.forEach((strip, k) => gsap.set(strip, { yPercent: to(k) }))
      return
    }
    gsap.to(s.strips, {
      yPercent: (k) => to(k),
      duration: ROLL_DUR,
      delay: reached ? stagger * 2 : 0,
      ease: EASE,
      stagger: reached ? ROLL_STAGGER : -ROLL_STAGGER,
      overwrite: true,
      force3D: true,
      data: { label: 'Step number rolls ' + (reached ? 'in' : 'out') },
    })
  }

  // The scrub stays the single source of truth: a click only moves the
  // page to the scroll position where that step has arrived.
  scrollToStep = (i) => {
    if (!tl || !tl.scrollTrigger || i < 0 || i >= stepState.length) return
    const st = tl.scrollTrigger
    const t = Math.min(tl.duration(), anchorAt(i) + ARRIVE)
    const top = st.start + (st.end - st.start) * (t / tl.duration())
    const scroller = st.scroller && st.scroller !== window ? st.scroller : window
    scroller.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
  }

  // No ScrollTrigger pin anywhere. Desktop (unless sticky is false): the root
  // is a tall track and the stage inside it is CSS position: sticky, so the
  // scrub simply runs from the track's top to its bottom. Phones never stick:
  // the track runs from the first step's number to the last crossing
  // MOBILE_READ, clamped to the page.
  function makeTrigger() {
    const base = {
      scrub: scrubValue,
      invalidateOnRefresh: true,
      onRefreshInit: layout,
      onUpdate: (self) => setActive(stepIndexAt(self.progress)),
    }
    if (current.isMobile) {
      return Object.assign(base, {
        trigger: rail,
        start: () => 'clamp(top+=' + Math.round(current.pts[0].y) + ' ' + MOBILE_READ + ')',
        end: () => 'clamp(top+=' + Math.round(current.pts[current.pts.length - 1].y) + ' ' + MOBILE_READ + ')',
      })
    }
    if (sticky) {
      return Object.assign(base, { trigger: container, start: 'top top', end: 'bottom bottom' })
    }
    return Object.assign(base, { trigger: container, start: 'top 80%', end: 'bottom 20%' })
  }

  // Rest before the bead has reached a step: dim, empty number slot, image
  // hidden and scaled down.
  function parkRest() {
    stepState.forEach((s) => {
      gsap.killTweensOf([s.el, s.media].concat(s.strips).filter(Boolean))
      gsap.set(s.el, { opacity: UPCOMING })
      if (s.media) gsap.set(s.media, { opacity: 0, scale: MEDIA_FROM, force3D: true })
      s.strips.forEach((strip, k) => gsap.set(strip, { yPercent: s.hidden[k] }))
      s.tier = UPCOMING
      s.shown = false
      s.rolled = false
    })
  }

  // Everything readable at once: the disabled-viewport state. The line is
  // drawn in full and the bead sits at its end.
  function showAll() {
    stepState.forEach((s) => {
      gsap.killTweensOf([s.el, s.media].concat(s.strips).filter(Boolean))
      gsap.set(s.el, { opacity: 1 })
      if (s.media) gsap.set(s.media, { opacity: 1, scale: 1 })
      s.strips.forEach((strip, k) => gsap.set(strip, { yPercent: s.targets[k] }))
      s.tier = 1
      s.shown = true
      s.rolled = true
    })
    gsap.set(current.path, { drawSVG: '0% 100%' })
    gsap.set(bead, { x: current.end.x, y: current.end.y, xPercent: -50, yPercent: -50 })
  }

  // One scrubbed timeline. The bead's leg is a single explicit 0 -> 1 path
  // tween and the line draws 0% -> 100% over the same span, so the bead is
  // always the end of the line and each step's label sits exactly where the
  // bead reaches its anchor.
  function buildTimeline() {
    const path = current.path
    const t = gsap.timeline({
      defaults: { ease: EASE, force3D: true },
      scrollTrigger: makeTrigger(),
    })

    t.to(bead, {
      motionPath: { path, align: path, alignOrigin: [0.5, 0.5], autoRotate: false, start: 0, end: 1 },
      ease: 'none',
      duration: 1,
      // render the start now, so the bead sits on the line before any scroll
      immediateRender: true,
      data: { label: 'Bead rides the line' },
    }, 0)

    t.fromTo(path,
      { drawSVG: '0% 0%' },
      {
        drawSVG: '0% 100%',
        ease: 'none',
        force3D: false,
        duration: 1,
        data: { label: 'Line draws up to the bead' },
      }, 0)

    // step arrivals are not on this timeline: onUpdate -> setActive plays them
    stepState.forEach((s, i) => {
      t.addLabel('step' + (i + 1), anchorAt(i))
    })

    return t
  }

  // Reduced motion: no travel, no tweens. The scrub still jumps the bead to
  // the step it has reached with the line drawn up to it, and each step's
  // card, image and number switch without moving.
  function buildReduced() {
    const t = gsap.timeline({ scrollTrigger: makeTrigger() })
    stepState.forEach((s, i) => {
      const at = anchorAt(i)
      const when = i === 0 ? 0 : at
      t.set(current.path, { drawSVG: '0% ' + at * 100 + '%' }, when)
      t.set(bead, {
        x: () => current.pts[i].x,
        y: () => current.pts[i].y,
        xPercent: -50, yPercent: -50,
      }, when)
    })
    return t
  }

  relayout = () => {
    layout()
    ScrollTrigger.refresh()
  }

  // Lay out again once ScrollTrigger's refresh is done (sizes are final then).
  onRefreshed = () => {
    if (current) layout()
  }

  onResize = () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(relayout, 150)
  }

  onVisibility = () => {
    if (document.hidden) gsap.globalTimeline.pause()
    else gsap.globalTimeline.resume()
  }

  window.addEventListener('resize', onResize)
  ScrollTrigger.addEventListener('refresh', onRefreshed)
  document.addEventListener('visibilitychange', onVisibility)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (mm) relayout() })

  container.style.setProperty('--prl-bead', props.beadSize + 'px')

  // Mobile/desktop, reduced-motion and the disable-viewport list are tiled
  // into ONE matchMedia call, so any change tears down the previous build
  // (GSAP reverts the last callback's return value) before rebuilding.
  const conditions = {
    isMobile: '(max-width: 767px)',
    isDesktop: '(min-width: 768px)',
    isReduced: '(prefers-reduced-motion: reduce)',
    isFull: '(prefers-reduced-motion: no-preference)',
  }
  const disableQuery = disableList.map((k) => BREAKPOINTS[k]).filter(Boolean).join(', ')
  if (disableQuery) conditions.isDisabledViewport = disableQuery

  mm.add(conditions, (context) => {
    const isMobile = !!context.conditions.isMobile
    const disabled = !!context.conditions.isDisabledViewport
    reduced = !!context.conditions.isReduced

    current = { isMobile, path: pathFor(isMobile), pts: [] }
    // the track only grows tall where the stage sticks
    container.style.setProperty('--prl-track', !isMobile && sticky ? (100 + TRACK_VH) + 'vh' : 'auto')
    layout()

    if (disabled) {
      showAll()
    } else if (reduced) {
      parkRest()
      tl = buildReduced()
    } else {
      parkRest()
      tl = buildTimeline()
    }

    return () => {
      if (tl) {
        if (tl.scrollTrigger) tl.scrollTrigger.kill(true)
        tl.kill()
        tl = null
      }
      gsap.set(bead, { clearProps: 'transform' })
      ;[desktopPathRef.value, mobilePathRef.value].forEach((p) => {
        if (p) gsap.set(p, { clearProps: 'strokeDasharray,strokeDashoffset' })
      })
      clearActive()
      current = null
    }
  })
})

onUnmounted(() => {
  clearTimeout(resizeTimer)
  if (onResize) window.removeEventListener('resize', onResize)
  if (onRefreshed) ScrollTrigger.removeEventListener('refresh', onRefreshed)
  if (onVisibility) document.removeEventListener('visibilitychange', onVisibility)
  mm?.revert()
  mm = null
})

defineExpose({
  refresh: () => relayout(),
  scrollTo: (i) => scrollToStep(i),
})
</script>

<template>
  <section
    ref="containerRef"
    :class="['prl_wrap', className]"
    data-anm-process-rail
  >
    <div class="prl_stage">
      <div ref="railRef" class="prl_rail" data-anm-prl-rail>
        <svg class="prl_svg prl_svg_desktop" viewBox="0 0 1200 40" aria-hidden="true" focusable="false">
          <path ref="desktopGhostRef" class="prl_path_ghost" :d="DESKTOP_D" />
          <path ref="desktopPathRef" class="prl_path" :d="DESKTOP_D" data-anm-prl-path="desktop" />
        </svg>

        <svg class="prl_svg prl_svg_mobile" viewBox="0 0 80 560" aria-hidden="true" focusable="false">
          <path ref="mobileGhostRef" class="prl_path_ghost" :d="MOBILE_D" />
          <path ref="mobilePathRef" class="prl_path" :d="MOBILE_D" data-anm-prl-path="mobile" />
        </svg>

        <span ref="beadRef" class="prl_bead" data-anm-prl-bead></span>

        <ol class="prl_steps">
          <li
            v-for="(step, i) in steps"
            :key="i"
            :ref="(el) => { stepEls[i] = el }"
            class="prl_step"
            data-anm-prl-step
          >
            <button
              :ref="(el) => { btnEls[i] = el }"
              type="button"
              class="prl_step_btn"
              @click="stepClick(i)"
            >
              <span class="prl_step_num" data-anm-prl-num aria-hidden="true">
                <template v-for="(col, c) in columns[i]" :key="c">
                  <span v-if="col.digit" class="prl_col">
                    <span :ref="(el) => setStripRef(i, col.k, el)" class="prl_strip">
                      <span v-for="g in col.glyphs" :key="g" class="prl_glyph">{{ g }}</span>
                    </span>
                  </span>
                  <span v-else>{{ col.ch }}</span>
                </template>
              </span>
              <span class="prl_step_title">{{ step.title }}</span>
              <span class="prl_step_text">{{ step.text }}</span>
              <span
                v-if="step.image"
                :ref="(el) => { mediaEls[i] = el }"
                class="prl_step_media"
                data-anm-prl-media
              >
                <img :src="step.image" :alt="step.alt || ''" loading="lazy" />
              </span>
            </button>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>
