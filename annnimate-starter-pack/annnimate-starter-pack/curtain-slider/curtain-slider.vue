<script>
const DEFAULT_IMAGES = [
  {
    src: 'https://annnimate.b-cdn.net/preview-assets/vanta/hero_run_02.jpg?width=1920&format=auto',
    alt: 'Runner silhouetted mid-stride against a bright wall',
    title: 'Drive',
    label: 'Chapter 01',
  },
  {
    src: 'https://annnimate.b-cdn.net/preview-assets/vanta/action_cyclist-climb_02.jpg?width=1920&format=auto',
    alt: 'Cyclist climbing in motion blur against a warm backdrop',
    title: 'Endurance',
    label: 'Chapter 02',
  },
  {
    src: 'https://annnimate.b-cdn.net/preview-assets/vanta/hero_profile_02.jpg?width=1920&format=auto',
    alt: 'Athlete in profile against a bright orange field',
    title: 'Focus',
    label: 'Chapter 03',
  },
]
</script>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
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

const props = defineProps({
  // images: [{ src, alt, title, label }] - falls back to the three VANTA demo slides
  images: { type: Array, default: () => [] },
  duration: { type: Number, default: 1.1 },
  ease: { type: String, default: 'annnimate' },
  columns: { type: Number, default: 12 },
  auto: { type: Number, default: 0 },
  drag: { type: Boolean, default: true },
  stagger: { type: Number, default: 0.0125 },
})

const emit = defineEmits(['change'])

const resolvedImages = computed(() => (props.images.length ? props.images : DEFAULT_IMAGES))

const containerRef = ref(null)
const stageRef = ref(null)

let nextFn = null
let prevFn = null
let goToFn = null
let refreshFn = null
let killFn = null

onMounted(() => {
  if (typeof window === 'undefined' || !containerRef.value || !stageRef.value) return

  const container = containerRef.value
  const stage = stageRef.value

  const slides = resolvedImages.value.map(function (img) {
    return {
      title: img.title || '',
      label: img.label || '',
      src: img.src || '',
      alt: img.alt || '',
    }
  })

  if (!slides.length) return

  // --- 2. Config ---
  const duration = props.duration || 1.1
  const easeName = props.ease || 'annnimate'
  const columns = Math.max(2, Math.min(24, props.columns || 12))
  const autoSeconds = props.auto || 0
  const dragEnabled = props.drag !== false
  const charStagger = isNaN(props.stagger) ? 0.0125 : props.stagger
  const ease = typeof CustomEase !== 'undefined' && (easeName === 'annnimate' || easeName === 'annnimateInOut')
    ? easeName
    : (easeName || 'expo.out')

  // --- 3. Constants ---
  const STRIP_DUR_RATIO = 0.62
  // Dimming runs on per-strip black shade overlays tweening OPACITY, never
  // on filter: brightness() - animated filters repaint every frame and
  // churn compositor layers (flashing-rectangle flicker at fullscreen
  // retina + high refresh). Opacity composites on the GPU.
  const INCOMING_SHADE = 0.18
  const OUT_SHADE = 0.3
  const ZOOM_FROM = 1.3
  const TITLE_OUT_DUR = 0.55
  const TITLE_IN_DUR = 0.95
  const LABEL_DUR = 0.5
  const DIGIT_DUR = 0.7
  const BAR_DUR = duration * 0.8
  const SWIPE_THRESHOLD_RATIO = 0.15
  const ARROW_HOVER_DUR = 0.35
  const ARROW_PRESS_DUR = 0.15
  const AUTO_RESUME_DELAY = 4

  // --- 4. State ---
  let currentIndex = 0
  let refs = null
  let zTop = 0
  let goToSeq = 0
  let inFlight = null
  let lastGoTo = 0
  let dragStart = 0
  let dragActive = false
  let dragAxisSize = 1
  let autoTimer = null
  let reducedMotion = false

  // --- 5. Helpers ---

  function indexLabel(i) {
    return String(i + 1).padStart(2, '0')
  }

  function buildCharLine(text, lineClass, charClass) {
    const line = document.createElement('span')
    line.className = lineClass
    text.split('').forEach(function (ch) {
      const span = document.createElement('span')
      span.className = charClass
      span.textContent = ch === ' ' ? '\xA0' : ch
      line.appendChild(span)
    })
    return line
  }

  function splitChars(el, text, lineClass, charClass) {
    el.innerHTML = ''
    const line = buildCharLine(text, lineClass, charClass)
    el.appendChild(line)
    return Array.from(line.querySelectorAll('.' + charClass))
  }

  function swapChars(el, newText, lineClass, charClass, outVars, inVars) {
    const oldLine = el.querySelector('.' + lineClass + ':not(.cs_line_out)')
    if (oldLine) {
      oldLine.classList.add('cs_line_out')
      const oldChars = oldLine.querySelectorAll('.' + charClass)
      gsap.to(oldChars, Object.assign({
        onComplete: function () { oldLine.remove() },
      }, outVars))
    }
    const line = buildCharLine(newText, lineClass, charClass)
    el.appendChild(line)
    const chars = Array.from(line.querySelectorAll('.' + charClass))
    gsap.set(chars, inVars.from)
    gsap.to(chars, inVars.to)
    return chars
  }

  function buildDigitColumn(digitChar) {
    const wrap = document.createElement('span')
    wrap.className = 'cs_digit_wrap'
    const roller = document.createElement('span')
    roller.className = 'cs_digit_roller'
    for (let d = 0; d <= 9; d++) {
      const s = document.createElement('span')
      s.textContent = String(d)
      roller.appendChild(s)
    }
    wrap.appendChild(roller)
    wrap._digit = parseInt(digitChar, 10)
    wrap._roller = roller
    return wrap
  }

  function setIndexDisplay(el, valueString) {
    el.innerHTML = ''
    valueString.split('').forEach(function (ch) {
      const col = buildDigitColumn(ch)
      gsap.set(col._roller, { y: -col._digit + 'em' })
      el.appendChild(col)
    })
    const divider = document.createElement('span')
    divider.className = 'cs_index_divider'
    divider.textContent = '/'
    el.appendChild(divider)
    const total = document.createElement('span')
    total.className = 'cs_index_total'
    total.textContent = indexLabel(slides.length - 1)
    el.appendChild(total)
  }

  function rollIndex(el, value) {
    const cols = Array.from(el.querySelectorAll('.cs_digit_wrap'))
    value.split('').forEach(function (d, i) {
      const col = cols[i]
      if (!col) return
      const target = parseInt(d, 10)
      col._digit = target
      gsap.to(col._roller, {
        y: -target + 'em',
        duration: DIGIT_DUR,
        ease: 'expo.inOut',
        force3D: true,
        overwrite: true,
      })
    })
  }

  // Strips overlap their right neighbor by 1px: under a fractional effective
  // scale (preview scale-to-fit, browser zoom, odd dpr) exactly-tiled edges
  // antialias against the stage and leak hairline seams between columns. The
  // inner is stage-congruent, so the overlapped pixel renders identical image
  // content - invisible, but the seam can never open.
  function layoutStrips() {
    const w = stage.clientWidth || 1
    const edges = []
    for (let c = 0; c <= columns; c++) edges.push(Math.round((c * w) / columns))
    refs.layerParts.forEach(function (parts) {
      for (let c = 0; c < columns; c++) {
        const strip = parts.strips[c]
        const inner = parts.inners[c]
        const overlap = c < columns - 1 ? 1 : 0
        strip.style.left = edges[c] + 'px'
        strip.style.width = (edges[c + 1] - edges[c] + overlap) + 'px'
        inner.style.left = (-edges[c]) + 'px'
        inner.style.width = w + 'px'
      }
    })
  }

  function setLayerVisible(layer, visible) {
    layer.style.visibility = visible ? '' : 'hidden'
  }

  function clearStripClips(parts) {
    for (let s = 0; s < parts.strips.length; s++) {
      parts.strips[s].style.clipPath = 'none'
      parts.strips[s].style.removeProperty('--csc')
    }
  }

  // --- 6. Animation routines ---

  function buildStage() {
    stage.innerHTML = ''

    const layerWrap = document.createElement('div')
    layerWrap.className = 'cs_layers'
    const layerParts = []
    const layers = slides.map(function (slide, i) {
      const layer = document.createElement('div')
      layer.className = 'cs_layer'
      layer.style.zIndex = String(i)
      layer.style.visibility = i === currentIndex ? '' : 'hidden'
      const parts = { strips: [], inners: [], imgs: [], shades: [] }
      for (let c = 0; c < columns; c++) {
        const strip = document.createElement('div')
        strip.className = 'cs_strip'
        const inner = document.createElement('div')
        inner.className = 'cs_strip_inner'
        const img = document.createElement('img')
        img.className = 'cs_layer_img'
        img.src = slide.src
        img.alt = c === 0 ? slide.alt : ''
        img.loading = 'eager'
        const shade = document.createElement('div')
        shade.className = 'cs_shade'
        shade.setAttribute('aria-hidden', 'true')
        inner.appendChild(img)
        strip.appendChild(inner)
        strip.appendChild(shade)
        layer.appendChild(strip)
        parts.strips.push(strip)
        parts.inners.push(inner)
        parts.imgs.push(img)
        parts.shades.push(shade)
      }
      layerParts.push(parts)
      layerWrap.appendChild(layer)
      return layer
    })

    const scrim = document.createElement('div')
    scrim.className = 'cs_scrim'
    scrim.setAttribute('aria-hidden', 'true')

    const labelEl = document.createElement('div')
    labelEl.className = 'cs_label'

    const titleEl = document.createElement('h2')
    titleEl.className = 'cs_title'

    const indexEl = document.createElement('div')
    indexEl.className = 'cs_index'
    indexEl.setAttribute('aria-hidden', 'true')

    const progress = document.createElement('div')
    progress.className = 'cs_progress'
    progress.setAttribute('aria-hidden', 'true')
    const progressFill = document.createElement('div')
    progressFill.className = 'cs_progress_fill'
    progress.appendChild(progressFill)

    const pill = document.createElement('div')
    pill.className = 'cs_pill'
    pill.setAttribute('role', 'group')
    pill.setAttribute('aria-label', 'Slide controls')

    const prevBtn = document.createElement('button')
    prevBtn.type = 'button'
    prevBtn.className = 'cs_arrow'
    prevBtn.setAttribute('aria-label', 'Previous slide')
    prevBtn.innerHTML = '<svg class="cs_arrow_icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'

    const nextBtn = document.createElement('button')
    nextBtn.type = 'button'
    nextBtn.className = 'cs_arrow'
    nextBtn.setAttribute('aria-label', 'Next slide')
    nextBtn.innerHTML = '<svg class="cs_arrow_icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'

    pill.appendChild(prevBtn)
    pill.appendChild(nextBtn)

    const liveRegion = document.createElement('div')
    liveRegion.className = 'cs_live'
    liveRegion.setAttribute('aria-live', 'polite')

    stage.appendChild(layerWrap)
    stage.appendChild(scrim)
    stage.appendChild(labelEl)
    stage.appendChild(titleEl)
    stage.appendChild(indexEl)
    stage.appendChild(progress)
    stage.appendChild(pill)
    stage.appendChild(liveRegion)

    refs = {
      layers: layers,
      layerParts: layerParts,
      labelEl: labelEl,
      titleEl: titleEl,
      indexEl: indexEl,
      progressFill: progressFill,
      prevBtn: prevBtn,
      nextBtn: nextBtn,
      liveRegion: liveRegion,
    }

    layoutStrips()
    settleCurrent()
    return { prevBtn: prevBtn, nextBtn: nextBtn }
  }

  function settleCurrent() {
    const slide = slides[currentIndex]

    const titleChars = splitChars(refs.titleEl, slide.title, 'cs_title_line', 'cs_title_char')
    gsap.set(titleChars, { yPercent: 0, y: 0 })

    const labelChars = splitChars(refs.labelEl, slide.label, 'cs_label_line', 'cs_title_char')
    gsap.set(labelChars, { yPercent: 0, y: 0 })

    setIndexDisplay(refs.indexEl, indexLabel(currentIndex))

    gsap.set(refs.progressFill, {
      scaleX: (currentIndex + 1) / slides.length,
      transformOrigin: 'left center',
    })

    announce()
  }

  function announce() {
    refs.liveRegion.textContent = 'Slide ' + (currentIndex + 1) + ' of ' + slides.length + ': ' + slides[currentIndex].title
  }

  function animateArrowHover(btn, dir) {
    const icon = btn.querySelector('.cs_arrow_icon')
    btn.addEventListener('mouseenter', function () {
      gsap.to(icon, { x: dir * 3, duration: ARROW_HOVER_DUR, ease: 'back.out(2)', overwrite: 'auto', force3D: true })
    })
    btn.addEventListener('mouseleave', function () {
      gsap.to(icon, { x: 0, duration: ARROW_HOVER_DUR, ease: 'expo.out', overwrite: 'auto', force3D: true })
    })
    btn.addEventListener('pointerdown', function () {
      gsap.to(btn, { scale: 0.92, duration: ARROW_PRESS_DUR, ease: 'power2.out', overwrite: 'auto', force3D: true })
    })
    btn.addEventListener('pointerup', function () {
      gsap.to(btn, { scale: 1, duration: ARROW_PRESS_DUR, ease: 'back.out(2.5)', overwrite: 'auto', force3D: true })
    })
    btn.addEventListener('pointerleave', function () {
      gsap.to(btn, { scale: 1, duration: ARROW_PRESS_DUR, ease: 'power2.out', overwrite: 'auto', force3D: true })
    })
  }

  // direction: 1 = next, -1 = prev
  function goTo(newIndex, direction) {
    if (newIndex === currentIndex) return
    const now = performance.now()
    if (now - lastGoTo < 150) return
    lastGoTo = now

    if (inFlight && newIndex === inFlight.outIndex) {
      inFlight.tl.progress(1)
      inFlight = null
    }

    const outIndex = currentIndex
    currentIndex = newIndex
    const slide = slides[newIndex]

    const seq = ++goToSeq
    const tl = gsap.timeline({
      onComplete: function () { if (inFlight && inFlight.tl === tl) inFlight = null },
    })
    inFlight = { tl: tl, outIndex: outIndex }

    const outLayer = refs.layers[outIndex]
    const inLayer = refs.layers[newIndex]
    const outParts = refs.layerParts[outIndex]
    const inParts = refs.layerParts[newIndex]

    zTop += 2
    outLayer.style.zIndex = String(slides.length + zTop + 1)
    inLayer.style.zIndex = String(slides.length + zTop)
    setLayerVisible(outLayer, true)
    setLayerVisible(inLayer, true)

    gsap.killTweensOf(inParts.strips)
    gsap.killTweensOf(inLayer)
    gsap.killTweensOf(inParts.shades)
    clearStripClips(inParts)
    // Zoom the LAYER, not the 12 imgs inside it: scaling twelve
    // stage-sized dpr2 textures per frame forces compositor re-rasters
    // (checkerboard-rectangle flicker on 120Hz retina); one layer
    // transform is compositor-cheap and visually identical while the
    // incoming plate is unclipped.
    gsap.set(inLayer, { scale: ZOOM_FROM, transformOrigin: '50% 50%', force3D: true })
    gsap.set(inParts.shades, { opacity: INCOMING_SHADE })

    const stripDur = duration * STRIP_DUR_RATIO
    const stripStagger = (duration - stripDur) / Math.max(1, columns - 1)

    gsap.killTweensOf(outParts.strips)
    for (let s = 0; s < outParts.strips.length; s++) {
      outParts.strips[s].style.clipPath = direction > 0
        ? 'inset(0% 0% 0% var(--csc, 0%))'
        : 'inset(0% var(--csc, 0%) 0% 0%)'
    }
    gsap.set(outParts.strips, { '--csc': '0%' })
    tl.to(outParts.strips, {
      '--csc': '105%',
      duration: stripDur,
      ease: ease,
      stagger: direction > 0 ? stripStagger : -stripStagger,
      overwrite: true,
    }, 0)
    gsap.killTweensOf(outParts.shades)
    tl.to(outParts.shades, {
      opacity: OUT_SHADE,
      duration: stripDur * 0.8,
      ease: 'power1.in',
      stagger: direction > 0 ? stripStagger : -stripStagger,
      overwrite: 'auto',
    }, 0)

    tl.to(inLayer, {
      scale: 1,
      duration: duration * 1.05,
      ease: ease,
      force3D: true,
    }, 0)
    tl.to(inParts.shades, {
      opacity: 0,
      duration: duration * 1.05,
      ease: ease,
    }, 0)

    tl.call(function () {
      if (seq !== goToSeq) return
      refs.layers.forEach(function (layer, i) {
        const parts = refs.layerParts[i]
        gsap.killTweensOf(parts.strips)
        gsap.killTweensOf(layer)
        gsap.killTweensOf(parts.shades)
        clearStripClips(parts)
        gsap.set(layer, { scale: 1 })
        gsap.set(parts.shades, { opacity: 0 })
        setLayerVisible(layer, i === newIndex)
        layer.style.zIndex = i === newIndex ? String(slides.length) : String(i)
      })
    }, null, duration)

    swapChars(refs.titleEl, slide.title, 'cs_title_line', 'cs_title_char', {
      yPercent: direction > 0 ? -120 : 120,
      y: 0,
      duration: TITLE_OUT_DUR,
      ease: 'annnimateInOut',
      stagger: direction > 0 ? charStagger : -charStagger,
      force3D: true,
      overwrite: true,
    }, {
      from: { yPercent: direction > 0 ? 120 : -120, y: 0 },
      to: { yPercent: 0, y: 0, duration: TITLE_IN_DUR, ease: 'annnimateInOut', stagger: direction > 0 ? charStagger : -charStagger, force3D: true, overwrite: true },
    })

    swapChars(refs.labelEl, slide.label, 'cs_label_line', 'cs_title_char', {
      yPercent: direction > 0 ? -110 : 110,
      y: 0,
      duration: LABEL_DUR * 0.7,
      ease: 'annnimateInOut',
      force3D: true,
      overwrite: true,
    }, {
      from: { yPercent: direction > 0 ? 110 : -110, y: 0 },
      to: { yPercent: 0, y: 0, duration: LABEL_DUR, ease: 'annnimateInOut', force3D: true, overwrite: true },
    })

    rollIndex(refs.indexEl, indexLabel(newIndex))

    gsap.set(refs.progressFill, { transformOrigin: 'left center' })
    tl.to(refs.progressFill, {
      scaleX: (newIndex + 1) / slides.length,
      duration: BAR_DUR,
      ease: ease,
      force3D: true,
      overwrite: 'auto',
    }, 0)

    announce()
    emit('change', { index: newIndex, title: slide.title, label: slide.label })
  }

  function next() {
    const i = (currentIndex + 1) % slides.length
    goTo(i, 1)
  }

  function prev() {
    const i = (currentIndex - 1 + slides.length) % slides.length
    goTo(i, -1)
  }

  // --- 7. Event listeners ---

  const { prevBtn, nextBtn } = buildStage()

  function handlePrevClick() { prev(); armAutoResume() }
  function handleNextClick() { next(); armAutoResume() }
  prevBtn.addEventListener('click', handlePrevClick)
  nextBtn.addEventListener('click', handleNextClick)
  animateArrowHover(prevBtn, -1)
  animateArrowHover(nextBtn, 1)

  function handleKeydown(e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { next(); armAutoResume() }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { prev(); armAutoResume() }
  }
  container.setAttribute('tabindex', container.getAttribute('tabindex') || '0')
  container.addEventListener('keydown', handleKeydown)

  function handlePointerDown(e) {
    if (!dragEnabled) return
    if (e.target.closest('.cs_pill')) { dragActive = false; return }
    dragActive = true
    dragStart = e.clientX
    dragAxisSize = stage.clientWidth
  }
  function handlePointerUp(e) {
    if (!dragActive) return
    dragActive = false
    const pos = e.clientX
    const delta = pos - dragStart
    const threshold = dragAxisSize * SWIPE_THRESHOLD_RATIO
    if (Math.abs(delta) < threshold) return
    if (delta < 0) next(); else prev()
    armAutoResume()
  }
  container.addEventListener('pointerdown', handlePointerDown)
  container.addEventListener('pointerup', handlePointerUp)

  function stopAuto() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null }
  }
  function startAuto() {
    stopAuto()
    if (autoSeconds > 0 && !reducedMotion) {
      autoTimer = setInterval(next, autoSeconds * 1000)
    }
  }
  let resumeTimer = null
  function armAutoResume() {
    if (autoSeconds <= 0) return
    stopAuto()
    clearTimeout(resumeTimer)
    resumeTimer = setTimeout(startAuto, AUTO_RESUME_DELAY * 1000)
  }
  container.addEventListener('mouseenter', stopAuto)
  container.addEventListener('mouseleave', startAuto)
  container.addEventListener('focusin', stopAuto)
  container.addEventListener('focusout', startAuto)

  // --- 8. Initial DOM state ---
  container.setAttribute('role', 'region')
  container.setAttribute('aria-roledescription', 'carousel')
  container.setAttribute('aria-label', slides[currentIndex].title)

  // --- 9. Reduced motion ---
  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: reduce)', function () {
    reducedMotion = true
    gsap.globalTimeline.timeScale(20)
  })

  // --- 10. Public API ---

  let resizeTimer = null
  function handleResize() {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(function () {
      layoutStrips()
    }, 150)
  }
  window.addEventListener('resize', handleResize)

  function handleVisibility() {
    if (document.hidden) { gsap.globalTimeline.pause(); stopAuto() }
    else { gsap.globalTimeline.resume(); startAuto() }
  }
  document.addEventListener('visibilitychange', handleVisibility)

  startAuto()

  refreshFn = function () { settleCurrent() }
  nextFn = function () { next(); armAutoResume() }
  prevFn = function () { prev(); armAutoResume() }
  goToFn = function (i) {
    if (i === currentIndex || i < 0 || i >= slides.length) return
    goTo(i, i > currentIndex ? 1 : -1)
    armAutoResume()
  }

  killFn = function () {
    stopAuto()
    clearTimeout(resumeTimer)
    clearTimeout(resizeTimer)
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('visibilitychange', handleVisibility)
    container.removeEventListener('keydown', handleKeydown)
    container.removeEventListener('pointerdown', handlePointerDown)
    container.removeEventListener('pointerup', handlePointerUp)
    container.removeEventListener('mouseenter', stopAuto)
    container.removeEventListener('mouseleave', startAuto)
    container.removeEventListener('focusin', stopAuto)
    container.removeEventListener('focusout', startAuto)
    prevBtn.removeEventListener('click', handlePrevClick)
    nextBtn.removeEventListener('click', handleNextClick)
    mm.revert()
    if (inFlight) inFlight.tl.kill()
  }
})

onBeforeUnmount(() => {
  killFn?.()
})

defineExpose({
  next: () => nextFn?.(),
  prev: () => prevFn?.(),
  goTo: (i) => goToFn?.(i),
  refresh: () => refreshFn?.(),
})
</script>

<template>
  <div
    ref="containerRef"
    class="cs_wrap"
    data-anm-curtain-slider
  >
    <div ref="stageRef" class="cs_stage" data-anm-cs-stage></div>
  </div>
</template>
