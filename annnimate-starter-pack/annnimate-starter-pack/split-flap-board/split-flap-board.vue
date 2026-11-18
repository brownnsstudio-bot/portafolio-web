<script>
// Module scope: defineProps() is hoisted and cannot reference <script setup>
// locals - the default result sets live here so both defineProps() and the
// component can read them.
const DEFAULT_SETS = [
  ['Berlin', 'Marathon', '02:04:58'],
  ['Tokyo', 'Sprint', '00:09:58'],
  ['Roubaix', 'Velodrome', '04:01:12'],
  ['Oslo', 'Downhill', '01:44:05'],
]
</script>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(CustomEase)
  if (!CustomEase.get('annnimate')) {
    CustomEase.create('annnimate', 'M0,0 C0.3,0.9 0.1,1 1,1')
  }
  if (!CustomEase.get('annnimateInOut')) {
    CustomEase.create('annnimateInOut', 'M0,0 C0.7,0 0.16,1 1,1')
  }
}

// duration: period of the last flap of a tile, the one that lands on target
// stagger: delay between neighbouring tiles starting their riffle
// cycles: intermediate flaps a tile passes through before landing on target
// bounce: degrees the flap rebounds off the stack after landing, 0 = dead stop
// columns: 0 sizes the board to the longest line across all sets
// disable: comma-separated viewport names to disable on
// sets: one entry per result set, each an array of row strings
const props = defineProps({
  className: { type: String, default: '' },
  duration: { type: Number, default: 0.36 },
  stagger: { type: Number, default: 0.015 },
  cycles: { type: Number, default: 2 },
  bounce: { type: Number, default: 32 },
  columns: { type: Number, default: 0 },
  disable: { type: String, default: '' },
  sets: { type: Array, default: () => DEFAULT_SETS },
})

const containerRef = ref(null)
const stageRef = ref(null)

// --- Constants ---
const FALL_FRAC = 0.4
const LAND_FRAC = 0.18
const BOUNCE_UP_FRAC = 0.16
const BOUNCE_DOWN_FRAC = 0.2
const FALL_EASE = 'power2.in'
const LAND_EASE = 'power1.in'
const GLINT_PEAK = 0.07
const GAP_SHADE = 0.45
const RIFFLE_SPEEDUP = 0.35
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'
const ROW_STAGGER = 0.12
const SHADE_PEAK = 0.55
const ARROW_HOVER_DUR = 0.35
const PERSPECTIVE = 320

// --- State ---
let refs = null
let index = 0
let master = null
let boardRowCount = 0
let boardColumns = 0
let mm = null
let onKeydown = null
const docListeners = []

// --- Helpers ---
// The drum a tile riffles on, decided by the glyph it is heading to (or the
// one it holds, when heading to a blank): digits, uppercase or lowercase,
// each with a blank flap. Punctuation has no drum.
function drumFor(fromChar, toChar) {
  const target = toChar !== ' ' ? toChar : fromChar
  if (/[0-9]/.test(target)) return ' ' + DIGITS
  if (/[A-Z]/.test(target)) return ' ' + UPPER
  if (/[a-z]/.test(target)) return ' ' + LOWER
  return ' ' + target
}

function padLine(line) {
  return line.slice(0, boardColumns).padEnd(boardColumns, ' ')
}

function targetLines(i) {
  const s = props.sets[i] || []
  const lines = []
  for (let r = 0; r < boardRowCount; r += 1) lines.push(padLine(s[r] || ''))
  return lines
}

// The characters a tile passes on its way from one glyph to the next,
// walking the drum forward and wrapping, thinned evenly to `cycles`
// intermediate flaps; always ends on the target.
function riffleSequence(fromChar, toChar) {
  const drum = drumFor(fromChar, toChar)
  const n = drum.length
  let i = Math.max(0, drum.indexOf(fromChar))
  const end = Math.max(0, drum.indexOf(toChar))
  if (fromChar === toChar) return []
  if (i === end) return [toChar]
  const seq = []
  while (i !== end) {
    i = (i + 1) % n
    seq.push(drum[i])
  }
  const steps = props.cycles + 1
  if (seq.length <= steps) return seq
  const last = seq.length - 1
  const thinned = []
  for (let s = 0; s < steps - 1; s += 1) {
    thinned.push(seq[Math.floor((s * last) / (steps - 1))])
  }
  thinned.push(seq[last])
  return thinned
}

function el(tag, className) {
  const node = document.createElement(tag)
  node.className = className
  return node
}

function charSpan(where) {
  const span = el('span', 'sfb_char sfb_char_' + where)
  span.textContent = ' '
  return span
}

function buildTile() {
  const tile = el('div', 'sfb_tile')
  tile.setAttribute('aria-hidden', 'true')
  const halfTop = el('div', 'sfb_half sfb_half_top')
  const halfBottom = el('div', 'sfb_half sfb_half_bottom')
  const flapTop = el('div', 'sfb_flap sfb_flap_top')
  const flapBottom = el('div', 'sfb_flap sfb_flap_bottom')
  const shade = el('div', 'sfb_shade')
  const glint = el('div', 'sfb_glint')
  const t = {
    el: tile,
    halfTopChar: charSpan('top'),
    halfBottomChar: charSpan('bottom'),
    flapTop: flapTop,
    flapTopChar: charSpan('top'),
    flapBottom: flapBottom,
    flapBottomChar: charSpan('bottom'),
    shade: shade,
    glint: glint,
    current: ' ',
  }
  halfTop.appendChild(t.halfTopChar)
  halfBottom.appendChild(t.halfBottomChar)
  halfBottom.appendChild(shade)
  flapTop.appendChild(t.flapTopChar)
  flapBottom.appendChild(t.flapBottomChar)
  flapBottom.appendChild(glint)
  tile.appendChild(halfTop)
  tile.appendChild(halfBottom)
  tile.appendChild(flapTop)
  tile.appendChild(flapBottom)
  return t
}

function arrowButton(dir) {
  const btn = el('button', 'sfb_arrow')
  btn.type = 'button'
  btn.setAttribute('aria-label', dir < 0 ? 'Previous result' : 'Next result')
  btn.innerHTML = '<svg class="sfb_arrow_icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="'
    + (dir < 0 ? 'M10 3L5 8L10 13' : 'M6 3L11 8L6 13')
    + '" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
  return btn
}

function setTileChar(t, ch) {
  t.halfTopChar.textContent = ch
  t.halfBottomChar.textContent = ch
  t.flapTopChar.textContent = ch
  t.flapBottomChar.textContent = ch
  t.current = ch
}

function announce() {
  refs.live.textContent = (props.sets[index] || []).join(', ')
}

// A killed run can leave a flap mid-fall. Every tile is put back to a whole
// glyph (whatever it had last committed) before the next run.
function normalizeTiles() {
  refs.rows.forEach((tiles) => {
    tiles.forEach((t) => {
      gsap.killTweensOf([t.flapTop, t.flapBottom, t.shade, t.glint])
      setTileChar(t, t.current)
      gsap.set([t.flapTop, t.flapBottom], { rotateX: 0 })
      gsap.set([t.shade, t.glint], { opacity: 0 })
    })
  })
}

// --- Animation routines ---
function buildStage() {
  const stage = stageRef.value
  stage.innerHTML = ''
  const board = el('div', 'sfb_board')
  board.setAttribute('role', 'group')
  board.setAttribute('aria-label', 'Results board')
  board.setAttribute('tabindex', '0')

  const rows = []
  for (let r = 0; r < boardRowCount; r += 1) {
    const row = el('div', 'sfb_row')
    const tiles = []
    for (let c = 0; c < boardColumns; c += 1) {
      const t = buildTile()
      row.appendChild(t.el)
      tiles.push(t)
    }
    board.appendChild(row)
    rows.push(tiles)
  }

  const pill = el('div', 'sfb_pill')
  pill.setAttribute('role', 'group')
  pill.setAttribute('aria-label', 'Result controls')
  const prevBtn = arrowButton(-1)
  const nextBtn = arrowButton(1)
  pill.appendChild(prevBtn)
  pill.appendChild(nextBtn)

  const live = el('div', 'sfb_live')
  live.setAttribute('aria-live', 'polite')

  stage.appendChild(board)
  stage.appendChild(pill)
  stage.appendChild(live)

  refs = { board, rows, prevBtn, nextBtn, live }
}

// One flap: the top flap falls to edge-on showing the outgoing glyph (the
// incoming one is already on the half behind it), the bottom flap carries
// the same fall on to the stack, bounces, and rests. Text swaps sit on
// calls so a killed timeline never leaves a half-set tile: the next run
// re-seeds from the tile's current glyph.
function addFlap(tl, t, outChar, inChar, at, period) {
  const fall = period * FALL_FRAC
  const land = period * LAND_FRAC
  const up = period * BOUNCE_UP_FRAC
  const down = period * BOUNCE_DOWN_FRAC
  tl.call(() => {
    t.flapTopChar.textContent = outChar
    t.halfTopChar.textContent = inChar
    t.flapBottomChar.textContent = inChar
    gsap.set(t.flapTop, { rotateX: 0 })
    gsap.set(t.flapBottom, { rotateX: 90 })
  }, null, at)
  tl.to(t.flapTop, { rotateX: -90, duration: fall, ease: FALL_EASE, force3D: true }, at)
  tl.to(t.shade, { opacity: SHADE_PEAK, duration: fall, ease: 'power2.in' }, at)
  tl.call(() => {
    t.halfBottomChar.textContent = inChar
    t.flapTopChar.textContent = inChar
    gsap.set(t.flapTop, { rotateX: 0 })
    t.current = inChar
  }, null, at + fall)
  tl.to(t.flapBottom, { rotateX: 0, duration: land, ease: LAND_EASE, force3D: true }, at + fall)
  if (props.bounce > 0) {
    tl.to(t.flapBottom, { rotateX: props.bounce, duration: up, ease: 'power1.out', force3D: true }, at + fall + land)
    tl.to(t.flapBottom, { rotateX: 0, duration: down, ease: 'power1.in', force3D: true }, at + fall + land + up)
    tl.to(t.glint, { opacity: GLINT_PEAK * Math.min(1, props.bounce / 32), duration: up, ease: 'power1.out' }, at + fall + land)
    tl.to(t.glint, { opacity: 0, duration: down, ease: 'power1.in' }, at + fall + land + up)
    tl.to(t.shade, { opacity: 0, duration: land, ease: 'power2.out' }, at + fall)
    tl.to(t.shade, { opacity: GAP_SHADE * Math.min(1, props.bounce / 32), duration: up, ease: 'power1.out' }, at + fall + land)
    tl.to(t.shade, { opacity: 0, duration: down, ease: 'power1.in' }, at + fall + land + up)
  } else {
    tl.to(t.shade, { opacity: 0, duration: land, ease: 'power2.out' }, at + fall)
  }
}

function flapPeriod(i, count) {
  const fast = props.duration / (1 + props.cycles * RIFFLE_SPEEDUP)
  if (count <= 1) return props.duration
  return fast + (props.duration - fast) * (i / (count - 1))
}

function buildTileTimeline(t, toChar) {
  const seq = riffleSequence(t.current, toChar)
  const tl = gsap.timeline()
  let prev = t.current
  let cursor = 0
  seq.forEach((ch, i) => {
    const period = flapPeriod(i, seq.length)
    addFlap(tl, t, prev, ch, cursor, period)
    cursor += period
    prev = ch
  })
  return tl
}

function flapTo(nextIndex) {
  const total = props.sets.length
  const target = ((nextIndex % total) + total) % total
  if (target === index) return null
  index = target
  const lines = targetLines(index)

  if (master) { master.kill(); master = null; normalizeTiles() }
  master = gsap.timeline({
    onComplete: () => { master = null; announce() },
  })

  refs.rows.forEach((tiles, r) => {
    const rowTl = gsap.timeline({
      data: { label: 'Row ' + (r + 1) + ' flaps to "' + lines[r].trim() + '"' },
    })
    let any = false
    tiles.forEach((t, c) => {
      if (t.current === lines[r][c]) return
      any = true
      rowTl.add(buildTileTimeline(t, lines[r][c]), c * props.stagger)
    })
    if (any) master.add(rowTl, r * ROW_STAGGER)
  })

  return master
}

function step(delta) {
  return flapTo(index + delta)
}

function demo() {
  if (master && master.isActive()) return null
  return step(1)
}

function animateArrowHover(btn, dir) {
  const icon = btn.querySelector('.sfb_arrow_icon')
  btn.addEventListener('mouseenter', () => {
    gsap.to(icon, { x: dir * 3, duration: ARROW_HOVER_DUR, ease: 'back.out(2)', overwrite: 'auto', force3D: true })
  })
  btn.addEventListener('mouseleave', () => {
    gsap.to(icon, { x: 0, duration: ARROW_HOVER_DUR, ease: 'expo.out', overwrite: 'auto', force3D: true })
  })
}

function next() { return step(1) }
function prev() { return step(-1) }
function goTo(i) { return flapTo(i) }

function isDisabledOnViewport() {
  if (!props.disable) return false
  const breakpoints = {
    mobile: '(max-width: 479px)',
    landscape: '(orientation: landscape) and (max-width: 767px)',
    tablet: '(max-width: 991px)',
    desktop: '(min-width: 992px)',
  }
  return props.disable.split(',').some((v) => {
    const q = breakpoints[v.trim()]
    return q && window.matchMedia(q).matches
  })
}

function handleVisibility() {
  if (document.hidden) gsap.globalTimeline.pause()
  else gsap.globalTimeline.resume()
}

onMounted(() => {
  if (!stageRef.value) return
  if (isDisabledOnViewport()) return

  boardRowCount = props.sets.reduce((m, s) => Math.max(m, s.length), 0)
  boardColumns = props.columns > 0
    ? props.columns
    : props.sets.reduce((m, s) => s.reduce((mm2, line) => Math.max(mm2, line.length), m), 1)

  buildStage()

  // --- Event listeners ---
  refs.board.addEventListener('click', () => step(1))
  refs.prevBtn.addEventListener('click', () => step(-1))
  refs.nextBtn.addEventListener('click', () => step(1))
  animateArrowHover(refs.prevBtn, -1)
  animateArrowHover(refs.nextBtn, 1)

  onKeydown = (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1) }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); step(1) }
  }
  refs.board.addEventListener('keydown', onKeydown)

  document.addEventListener('visibilitychange', handleVisibility)
  docListeners.push(['visibilitychange', handleVisibility])

  // --- Initial DOM state ---
  const first = targetLines(0)
  refs.rows.forEach((tiles, r) => {
    tiles.forEach((t, c) => {
      setTileChar(t, first[r][c])
      gsap.set([t.flapTop, t.flapBottom], { rotateX: 0, transformPerspective: PERSPECTIVE, force3D: true })
      gsap.set([t.shade, t.glint], { opacity: 0 })
    })
  })
  announce()

  // --- Reduced motion ---
  mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.globalTimeline.timeScale(20)
  })
})

onBeforeUnmount(() => {
  for (const [event, handler] of docListeners) {
    document.removeEventListener(event, handler)
  }
  docListeners.length = 0
  if (refs && refs.board && onKeydown) {
    refs.board.removeEventListener('keydown', onKeydown)
  }
  if (master) master.kill()
  if (mm) { mm.revert(); mm = null }
})

defineExpose({ next, prev, goTo, demo })
</script>

<template>
  <section
    ref="containerRef"
    :class="['sfb_wrap', className]"
    data-anm-split-flap-board
    :data-anm-duration="duration"
    :data-anm-stagger="stagger"
    :data-anm-cycles="cycles"
    :data-anm-bounce="bounce"
    :data-anm-columns="columns"
    :data-anm-disable="disable"
  >
    <div ref="stageRef" class="sfb_stage" data-anm-sfb-stage></div>
  </section>
</template>
