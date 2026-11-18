<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import gsap from 'gsap'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(CustomEase)
if (!gsap.parseEase('annnimateInOut')) {
  CustomEase.create('annnimate', 'M0,0 C0.3,0.9 0.1,1 1,1')
  CustomEase.create('annnimateInOut', 'M0,0 C0.7,0 0.16,1 1,1')
}

// Overlay tint + blur endpoints. Element opacity stays 1 the whole time -
// fading a backdrop-filter element's own opacity washes the blur out.
const OVERLAY_TINT = 'rgba(10, 10, 10, 0.2)'
const OVERLAY_TINT_OFF = 'rgba(10, 10, 10, 0)'
const OVERLAY_BLUR = '6px'
const ENTER_DISTANCE = 128
// The exit is its own, quicker leg: half the travel, dropping away.
const EXIT_DISTANCE = 64

const breakpoints = {
  mobile: '(max-width: 479px)',
  landscape: '(orientation: landscape) and (max-width: 767px)',
  tablet: '(max-width: 991px)',
  desktop: '(min-width: 992px)',
}

const props = defineProps({
  className: { type: String, default: '' },
  duration: { type: Number, default: 0.55 },
  ease: { type: String, default: 'annnimate' },
  disable: { type: String, default: '' },
  label: { type: String, default: 'Court issue, 01' },
  title: { type: String, default: 'Game leather' },
  tileImage: {
    type: Object,
    default: () => ({
      src: 'https://annnimate.b-cdn.net/preview-assets/vanta/product_ball_05.jpg',
      alt: 'Basketball floating in a shaft of light in a dark locker room',
    }),
  },
  sheetTitle: { type: String, default: 'Broken in by hand' },
  sheetText: {
    type: String,
    default:
      'A game ball built to be played - full-grain leather with a deep pebble, worked in before it ships so the first grip feels like the hundredth.',
  },
  primaryCtaLabel: { type: String, default: 'Explore the story' },
  listItems: {
    type: Array,
    default: () => [
      'Full-grain pebble, tacked for grip',
      'Holds pressure through cold courts',
      'Indoor pace, outdoor wear',
    ],
  },
  mediaRow: {
    type: Array,
    default: () => [
      {
        src: 'https://annnimate.b-cdn.net/preview-assets/vanta/action_leap_01.jpg',
        alt: 'Athlete captured mid-leap against a dark studio ground',
      },
      {
        src: 'https://annnimate.b-cdn.net/preview-assets/vanta/roster_cap-silhouette_03.jpg',
        alt: 'Silhouetted athlete in a cap with a glowing brim on a green field',
      },
    ],
  },
  stats: {
    type: Array,
    default: () => [
      { num: '620 g', label: 'Regulation weight' },
      { num: '75.5 cm', label: 'Circumference, size 7' },
      { num: '0.6 bar', label: 'Playing pressure' },
    ],
  },
  sheetImage: {
    type: Object,
    default: () => ({
      src: 'https://annnimate.b-cdn.net/preview-assets/vanta/hero_profile_03.jpg',
      alt: 'Silhouetted athlete profile against a deep orange field',
    }),
  },
  outro: {
    type: String,
    default:
      'Built for the court you actually play on - the cracked one behind the gym, in January, with cold hands.',
  },
})

const stageRef = ref(null)
const tileRef = ref(null)
const glyphTrRef = ref(null)
const glyphBlRef = ref(null)
const toggleRef = ref(null)
const overlayRef = ref(null)
const modalRef = ref(null)
const gradientRef = ref(null)
const sheetRef = ref(null)
const closeBtnRef = ref(null)

// isOpen drives aria state and guards - flips immediately. isOpenClass drives
// only the CSS "is-open" class, which stays on through the whole close
// animation (removed in onCloseSettle) so the modal keeps receiving pointer
// events until it has actually finished leaving.
const isOpen = ref(false)
const isOpenClass = ref(false)

let liveTl = null
let scrollLocked = false
let mm = null
const docListeners = []

function isDisabledOnViewport() {
  if (!props.disable) return false
  return props.disable.split(',').some((v) => {
    const q = breakpoints[v.trim()]
    return q && window.matchMedia(q).matches
  })
}

function addDoc(event, handler, opts) {
  document.addEventListener(event, handler, opts)
  docListeners.push([event, handler, opts])
}

function lockScroll() {
  if (scrollLocked) return
  scrollLocked = true
  document.body.style.overflow = 'hidden'
}

function unlockScroll() {
  if (!scrollLocked) return
  scrollLocked = false
  document.body.style.overflow = ''
}

// Open and close are deliberately ASYMMETRIC (different travel and speed),
// so they are paired builds rather than one reversed timeline. Every tween
// is a .to() from the LIVE values, and killLive() stops whatever is in
// flight first - that is what makes rapid open/close interruptible.
function killLive() {
  if (liveTl) { liveTl.kill(); liveTl = null }
  gsap.killTweensOf([overlayRef.value, modalRef.value, gradientRef.value].filter(Boolean))
}

function onOpenSettle() {
  liveTl = null
  if (document.hasFocus()) closeBtnRef.value?.focus()
}

function onCloseSettle() {
  liveTl = null
  unlockScroll()
  isOpenClass.value = false
  // Re-park for the next enter while invisible: the exit only travelled
  // half the enter distance, so the enter start position is reset here.
  gsap.set(modalRef.value, { y: ENTER_DISTANCE })
  if (gradientRef.value) gsap.set(gradientRef.value, { yPercent: 30 })
  if (document.hasFocus()) toggleRef.value?.focus()
}

function openSheet() {
  if (isOpen.value) return liveTl
  isOpen.value = true
  killLive()
  isOpenClass.value = true
  lockScroll()
  if (sheetRef.value) sheetRef.value.scrollTop = 0
  const tl = gsap.timeline({
    defaults: { ease: props.ease, force3D: true },
    onComplete: onOpenSettle,
  })
  tl.to(overlayRef.value, {
    '--fdg-blur': OVERLAY_BLUR, backgroundColor: OVERLAY_TINT,
    duration: props.duration * 0.6,
    data: { label: 'Page dims and blurs behind' },
  }, 0)
  tl.to(modalRef.value, {
    y: 0, duration: props.duration,
    data: { label: 'Dialog rises into place' },
  }, 0)
  tl.to(modalRef.value, {
    autoAlpha: 1, duration: props.duration * 0.45,
    data: { label: 'Dialog fades in fast' },
  }, 0)
  if (gradientRef.value) {
    tl.to(gradientRef.value, {
      yPercent: 0, autoAlpha: 1, duration: props.duration * 0.9,
      data: { label: 'Gradient band drifts up and fades in' },
    }, 0.1)
  }
  liveTl = tl
  return tl
}

function closeSheet() {
  if (!isOpen.value) return liveTl
  isOpen.value = false
  killLive()
  const tl = gsap.timeline({
    defaults: { ease: 'annnimateInOut', force3D: true },
    onComplete: onCloseSettle,
  })
  tl.to(modalRef.value, {
    y: EXIT_DISTANCE, duration: props.duration * 0.4,
    data: { label: 'Dialog drops away' },
  }, 0)
  tl.to(modalRef.value, {
    autoAlpha: 0, duration: props.duration * 0.32,
    data: { label: 'Dialog fades out' },
  }, 0)
  tl.to(overlayRef.value, {
    '--fdg-blur': '0px', backgroundColor: OVERLAY_TINT_OFF,
    duration: props.duration * 0.4,
    data: { label: 'Page sharpens again' },
  }, 0)
  if (gradientRef.value) {
    tl.to(gradientRef.value, {
      yPercent: 30, autoAlpha: 0, duration: props.duration * 0.35,
      data: { label: 'Gradient band sinks out' },
    }, 0)
  }
  liveTl = tl
  return tl
}

function toggleSheet() {
  return isOpen.value ? closeSheet() : openSheet()
}

// Hover micro-move: the two corner arrows spread outward (SVG user units).
function onTileEnter() {
  if (!glyphTrRef.value || !glyphBlRef.value) return
  gsap.to(glyphTrRef.value, { x: 1.75, y: -1.75, duration: 0.4, ease: 'annnimateInOut', overwrite: 'auto' })
  gsap.to(glyphBlRef.value, { x: -1.75, y: 1.75, duration: 0.4, ease: 'annnimateInOut', overwrite: 'auto' })
}

function onTileLeave() {
  if (!glyphTrRef.value || !glyphBlRef.value) return
  gsap.to([glyphTrRef.value, glyphBlRef.value], { x: 0, y: 0, duration: 0.4, ease: 'annnimateInOut', overwrite: 'auto' })
}

function onTileClick() {
  if (!isOpen.value) openSheet()
}

function onTileKeydown(e) {
  if (isOpen.value) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    openSheet()
  }
}

function onToggleClick(e) {
  e.stopPropagation()
  openSheet()
}

function onCloseClick() {
  closeSheet()
}

function onModalClick(e) {
  if (isOpen.value && sheetRef.value && !sheetRef.value.contains(e.target)) closeSheet()
}

function handleKeydown(e) {
  if (e.key === 'Escape' && isOpen.value) closeSheet()
  // Focus trap: while open the sheet is a modal dialog, so Tab cycles
  // within it instead of escaping to the page behind.
  if (e.key === 'Tab' && isOpen.value) {
    const sheet = sheetRef.value
    if (!sheet) return
    const focusables = sheet.querySelectorAll(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusables.length) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    } else if (!sheet.contains(document.activeElement)) {
      e.preventDefault()
      first.focus()
    }
  }
}

function handleVisibility() {
  if (document.hidden) gsap.globalTimeline.pause()
  else gsap.globalTimeline.resume()
}

onMounted(() => {
  if (isDisabledOnViewport()) return

  gsap.set(overlayRef.value, { '--fdg-blur': '0px', backgroundColor: OVERLAY_TINT_OFF })
  gsap.set(modalRef.value, { y: ENTER_DISTANCE, autoAlpha: 0 })
  if (gradientRef.value) gsap.set(gradientRef.value, { yPercent: 30, autoAlpha: 0 })

  addDoc('keydown', handleKeydown)
  addDoc('visibilitychange', handleVisibility)

  mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.globalTimeline.timeScale(20)
  })
})

onUnmounted(() => {
  killLive()
  unlockScroll()
  mm?.revert()
  for (const [event, handler, opts] of docListeners) {
    document.removeEventListener(event, handler, opts)
  }
  docListeners.length = 0
})

// Timeline inspector demo (ADR-0011): one open -> close pass, ending back
// in the closed idle state. setTimeout, not gsap.delayedCall - reduced
// motion timeScales the global timeline and would fire a delayedCall almost
// immediately.
function demo() {
  if (isOpen.value) return null
  const handle = openSheet()
  setTimeout(() => { closeSheet() }, (props.duration + 0.9) * 1000)
  return handle
}

defineExpose({ open: openSheet, close: closeSheet, toggle: toggleSheet, demo })
</script>

<template>
  <div
    ref="stageRef"
    class="fdg_stage"
    :class="[className, { 'is-open': isOpenClass }]"
    data-anm-feature-dialog
    :data-anm-duration="duration"
    :data-anm-ease="ease"
    :data-anm-disable="disable || undefined"
  >
    <div ref="tileRef" class="fdg_tile" data-anm-fdg-tile role="button" tabindex="0" aria-haspopup="dialog" @click="onTileClick" @keydown="onTileKeydown" @mouseenter="onTileEnter" @mouseleave="onTileLeave">
      <div class="fdg_gradient fdg_tile_gradient"></div>
      <div class="fdg_tile_copy">
        <div class="fdg_tile_label">{{ label }}</div>
        <h3 class="fdg_tile_title">{{ title }}</h3>
      </div>
      <div class="fdg_tile_media" data-anm-fdg-tile-media>
        <img class="fdg_tile_img" :src="tileImage.src" :alt="tileImage.alt" loading="eager" decoding="async" />
      </div>
      <button ref="toggleRef" type="button" class="fdg_toggle" data-anm-fdg-toggle :aria-expanded="isOpen ? 'true' : 'false'" @click="onToggleClick">
        <svg class="fdg_glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path ref="glyphTrRef" class="fdg_glyph_tr" d="M10 2H14V6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path ref="glyphBlRef" class="fdg_glyph_bl" d="M6 14H2V10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <div ref="overlayRef" class="fdg_overlay" data-anm-fdg-overlay></div>

    <div ref="modalRef" class="fdg_modal" data-anm-fdg-modal @click="onModalClick">
      <div class="fdg_gradient fdg_panel_gradient" ref="gradientRef" data-anm-fdg-gradient></div>
      <div class="fdg_panel">
        <section ref="sheetRef" class="fdg_sheet" data-anm-fdg-sheet role="dialog" aria-modal="true" :aria-label="sheetTitle" :aria-hidden="isOpen ? 'false' : 'true'" :inert="isOpen ? undefined : ''">
          <button ref="closeBtnRef" type="button" class="fdg_close" data-anm-fdg-close aria-label="Close dialog" @click="onCloseClick">
            <svg class="fdg_glyph" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>

          <div class="fdg_sheet_inner">
            <div class="fdg_sheet_grid">
              <div class="fdg_sheet_main">
                <div class="fdg_title_mask">
                  <h2 class="fdg_sheet_title" data-anm-fdg-title>{{ sheetTitle }}</h2>
                </div>
                <p class="fdg_sheet_text">{{ sheetText }}</p>
                <div class="fdg_actions">
                  <button type="button" class="fdg_btn fdg_btn_primary">{{ primaryCtaLabel }}</button>
                </div>
              </div>
              <ul class="fdg_list">
                <li
                  v-for="(item, i) in listItems"
                  :key="item"
                  class="fdg_list_item"
                  :class="{ fdg_list_item_last: i === listItems.length - 1 }"
                >
                  {{ item }}
                </li>
              </ul>
            </div>
            <div class="fdg_media_row">
              <div v-for="cell in mediaRow" :key="cell.src" class="fdg_media_cell">
                <img class="fdg_sheet_img" :src="cell.src" :alt="cell.alt" loading="lazy" decoding="async" />
              </div>
            </div>

            <div class="fdg_stats">
              <div v-for="stat in stats" :key="stat.label" class="fdg_stat">
                <div class="fdg_stat_num">{{ stat.num }}</div>
                <div class="fdg_stat_label">{{ stat.label }}</div>
              </div>
            </div>

            <div class="fdg_sheet_media">
              <img class="fdg_sheet_img" :src="sheetImage.src" :alt="sheetImage.alt" loading="lazy" decoding="async" />
            </div>

            <p class="fdg_outro">{{ outro }}</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
