<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { gsap } from 'gsap'

const props = defineProps({
  color: { type: String, default: '#101010' },
  weight: { type: Number, default: 1 },
  frequency: { type: Number, default: 2.6 },
  damping: { type: Number, default: 0.72 },
  sensitivity: { type: Number, default: 1 },
  maxAmplitude: { type: Number, default: 38 },
  disable: { type: String, default: '' },
})

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

function isDisabledOnViewport(disableSpec) {
  if (!disableSpec) return false
  const breakpoints = {
    mobile: '(max-width: 479px)',
    landscape: '(orientation: landscape) and (max-width: 767px)',
    tablet: '(max-width: 991px)',
    desktop: '(min-width: 992px)',
  }
  return disableSpec.split(',').some((v) => {
    const q = breakpoints[v.trim()]
    return q && window.matchMedia(q).matches
  })
}

const containerRef = ref(null)
const svgRef = ref(null)
const pathRef = ref(null)

let liveTl = null
let demoTl = null
let ac = null
let ro = null
let mm = null
let resizeTimer = null
let flickFn = null
let demoFn = null

// Imperative DOM builder ported straight from the vanilla instance closure -
// no gsap.context(), the path attributes are written directly, never through
// reactive state.
function init() {
  const container = containerRef.value
  const svg = svgRef.value
  const path = pathRef.value
  if (!container || !svg || !path || isDisabledOnViewport(props.disable)) return

  // --- 2. Config ---
  const lineColor       = props.color || '#101010'
  const weightPx        = clamp(props.weight, 0.25, 8)
  const freqHz          = clamp(props.frequency, 0.1, 12)
  const dampingSec      = clamp(props.damping, 0.05, 6)
  const sensitivityMult = Math.max(0, props.sensitivity)
  const ampMax          = Math.max(0, props.maxAmplitude)

  // --- 3. Constants ---
  // Swing (px) the string gains per px/s of pointer speed. 800px/s, an ordinary sweep, gives about 11px.
  const SPEED_TO_AMP = 0.014
  const AMP_MIN      = 3
  // The string leaves fast and takes its time coming back. The ring lasts a few damping times,
  // and the elastic period is set so it swings at the configured frequency.
  const ATTACK_DUR   = 0.09
  const ATTACK_EASE  = 'sine.out'
  const RING_TAUS    = 4.5
  const RING_DUR     = dampingSec * RING_TAUS
  const RING_EASE    = 'elastic.out(1, ' + clamp(1 / (freqHz * RING_DUR), 0.05, 1).toFixed(3) + ')'
  // The ends are pinned, so a flick right at an end would fold the line on itself.
  const FLICK_X_MIN  = 0.12
  // A sideways swipe never crosses a horizontal line, so a finger close to it flicks it once per swipe.
  const TOUCH_REACH  = 26
  const SWIPE_MIN    = 14
  const SPEED_DT_MIN = 0.004
  const RM_GAIN      = 0.4
  const RM_DUR       = 0.6
  const RESIZE_DEBOUNCE = 150
  const DEMO_X       = 0.36
  const DEMO_GAIN    = 0.7

  // --- 4. State ---
  // bend is the one thing that moves: where the string is held (x) and how far off its rest line (y).
  const bend = { x: 0, y: 0 }
  let width      = 0
  let midY       = 0
  let isReduced  = false
  let prevX      = null
  let prevY      = null
  let prevT      = 0
  let touchStart = null
  let touchDone  = false

  // --- 5. Helpers ---
  // One quadratic curve, pinned at both ends. The curve passes halfway to its control point,
  // so the control point sits at twice the bend.
  function draw() {
    path.setAttribute('d', 'M0,' + midY + ' Q' + bend.x.toFixed(2) + ',' + (midY + bend.y * 2).toFixed(2) + ' ' + width + ',' + midY)
  }

  function measure() {
    width = container.clientWidth
    const height = container.clientHeight
    // Half-pixel centre, so an odd-width hairline lands on the pixel grid and stays sharp.
    midY = Math.round(height / 2) + (Math.round(weightPx) % 2 ? 0.5 : 0)
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height)
    bend.x = clamp(bend.x || width / 2, width * FLICK_X_MIN, width * (1 - FLICK_X_MIN))
    draw()
  }

  // --- 6. Animation routines ---
  // Away fast, back on an elastic ease. Starting from wherever the string is right now means a
  // second flick while it still rings never snaps it.
  function buildFlick(x, amp, paused) {
    const tl = gsap.timeline({ paused: !!paused, onUpdate: draw })
    if (isReduced) {
      tl.to(bend, { x: x, y: amp * RM_GAIN, duration: ATTACK_DUR, ease: ATTACK_EASE, data: { label: 'String bends' } })
        .to(bend, { y: 0, duration: RM_DUR, ease: 'expo.out', data: { label: 'String settles' } })
      return tl
    }
    tl.to(bend, { x: x, y: amp, duration: ATTACK_DUR, ease: ATTACK_EASE, data: { label: 'String pulled away' } })
      .to(bend, { y: 0, duration: RING_DUR, ease: RING_EASE, data: { label: 'String rings back to rest' } })
    return tl
  }

  // x in px along the string, strength 0-1 of the max amplitude, direction +1 down / -1 up.
  function flick(x, strength, direction) {
    const at  = clamp(x === undefined ? width / 2 : x, width * FLICK_X_MIN, width * (1 - FLICK_X_MIN))
    const amp = clamp((strength === undefined ? 0.6 : strength) * ampMax, 0, ampMax) * (direction < 0 ? -1 : 1)
    if (demoTl) demoTl.pause()
    if (liveTl) liveTl.kill()
    liveTl = buildFlick(at, amp, false)
  }

  function buildDemo() {
    if (demoTl) demoTl.kill()
    demoTl = buildFlick(width * DEMO_X, ampMax * DEMO_GAIN, true)
  }

  // One pass for the Timeline inspector: pre-built and paused, never played on its own.
  function demo() {
    if (!demoTl || (liveTl && liveTl.isActive())) return null
    if (liveTl) liveTl.kill()
    bend.y = 0
    demoTl.restart(true, false)
    return demoTl
  }

  function onPointerMove(e) {
    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const t = e.timeStamp / 1000
    if (prevY !== null) {
      const dt    = Math.max(t - prevT, SPEED_DT_MIN)
      const speed = Math.hypot(x - prevX, y - prevY) / dt
      const amp   = clamp(speed * SPEED_TO_AMP * sensitivityMult, AMP_MIN, ampMax)
      const crossed = (prevY - midY) * (y - midY) < 0
      if (crossed) {
        flick(x, amp / (ampMax || 1), y > prevY ? 1 : -1)
      } else if (e.pointerType === 'touch' && !touchDone && touchStart !== null
        && Math.abs(y - midY) < TOUCH_REACH && Math.abs(x - touchStart) > SWIPE_MIN) {
        touchDone = true
        flick(x, amp / (ampMax || 1), y > midY ? -1 : 1)
      }
    } else if (e.pointerType === 'touch') {
      touchStart = x
      touchDone = false
    }
    prevX = x
    prevY = y
    prevT = t
  }

  function onPointerEnd() {
    prevX = null
    prevY = null
    touchStart = null
  }

  // --- 7. Event listeners ---
  ac = new AbortController()
  const listen = { signal: ac.signal }
  container.addEventListener('pointermove', onPointerMove, listen)
  container.addEventListener('pointerleave', onPointerEnd, listen)
  container.addEventListener('pointercancel', onPointerEnd, listen)
  container.addEventListener('pointerup', onPointerEnd, listen)

  function onResize() {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (liveTl) liveTl.kill()
      bend.y = 0
      measure()
      buildDemo()
    }, RESIZE_DEBOUNCE)
  }
  ro = new ResizeObserver(onResize)
  ro.observe(container)

  // A hidden tab should not keep a ring going; it picks up where it left off.
  document.addEventListener('visibilitychange', () => {
    if (!liveTl) return
    if (document.hidden) liveTl.pause(); else liveTl.resume()
  }, listen)

  // --- 8. Initial DOM state ---
  path.setAttribute('stroke', lineColor)
  path.setAttribute('stroke-width', weightPx)
  measure()

  // --- 9. Reduced motion ---
  // One small bend, no ringing.
  mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: reduce)', () => {
    isReduced = true
    buildDemo()
    return () => { isReduced = false; buildDemo() }
  })
  buildDemo()

  // --- 10. Public API ---
  flickFn = flick
  demoFn = demo
}

function teardown() {
  if (liveTl) { liveTl.kill(); liveTl = null }
  if (demoTl) { demoTl.kill(); demoTl = null }
  clearTimeout(resizeTimer)
  if (ac) { ac.abort(); ac = null }
  if (ro) { ro.disconnect(); ro = null }
  if (mm) { mm.revert(); mm = null }
  flickFn = null
  demoFn = null
}

onMounted(() => {
  if (typeof window === 'undefined' || !containerRef.value) return
  init()

  window.Anm = window.Anm || {}
  window.Anm.ElasticDivider = {
    // Vue re-renders reactively - refresh is a no-op kept for API parity
    // with the vanilla instance-array pattern.
    refresh: function () {},
    flick: function (x, strength, direction) { flickFn && flickFn(x, strength, direction) },
    demo: function () { return demoFn ? demoFn() : null },
  }
})

watch(
  () => [props.color, props.weight, props.frequency, props.damping, props.sensitivity, props.maxAmplitude, props.disable],
  () => {
    teardown()
    init()
  }
)

onBeforeUnmount(() => {
  teardown()
  if (window.Anm && window.Anm.ElasticDivider) delete window.Anm.ElasticDivider
})

defineExpose({
  flick: (x, strength, direction) => flickFn && flickFn(x, strength, direction),
  demo: () => (demoFn ? demoFn() : null),
})
</script>

<template>
  <div
    ref="containerRef"
    class="eldv_divider"
    data-anm-elastic-divider
    :data-anm-color="color"
    :data-anm-weight="weight"
    :data-anm-frequency="frequency"
    :data-anm-damping="damping"
    :data-anm-sensitivity="sensitivity"
    :data-anm-max-amplitude="maxAmplitude"
    :data-anm-disable="disable"
  >
    <svg ref="svgRef" class="eldv_svg" data-anm-elastic-divider-svg aria-hidden="true" focusable="false">
      <path ref="pathRef" class="eldv_path" data-anm-elastic-divider-path fill="none" stroke-linecap="round"></path>
    </svg>
  </div>
</template>
