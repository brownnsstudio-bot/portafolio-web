<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(SplitText)

// Accordion -- animated expand/collapse with optional SplitText stagger
// Props derived from attributes.json configurables
const props = defineProps({
  // allowMultiple: Whether multiple items can be open simultaneously
  allowMultiple: {
    type: Boolean,
    default: false,
  },
  // duration: Expand/collapse animation duration in seconds (0.4-1.4)
  duration: {
    type: Number,
    default: 0.8,
  },
  // ease: GSAP easing for expand/collapse
  ease: {
    type: String,
    default: 'expo.inOut',
  },
  // iconMode: Icon animation mode -- 'both', 'rotate', or 'fade'
  iconMode: {
    type: String,
    default: 'both',
  },
  // iconRotation: Degrees to rotate icon on open (-360 to 360)
  iconRotation: {
    type: Number,
    default: -180,
  },
  // delay: Delay before animation starts after trigger click in seconds
  delay: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['open', 'close'])

const containerRef = ref(null)

// Internal per-item state, keyed by index
// Each entry: { tl, splitInstance, textTl, textAnimated, isOpen }
const itemState = []
let openIndices = []
let ctx

// Build the height + icon timeline for a single item
function buildItemTimeline(itemEl, contentEl, iconEl, verticalBarEl) {
  const tl = gsap.timeline({ paused: true, defaults: { duration: props.duration, ease: props.ease } })

  tl.to(contentEl, { height: 'auto', duration: props.duration, ease: props.ease }, 0)

  if (iconEl) {
    if (props.iconMode === 'rotate' || props.iconMode === 'both') {
      tl.to(iconEl, { rotation: props.iconRotation, duration: props.duration, ease: props.ease }, 0)
    }
    if ((props.iconMode === 'fade' || props.iconMode === 'both') && verticalBarEl) {
      tl.to(
        verticalBarEl,
        { opacity: 0, duration: props.duration * 0.5, ease: 'power2.inOut' },
        props.duration * 0.25
      )
    }
  }

  return tl
}

// Animate SplitText stagger for a content element
function animateTextStagger(state, contentEl, staggerConfig) {
  if (state.textAnimated) return
  if (typeof SplitText === 'undefined') return

  const textEls = contentEl.querySelectorAll('.accordion_text, p, span')
  if (!textEls.length) return

  textEls.forEach((textEl) => {
    state.splitInstance = SplitText.create(textEl, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'accordion_split_line',
    })

    const lines = state.splitInstance.lines
    gsap.set(lines, { yPercent: staggerConfig.yPercent, force3D: true })

    state.textTl = gsap.to(lines, {
      yPercent: 0,
      duration: staggerConfig.duration,
      stagger: staggerConfig.delay,
      ease: staggerConfig.ease,
      force3D: true,
    })
  })

  state.textAnimated = true
}

// Reset SplitText state on close so it re-animates on next open
function resetTextStagger(state) {
  if (state.textTl) {
    state.textTl.kill()
    state.textTl = null
  }
  if (state.splitInstance) {
    state.splitInstance.revert()
    state.splitInstance = null
  }
  state.textAnimated = false
}

// Read a data-anm-* attribute with a fallback
function readAttr(el, attr, fallback) {
  const val = el.getAttribute(`data-anm-${attr}`)
  if (val === null) return fallback
  if (val === 'true') return true
  if (val === 'false') return false
  const n = parseFloat(val)
  return isNaN(n) ? val : n
}

// Open a single item by DOM item element + its state
function openItem(itemEl, state) {
  if (state.isOpen) return

  const contentEl = itemEl.querySelector('[data-anm-accordion-content]')
  const triggerEl = itemEl.querySelector('[data-anm-accordion-trigger]')
  const hasStagger = contentEl && contentEl.hasAttribute('data-anm-accordion-stagger-text')
  const staggerStartDelay = contentEl ? readAttr(contentEl, 'stagger-start-delay', 200) : 200

  state.isOpen = true
  state.tl.play()

  if (triggerEl) triggerEl.setAttribute('aria-expanded', 'true')
  if (contentEl) contentEl.setAttribute('aria-hidden', 'false')

  if (hasStagger && contentEl) {
    const staggerConfig = {
      duration: readAttr(contentEl, 'stagger-duration', 0.6),
      delay: readAttr(contentEl, 'stagger-delay', 0.15),
      ease: readAttr(contentEl, 'stagger-ease', 'expo.out'),
      yPercent: readAttr(contentEl, 'stagger-y-percent', 110),
    }
    setTimeout(() => {
      document.fonts.ready.then(() => animateTextStagger(state, contentEl, staggerConfig))
    }, staggerStartDelay)
  }

  emit('open', { item: itemEl, content: contentEl })
  itemEl.dispatchEvent(new CustomEvent('anm-accordion-open', { detail: { item: itemEl, content: contentEl }, bubbles: true }))
}

// Close a single item by DOM item element + its state
function closeItem(itemEl, state) {
  if (!state.isOpen) return

  const contentEl = itemEl.querySelector('[data-anm-accordion-content]')
  const triggerEl = itemEl.querySelector('[data-anm-accordion-trigger]')

  state.isOpen = false
  state.tl.reverse()
  resetTextStagger(state)

  if (triggerEl) triggerEl.setAttribute('aria-expanded', 'false')
  if (contentEl) contentEl.setAttribute('aria-hidden', 'true')

  emit('close', { item: itemEl, content: contentEl })
  itemEl.dispatchEvent(new CustomEvent('anm-accordion-close', { detail: { item: itemEl, content: contentEl }, bubbles: true }))
}

// Toggle an item by index
function toggleByIndex(index) {
  if (!containerRef.value) return
  const items = containerRef.value.querySelectorAll('[data-anm-accordion-item]')
  const itemEl = items[index]
  if (!itemEl || !itemState[index]) return

  const state = itemState[index]

  if (!state.isOpen) {
    // Close others if not allowMultiple
    if (!props.allowMultiple) {
      openIndices.forEach((i) => {
        if (i !== index) {
          const otherEl = items[i]
          if (otherEl && itemState[i]) closeItem(otherEl, itemState[i])
        }
      })
      openIndices = []
    }
    openIndices.push(index)
    openItem(itemEl, state)
  } else {
    openIndices = openIndices.filter((i) => i !== index)
    closeItem(itemEl, state)
  }
}

// Public imperative API
function openAll() {
  if (!containerRef.value) return
  const items = containerRef.value.querySelectorAll('[data-anm-accordion-item]')
  items.forEach((itemEl, i) => {
    if (itemState[i] && !itemState[i].isOpen) {
      openIndices.push(i)
      openItem(itemEl, itemState[i])
    }
  })
}

function closeAll() {
  if (!containerRef.value) return
  const items = containerRef.value.querySelectorAll('[data-anm-accordion-item]')
  items.forEach((itemEl, i) => {
    if (itemState[i] && itemState[i].isOpen) {
      closeItem(itemEl, itemState[i])
    }
  })
  openIndices = []
}

function openAt(index) {
  if (!containerRef.value) return
  const items = containerRef.value.querySelectorAll('[data-anm-accordion-item]')
  const itemEl = items[index]
  if (itemEl && itemState[index] && !itemState[index].isOpen) {
    if (!props.allowMultiple) {
      openIndices.forEach((i) => {
        if (i !== index && itemState[i]) closeItem(items[i], itemState[i])
      })
      openIndices = []
    }
    openIndices.push(index)
    openItem(itemEl, itemState[index])
  }
}

function closeAt(index) {
  if (!containerRef.value) return
  const items = containerRef.value.querySelectorAll('[data-anm-accordion-item]')
  const itemEl = items[index]
  if (itemEl && itemState[index] && itemState[index].isOpen) {
    openIndices = openIndices.filter((i) => i !== index)
    closeItem(itemEl, itemState[index])
  }
}

defineExpose({ openAll, closeAll, openAt, closeAt })

onMounted(() => {
  if (!containerRef.value) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  ctx = gsap.context(() => {
    const items = containerRef.value.querySelectorAll('[data-anm-accordion-item]')

    items.forEach((itemEl, index) => {
      const triggerEl = itemEl.querySelector('[data-anm-accordion-trigger]')
      const contentEl = itemEl.querySelector('[data-anm-accordion-content]')
      const iconEl = itemEl.querySelector('[data-anm-accordion-icon]')
      const verticalBarEl = iconEl ? iconEl.querySelector('[data-anm-accordion-icon-vertical]') : null

      if (!triggerEl || !contentEl) return

      const defaultOpen = readAttr(itemEl, 'open', false) === true

      const state = {
        isOpen: defaultOpen,
        tl: null,
        splitInstance: null,
        textTl: null,
        textAnimated: false,
      }
      itemState[index] = state

      // Set initial collapsed state
      gsap.set(contentEl, {
        height: 0,
        overflow: 'hidden',
        force3D: true,
        willChange: 'height',
      })

      state.tl = buildItemTimeline(itemEl, contentEl, iconEl, verticalBarEl)

      // ARIA wiring
      triggerEl.setAttribute('aria-expanded', defaultOpen ? 'true' : 'false')
      contentEl.setAttribute('aria-hidden', defaultOpen ? 'false' : 'true')

      if (!triggerEl.hasAttribute('aria-controls')) {
        const contentId = contentEl.id || `accordion-content-${index}`
        contentEl.id = contentId
        triggerEl.setAttribute('aria-controls', contentId)
      }

      if (defaultOpen) {
        state.tl.progress(1)
        openIndices.push(index)

        const hasStagger = contentEl.hasAttribute('data-anm-accordion-stagger-text')
        if (hasStagger) {
          const staggerConfig = {
            duration: readAttr(contentEl, 'stagger-duration', 0.6),
            delay: readAttr(contentEl, 'stagger-delay', 0.15),
            ease: readAttr(contentEl, 'stagger-ease', 'expo.out'),
            yPercent: readAttr(contentEl, 'stagger-y-percent', 110),
          }
          document.fonts.ready.then(() => {
            setTimeout(() => animateTextStagger(state, contentEl, staggerConfig), 100)
          })
        }
      }

      // Attach click + keyboard handlers
      triggerEl.addEventListener('click', () => toggleByIndex(index))
      triggerEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggleByIndex(index)
        }
      })
    })
  }, containerRef.value)
})

onUnmounted(() => {
  // Kill all item timelines and SplitText before context revert
  itemState.forEach((state) => {
    if (state.textTl) state.textTl.kill()
    if (state.splitInstance) state.splitInstance.revert()
    if (state.tl) state.tl.kill()
  })
  ctx?.revert()
})
</script>

<template>
  <div ref="containerRef" class="accordion_section" data-anm-accordion>
    <slot />
  </div>
</template>

