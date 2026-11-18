<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'

// --- Constants ----------------------------------------------------------------
const HOVER_DUR          = 0.4
const HOVER_EASE         = 'back.out'
const DOT_GAP_PRIMARY    = 12
const DOT_GAP_SUB        = 10
const ICON_BURGER_OFFSET = 3
const PANEL_RADIUS       = 8
const CLOSE_PANEL2_DELAY = 200
const CLIP_HIDDEN  = `inset(0% 100% 0% 0% round ${PANEL_RADIUS}px)`
const CLIP_VISIBLE = `inset(0% 0% 0% 0% round ${PANEL_RADIUS}px)`
const TOGGLE_DARK  = '#0a0a0a'
const TOGGLE_LIGHT = '#ffffff'

// --- Default data -------------------------------------------------------------
const DEFAULT_PRIMARIES = [
  { id: 'running', label: 'Running' },
  { id: 'cycling', label: 'Cycling' },
  { id: 'tennis',  label: 'Tennis'  },
  { id: 'track',   label: 'Track'   },
]

const DEFAULT_SUBLISTS = {
  running: ['Shoes', 'Shorts', 'Shirts', 'Tank tops', 'Fueling'],
  cycling: ['Bikes', 'Helmets', 'Jerseys', 'Bib shorts', 'Accessories'],
  tennis:  ['Racquets', 'Shoes', 'Apparel', 'Balls', 'Bags'],
  track:   ['Spikes', 'Singlets', 'Shorts', 'Recovery', 'Training'],
}

const DEFAULT_SECONDARY_LINKS = [
  { label: 'About',          href: '#' },
  { label: 'Our Philosophy', href: '#' },
]

const DEFAULT_CARDS = [
  { src: 'https://annnimate.b-cdn.net/preview-assets/images/sports/running-hero-female-1.avif',    alt: '', label: 'Events' },
  { src: 'https://annnimate.b-cdn.net/preview-assets/images/sports/street-running-earbuds-3.avif', alt: '', label: 'Merch'  },
]

// --- Props -------------------------------------------------------------------
const props = defineProps({
  // duration: Open panel reveal duration in seconds (0.4-1.6). Close is ~45% faster.
  duration: {
    type: Number,
    default: 0.9,
  },
  // ease: GSAP easing for panel reveal + toggle morph
  ease: {
    type: String,
    default: 'expo.out',
  },
  // stagger: Delay between each link reveal in seconds (0.02-0.12)
  stagger: {
    type: Number,
    default: 0.06,
  },
  // panelBg: Background colour of Panel 1 and Panel 2
  panelBg: {
    type: String,
    default: '#ececec',
  },
  logo: {
    type: String,
    default: 'Kinetic Athletics',
  },
  primaries: {
    type: Array,
    default: () => DEFAULT_PRIMARIES,
  },
  sublists: {
    type: Object,
    default: () => DEFAULT_SUBLISTS,
  },
  secondaryLinks: {
    type: Array,
    default: () => DEFAULT_SECONDARY_LINKS,
  },
  cards: {
    type: Array,
    default: () => DEFAULT_CARDS,
  },
  heroEyebrow: {
    type: String,
    default: 'Spring Collection / 03',
  },
  heroHeading: {
    type: String,
    default: 'The shape of distance.',
  },
  heroSub: {
    type: String,
    default: 'Apparel and footwear for the long way home.',
  },
  heroImage: {
    type: String,
    default: 'https://annnimate.b-cdn.net/preview-assets/images/sports/street-running-hero-4.avif',
  },
})

// --- Template refs -----------------------------------------------------------
const containerRef  = ref(null)
const overlayRef    = ref(null)
const scrimRef      = ref(null)
const panel1Ref     = ref(null)
const panel2Ref     = ref(null)
const primaryNavRef = ref(null)
const toggleRef     = ref(null)
const labelTrackRef = ref(null)
const labelOpenRef  = ref(null)
const iconTopRef    = ref(null)
const iconBottomRef = ref(null)
const logoRef       = ref(null)
const backBtnRef    = ref(null)
const exploreRef    = ref(null)

// Arrays of refs indexed by position
const primaryBtnRefs = ref([])
const primaryDotRefs = ref([])
const primaryLblRefs = ref([])
const cardRefs       = ref([])
const footerLinkRefs = ref([])

// Refs keyed by primary id
const sublistRefs      = ref({})
const sublistLabelRefs = ref({})
const sublinkDotRefs   = ref({})

// --- Mutable animation state (not reactive -- never drives template) ---------
let ctx          = null
let mm           = null
let openTl       = null
let closeTl      = null
let isOpen       = false
let panel2Open   = false
let activeSubId  = null
let closeTimer   = null
let docListeners = []

// Reactive only for aria-expanded on toggle
const isOpenReactive = ref(false)

// --- Helpers ------------------------------------------------------------------
function isMobile() {
  return window.matchMedia('(max-width: 767px)').matches
}

function setPanel2InitialState() {
  const panel2 = panel2Ref.value
  if (!panel2) return
  if (isMobile()) {
    gsap.set(panel2, { clipPath: CLIP_VISIBLE, xPercent: 0, x: '100vw' })
  } else {
    gsap.set(panel2, { clipPath: CLIP_HIDDEN, xPercent: 0, x: 0 })
  }
}

function setActiveSublist(id) {
  props.primaries.forEach((p) => {
    const sl = sublistRefs.value[p.id]
    if (!sl) return
    const isMatch = p.id === id
    sl.classList.toggle('mldm_sublist_active', isMatch)
    sl.setAttribute('aria-hidden', String(!isMatch))
    sl.style.visibility    = isMatch ? 'visible' : 'hidden'
    sl.style.pointerEvents = isMatch ? 'auto'    : 'none'
  })
  activeSubId = id
  primaryBtnRefs.value.forEach((btn, i) => {
    if (!btn) return
    btn.setAttribute('aria-expanded', String(props.primaries[i]?.id === id))
  })
}

function resetSubLinkVisuals(id) {
  const lbls = sublistLabelRefs.value[id] || []
  const dots = sublinkDotRefs.value[id]   || []
  lbls.forEach((lbl) => { if (lbl) gsap.set(lbl, { x: 0, opacity: 0 }) })
  dots.forEach((dot) => { if (dot) gsap.set(dot, { scale: 0 }) })
}

function cancelPanel2CloseTimer() {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

function schedulePanel2Close() {
  cancelPanel2CloseTimer()
  closeTimer = setTimeout(() => {
    closeTimer = null
    closePanel2()
  }, CLOSE_PANEL2_DELAY)
}

// --- buildTimelines ----------------------------------------------------------
function buildTimelines() {
  if (openTl)  openTl.kill()
  if (closeTl) closeTl.kill()

  const panel1     = panel1Ref.value
  const overlay    = overlayRef.value
  const scrim      = scrimRef.value
  const toggle     = toggleRef.value
  const logoEl     = logoRef.value
  const labelTrack = labelTrackRef.value
  const labelOpen  = labelOpenRef.value
  const iconTop    = iconTopRef.value
  const iconBottom = iconBottomRef.value

  if (!panel1 || !overlay || !toggle) return

  const primaryLabels = primaryLblRefs.value.filter(Boolean)

  const p1Extras = []
  if (exploreRef.value) p1Extras.push(exploreRef.value)
  cardRefs.value.forEach((c) => { if (c) p1Extras.push(c) })
  footerLinkRefs.value.forEach((f) => { if (f) p1Extras.push(f) })

  const navAll = [...primaryLabels, ...p1Extras]

  const labelHeight = labelOpen ? labelOpen.offsetHeight : 16
  const trackOpenY  = -(labelHeight + 2)

  // -- OPEN TIMELINE ----------------------------------------------------------
  openTl = gsap.timeline({
    paused: true,
    defaults: { ease: props.ease, easeReverse: true, force3D: true },
    onStart: () => {
      overlay.removeAttribute('inert')
      overlay.setAttribute('aria-hidden', 'false')
      containerRef.value?.dispatchEvent(
        new CustomEvent('anm-mldm-open', { bubbles: true, detail: { container: containerRef.value } })
      )
    },
  })

  openTl.set(panel1,     { clipPath: CLIP_HIDDEN })
  openTl.set(scrim,      { opacity: 0 })
  openTl.set(toggle,     { color: TOGGLE_DARK })
  if (logoEl)     openTl.set(logoEl,     { color: TOGGLE_DARK })
  if (labelTrack) openTl.set(labelTrack, { y: 0 })
  if (iconTop)    openTl.set(iconTop,    { y: -ICON_BURGER_OFFSET, rotation: 0 })
  if (iconBottom) openTl.set(iconBottom, { y:  ICON_BURGER_OFFSET, rotation: 0 })
  primaryDotRefs.value.forEach((dot) => { if (dot) openTl.set(dot, { scale: 0 }) })
  openTl.set(navAll, { opacity: 0, x: -16 })

  openTl.to(scrim,  { opacity: 1, duration: props.duration * 0.75 }, 0)
  openTl.to(panel1, { clipPath: CLIP_VISIBLE, duration: props.duration }, 0.05)
  openTl.to(toggle, { color: TOGGLE_LIGHT, duration: props.duration * 0.6 }, props.duration * 0.2)
  if (logoEl) openTl.to(logoEl, { color: TOGGLE_LIGHT, duration: props.duration * 0.6 }, props.duration * 0.2)
  if (labelTrack) openTl.to(labelTrack, { y: trackOpenY, duration: props.duration * 0.55 }, props.duration * 0.2)
  if (iconTop)    openTl.to(iconTop,    { y: 0, rotation: 45,  duration: props.duration * 0.6 }, props.duration * 0.2)
  if (iconBottom) openTl.to(iconBottom, { y: 0, rotation: -45, duration: props.duration * 0.6 }, props.duration * 0.2)
  openTl.to(primaryLabels, { opacity: 1, x: 0, duration: 0.55, stagger: props.stagger }, props.duration * 0.35)
  if (p1Extras.length) {
    openTl.to(p1Extras, { opacity: 1, x: 0, duration: 0.55, stagger: props.stagger * 0.7 }, props.duration * 0.45)
  }

  // -- CLOSE TIMELINE ---------------------------------------------------------
  const closeDur = props.duration * 0.55

  closeTl = gsap.timeline({
    paused: true,
    defaults: { ease: 'expo.out', force3D: true },
    onComplete: () => {
      overlay.setAttribute('inert', '')
      overlay.setAttribute('aria-hidden', 'true')
      containerRef.value?.dispatchEvent(
        new CustomEvent('anm-mldm-close', { bubbles: true, detail: { container: containerRef.value } })
      )
    },
  })

  closeTl.to(navAll, { opacity: 0, duration: 0.15, stagger: props.stagger * 0.3 }, 0)
  closeTl.to(panel1, { clipPath: CLIP_HIDDEN, duration: closeDur }, 0.05)
  closeTl.to(scrim,  { opacity: 0, duration: closeDur * 0.8 }, 0.1)
  closeTl.to(toggle, { color: TOGGLE_DARK, duration: closeDur * 0.6 }, 0.05)
  if (logoEl)     closeTl.to(logoEl,     { color: TOGGLE_DARK, duration: closeDur * 0.6 }, 0.05)
  if (labelTrack) closeTl.to(labelTrack, { y: 0, duration: closeDur * 0.55 }, 0.05)
  if (iconTop)    closeTl.to(iconTop,    { y: -ICON_BURGER_OFFSET, rotation: 0, duration: closeDur * 0.6 }, 0.05)
  if (iconBottom) closeTl.to(iconBottom, { y:  ICON_BURGER_OFFSET, rotation: 0, duration: closeDur * 0.6 }, 0.05)
}

// --- Panel 2: open / close / swap --------------------------------------------
function openPanel2(targetId) {
  cancelPanel2CloseTimer()
  const hasSublist = !!(props.sublists[targetId] && props.sublists[targetId].length)
  if (!hasSublist) { closePanel2(); return }

  if (panel2Open && activeSubId === targetId) return

  if (panel2Open && activeSubId !== targetId) {
    swapSublistContent(targetId)
    return
  }

  panel2Open = true
  setActiveSublist(targetId)
  resetSubLinkVisuals(targetId)

  const panel2 = panel2Ref.value
  if (!panel2) return

  if (isMobile()) {
    gsap.to(panel2, { x: 0, duration: 0.5, ease: 'expo.out', easeReverse: true, force3D: true, overwrite: 'auto' })
  } else {
    gsap.to(panel2, { clipPath: CLIP_VISIBLE, duration: 0.6, ease: 'expo.out', easeReverse: true, force3D: true, overwrite: 'auto' })
  }

  const lbls = sublistLabelRefs.value[targetId] || []
  if (lbls.length) {
    gsap.fromTo(
      lbls,
      { opacity: 0, x: -16 },
      { opacity: 1, x: 0, duration: 0.5, stagger: props.stagger, ease: 'expo.out', easeReverse: true, force3D: true, overwrite: 'auto', delay: 0.1 }
    )
  }
}

function closePanel2() {
  cancelPanel2CloseTimer()
  if (!panel2Open) return
  panel2Open = false
  const panel2 = panel2Ref.value
  if (!panel2) return
  if (isMobile()) {
    gsap.to(panel2, { x: '100vw', duration: 0.4, ease: 'expo.out', force3D: true, overwrite: 'auto' })
  } else {
    gsap.to(panel2, { clipPath: CLIP_HIDDEN, duration: 0.45, ease: 'expo.out', force3D: true, overwrite: 'auto' })
  }
}

function swapSublistContent(newId) {
  const oldId  = activeSubId
  const oldLbls = sublistLabelRefs.value[oldId] || []
  const newLbls = sublistLabelRefs.value[newId] || []

  function showNew() {
    setActiveSublist(newId)
    resetSubLinkVisuals(newId)
    if (newLbls.length) {
      gsap.fromTo(
        newLbls,
        { opacity: 0, x: -16 },
        { opacity: 1, x: 0, duration: 0.45, ease: 'expo.out', easeReverse: true, stagger: props.stagger, force3D: true, overwrite: 'auto' }
      )
    }
  }

  if (oldLbls.length) {
    gsap.to(oldLbls, {
      opacity: 0, x: -8, duration: 0.18, ease: 'expo.out', stagger: props.stagger * 0.3,
      overwrite: 'auto', onComplete: showNew,
    })
  } else {
    showNew()
  }
}

// --- Open / Close drawer -----------------------------------------------------
function openMenu() {
  if (isOpen) return
  isOpen = true
  isOpenReactive.value = true
  toggleRef.value?.setAttribute('aria-expanded', 'true')
  toggleRef.value?.setAttribute('aria-label', 'Close navigation menu')
  panel2Open  = false
  activeSubId = null
  setPanel2InitialState()
  buildTimelines()
  if (closeTl) closeTl.pause(0)
  openTl?.restart()
}

function closeMenu() {
  if (!isOpen) return
  isOpen = false
  isOpenReactive.value = false
  closePanel2()
  toggleRef.value?.setAttribute('aria-expanded', 'false')
  toggleRef.value?.setAttribute('aria-label', 'Open navigation menu')
  toggleRef.value?.focus()
  if (openTl)  openTl.pause()
  if (closeTl) closeTl.restart()
}

function handleToggle() {
  isOpen ? closeMenu() : openMenu()
}

// --- Primary button handlers -------------------------------------------------
function handlePrimaryMouseEnter(index) {
  if (!isOpen || isMobile()) return
  cancelPanel2CloseTimer()
  const targetId = props.primaries[index]?.id
  if (targetId && props.sublists[targetId]?.length) {
    openPanel2(targetId)
  } else {
    schedulePanel2Close()
  }

  const dot = primaryDotRefs.value[index]
  const lbl = primaryLblRefs.value[index]
  if (!dot || !lbl) return
  const offset = dot.offsetWidth + DOT_GAP_PRIMARY
  gsap.to(dot, { scale: 1,  duration: HOVER_DUR, ease: HOVER_EASE, overwrite: 'auto', force3D: true })
  gsap.to(lbl, { x: offset, duration: HOVER_DUR, ease: HOVER_EASE, overwrite: 'auto', force3D: true })
}

function handlePrimaryMouseLeave(index) {
  const dot = primaryDotRefs.value[index]
  const lbl = primaryLblRefs.value[index]
  if (!dot || !lbl) return
  gsap.to(dot, { scale: 0, duration: HOVER_DUR, ease: HOVER_EASE, overwrite: 'auto', force3D: true })
  gsap.to(lbl, { x: 0,     duration: HOVER_DUR, ease: HOVER_EASE, overwrite: 'auto', force3D: true })
}

function handlePrimaryClick(index) {
  if (!isOpen) return
  cancelPanel2CloseTimer()
  const targetId = props.primaries[index]?.id
  if (targetId && props.sublists[targetId]?.length) {
    openPanel2(targetId)
  } else {
    closePanel2()
  }
}

function handlePrimaryNavMouseLeave(e) {
  if (!isOpen || isMobile()) return
  const panel2 = panel2Ref.value
  if (panel2 && panel2.contains(e.relatedTarget)) return
  schedulePanel2Close()
}

function handlePanel2MouseEnter() {
  if (isMobile()) return
  cancelPanel2CloseTimer()
}

function handlePanel2MouseLeave(e) {
  if (!isOpen || isMobile()) return
  if (primaryNavRef.value && primaryNavRef.value.contains(e.relatedTarget)) return
  schedulePanel2Close()
}

// --- Sub-link hover ----------------------------------------------------------
function handleSubLinkEnter(primaryId, itemIndex) {
  const dot = (sublinkDotRefs.value[primaryId] || [])[itemIndex]
  const lbl = (sublistLabelRefs.value[primaryId] || [])[itemIndex]
  if (!dot || !lbl) return
  const offset = dot.offsetWidth + DOT_GAP_SUB
  gsap.to(dot, { scale: 1,  duration: HOVER_DUR, ease: HOVER_EASE, overwrite: 'auto', force3D: true })
  gsap.to(lbl, { x: offset, duration: HOVER_DUR, ease: HOVER_EASE, overwrite: 'auto', force3D: true })
}

function handleSubLinkLeave(primaryId, itemIndex) {
  const dot = (sublinkDotRefs.value[primaryId] || [])[itemIndex]
  const lbl = (sublistLabelRefs.value[primaryId] || [])[itemIndex]
  if (!dot || !lbl) return
  gsap.to(dot, { scale: 0, duration: HOVER_DUR, ease: HOVER_EASE, overwrite: 'auto', force3D: true })
  gsap.to(lbl, { x: 0,     duration: HOVER_DUR, ease: HOVER_EASE, overwrite: 'auto', force3D: true })
}

// --- Card hover (JS-driven for Webflow parity) --------------------------------
function handleCardEnter(index) {
  const card = cardRefs.value[index]
  if (!card) return
  const img = card.querySelector('.mldm_card_img')
  if (!img) return
  gsap.to(img, { scale: 1.04, duration: 0.6, ease: 'expo.out', overwrite: 'auto', force3D: true })
}

function handleCardLeave(index) {
  const card = cardRefs.value[index]
  if (!card) return
  const img = card.querySelector('.mldm_card_img')
  if (!img) return
  gsap.to(img, { scale: 1, duration: 0.6, ease: 'expo.out', overwrite: 'auto', force3D: true })
}

// --- Lifecycle ---------------------------------------------------------------
onMounted(() => {
  const overlay    = overlayRef.value
  const scrim      = scrimRef.value
  const panel1     = panel1Ref.value
  const panel2     = panel2Ref.value
  const toggle     = toggleRef.value
  const logoEl     = logoRef.value
  const labelTrack = labelTrackRef.value
  const iconTop    = iconTopRef.value
  const iconBottom = iconBottomRef.value

  if (!toggle || !overlay || !panel1) return

  // Apply panelBg
  if (panel1) panel1.style.backgroundColor = props.panelBg
  if (panel2) panel2.style.backgroundColor = props.panelBg

  ctx = gsap.context(() => {
    // Initial closed state
    overlay.setAttribute('inert', '')
    overlay.setAttribute('aria-hidden', 'true')
    gsap.set(panel1, { clipPath: CLIP_HIDDEN })
    setPanel2InitialState()
    gsap.set(scrim,  { opacity: 0 })
    gsap.set(toggle, { color: TOGGLE_DARK })
    if (logoEl)     gsap.set(logoEl,     { color: TOGGLE_DARK })
    if (labelTrack) gsap.set(labelTrack, { y: 0 })
    if (iconTop)    gsap.set(iconTop,    { y: -ICON_BURGER_OFFSET, rotation: 0 })
    if (iconBottom) gsap.set(iconBottom, { y:  ICON_BURGER_OFFSET, rotation: 0 })

    // Hide all sublists initially
    props.primaries.forEach((p) => {
      const sl = sublistRefs.value[p.id]
      if (!sl) return
      sl.classList.remove('mldm_sublist_active')
      sl.setAttribute('aria-hidden', 'true')
      sl.style.visibility    = 'hidden'
      sl.style.pointerEvents = 'none'
    })

    // Reduced motion
    mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.globalTimeline.timeScale(20)
    })
  }, containerRef.value)

  // Keyboard
  const handleKey = (e) => { if (e.key === 'Escape' && isOpen) closeMenu() }
  document.addEventListener('keydown', handleKey)
  docListeners.push({ target: document, type: 'keydown', fn: handleKey })

  // Resize: re-snap panel 2 initial state when mobile/desktop boundary is crossed
  let resizeTimer
  let wasMobile = isMobile()
  const handleResize = () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      const nowMobile = isMobile()
      if (nowMobile !== wasMobile) {
        wasMobile = nowMobile
        if (isOpen) {
          closeMenu()
        } else {
          setPanel2InitialState()
        }
      }
    }, 150)
  }
  window.addEventListener('resize', handleResize)
  docListeners.push({ target: window, type: 'resize', fn: handleResize })

  // Pause animation when tab is hidden
  const handleVisibility = () => {
    if (document.hidden) {
      gsap.globalTimeline.pause()
    } else {
      gsap.globalTimeline.resume()
    }
  }
  document.addEventListener('visibilitychange', handleVisibility)
  docListeners.push({ target: document, type: 'visibilitychange', fn: handleVisibility })

  // Public API
  if (typeof window !== 'undefined') {
    window.Anm = window.Anm || {}
    window.Anm.MultiLevelDrawerMenu = {
      open:    () => openMenu(),
      close:   () => closeMenu(),
      refresh: () => { buildTimelines() },
    }
  }
})

onUnmounted(() => {
  if (mm) { mm.revert(); mm = null }
  ctx?.revert()
  cancelPanel2CloseTimer()
  docListeners.forEach(({ target, type, fn }) => target.removeEventListener(type, fn))
  docListeners = []
  if (typeof window !== 'undefined' && window.Anm) {
    delete window.Anm.MultiLevelDrawerMenu
  }
})
</script>

<template>
  <div
    ref="containerRef"
    class="mldm_wrap"
    data-anm-multi-level-drawer-menu
  >
    <!-- Page content sits below the overlay -->
    <div class="mldm_page" data-anm-mldm-page>
      <section class="mldm_page_hero">
        <div class="mldm_page_inner">
          <div class="mldm_page_text">
            <p class="mldm_page_eyebrow">{{ heroEyebrow }}</p>
            <h1 class="mldm_page_heading">{{ heroHeading }}</h1>
            <p class="mldm_page_sub">{{ heroSub }}</p>
          </div>
          <div class="mldm_page_poster">
            <img class="mldm_page_poster_img" :src="heroImage" alt="" />
          </div>
        </div>
      </section>
    </div>

    <!-- Logo - sits below overlay -->
    <span ref="logoRef" class="mldm_logo" data-anm-mldm-logo>{{ logo }}</span>

    <!-- Toggle - sits above overlay -->
    <button
      ref="toggleRef"
      class="mldm_toggle"
      data-anm-mldm-toggle
      :aria-expanded="isOpenReactive"
      aria-controls="mldm_overlay"
      aria-label="Open navigation menu"
      @click="handleToggle"
    >
      <span class="mldm_toggle_label_wrap">
        <span ref="labelTrackRef" class="mldm_toggle_label_track" data-anm-mldm-label-track>
          <span ref="labelOpenRef" class="mldm_toggle_label mldm_toggle_label_open" data-anm-mldm-label-open>Menu</span>
          <span class="mldm_toggle_label mldm_toggle_label_close">Close</span>
        </span>
      </span>
      <span class="mldm_toggle_icon" aria-hidden="true">
        <span ref="iconTopRef"    class="mldm_toggle_line mldm_toggle_line_top"    data-anm-mldm-icon-top></span>
        <span ref="iconBottomRef" class="mldm_toggle_line mldm_toggle_line_bottom" data-anm-mldm-icon-bottom></span>
      </span>
    </button>

    <!-- Drawer overlay -->
    <div
      ref="overlayRef"
      class="mldm_overlay"
      id="mldm_overlay"
      data-anm-mldm-overlay
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
      aria-hidden="true"
      inert
    >
      <!-- Scrim -->
      <button
        ref="scrimRef"
        class="mldm_scrim"
        data-anm-mldm-scrim
        aria-label="Close menu"
        tabindex="-1"
        @click="closeMenu"
      ></button>

      <!-- Panel 1 - primary categories -->
      <aside
        ref="panel1Ref"
        class="mldm_panel mldm_panel_primary"
        data-anm-mldm-panel
        data-anm-mldm-panel-level="1"
      >
        <div class="mldm_panel_inner">
          <nav
            ref="primaryNavRef"
            class="mldm_primary_nav"
            aria-label="Primary categories"
            @mouseleave="handlePrimaryNavMouseLeave"
          >
            <ul class="mldm_list">
              <li
                v-for="(primary, i) in primaries"
                :key="primary.id"
                class="mldm_item"
              >
                <button
                  :ref="(el) => { primaryBtnRefs[i] = el }"
                  class="mldm_primary"
                  data-anm-mldm-primary
                  :data-anm-mldm-target="primary.id"
                  aria-expanded="false"
                  @mouseenter="handlePrimaryMouseEnter(i)"
                  @mouseleave="handlePrimaryMouseLeave(i)"
                  @click="handlePrimaryClick(i)"
                >
                  <span
                    :ref="(el) => { primaryDotRefs[i] = el }"
                    class="mldm_primary_dot"
                    aria-hidden="true"
                  ></span>
                  <span
                    :ref="(el) => { primaryLblRefs[i] = el }"
                    class="mldm_primary_label"
                  >{{ primary.label }}</span>
                </button>
              </li>
            </ul>

            <a ref="exploreRef" class="mldm_explore" data-anm-mldm-secondary href="#">Explore all</a>
          </nav>

          <div class="mldm_cards">
            <a
              v-for="(card, i) in cards"
              :key="card.label"
              :ref="(el) => { cardRefs[i] = el }"
              class="mldm_card"
              data-anm-mldm-secondary
              href="#"
              @mouseenter="handleCardEnter(i)"
              @mouseleave="handleCardLeave(i)"
            >
              <span class="mldm_card_media">
                <img class="mldm_card_img" :src="card.src" :alt="card.alt || ''" />
              </span>
              <span class="mldm_card_label">{{ card.label }}</span>
            </a>
          </div>

          <nav class="mldm_footer_nav" aria-label="Secondary">
            <a
              v-for="(link, i) in secondaryLinks"
              :key="link.label"
              :ref="(el) => { footerLinkRefs[i] = el }"
              class="mldm_footer_link"
              data-anm-mldm-secondary
              :href="link.href"
            >{{ link.label }}</a>
          </nav>
        </div>
      </aside>

      <!-- Panel 2 - subcategories -->
      <aside
        ref="panel2Ref"
        class="mldm_panel mldm_panel_secondary"
        data-anm-mldm-panel
        data-anm-mldm-panel-level="2"
        @mouseenter="handlePanel2MouseEnter"
        @mouseleave="handlePanel2MouseLeave"
      >
        <button
          ref="backBtnRef"
          class="mldm_back"
          data-anm-mldm-back
          aria-label="Back to primary categories"
          @click="closePanel2"
        >
          <span class="mldm_back_icon" aria-hidden="true"></span>
          <span class="mldm_back_label">Back</span>
        </button>

        <div class="mldm_panel_inner">
          <div class="mldm_sublist_stack" data-anm-mldm-sublist-stack>
            <div
              v-for="primary in primaries"
              :key="primary.id"
              :ref="(el) => { sublistRefs[primary.id] = el }"
              :class="['mldm_sublist', primary.id === primaries[0]?.id ? 'mldm_sublist_active' : '']"
              data-anm-mldm-sublist
              :data-anm-mldm-sublist-for="primary.id"
              :aria-hidden="String(primary.id !== primaries[0]?.id)"
            >
              <ul class="mldm_list">
                <li
                  v-for="(item, j) in (sublists[primary.id] || [])"
                  :key="item"
                  class="mldm_item"
                >
                  <button
                    class="mldm_sublink"
                    data-anm-mldm-secondary-link
                    @mouseenter="handleSubLinkEnter(primary.id, j)"
                    @mouseleave="handleSubLinkLeave(primary.id, j)"
                  >
                    <span
                      :ref="(el) => {
                        if (!sublinkDotRefs[primary.id]) sublinkDotRefs[primary.id] = []
                        sublinkDotRefs[primary.id][j] = el
                      }"
                      class="mldm_sublink_dot"
                      aria-hidden="true"
                    ></span>
                    <span
                      :ref="(el) => {
                        if (!sublistLabelRefs[primary.id]) sublistLabelRefs[primary.id] = []
                        sublistLabelRefs[primary.id][j] = el
                      }"
                      class="mldm_sublink_label"
                    >{{ item }}</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <a class="mldm_sub_explore" data-anm-mldm-secondary href="#">Explore all</a>
        </div>
      </aside>
    </div>
  </div>
</template>
