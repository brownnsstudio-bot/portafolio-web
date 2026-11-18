(function () {
  'use strict';

  const SELECTOR = '[data-anm-echo-headline]';

  function initEchoHeadline(root) {
    // --- 1. Selectors ---
    // root is the tall track; the stage inside it sticks while the track
    // scrolls past. The echoes go into the word's parent, which hugs the
    // word, so every copy sits exactly on it.
    const word = root.querySelector('[data-anm-eh-word]');
    if (!word || !word.parentElement) return null;
    const slab = word.parentElement;

    // --- 2. Config ---
    const copies  = Math.min(20, Math.max(4, parseInt(root.dataset.anmCopies, 10) || 8));
    // The farthest echo ends at 1 / (1 + depth) of the word's size.
    const depth   = Math.min(5, Math.max(0.5, parseFloat(root.dataset.anmDepth) || 1));
    // Degrees the word turns into as you scroll, like CSS rotateX / rotateY /
    // rotate. Z turns the whole slab, trail included.
    const rotateX = Math.min(80, Math.max(-80, parseFloat(root.dataset.anmRotateX ?? '20') || 0));
    const rotateY = Math.min(80, Math.max(-80, parseFloat(root.dataset.anmRotateY ?? '20') || 0));
    const rotateZ = Math.min(180, Math.max(-180, parseFloat(root.dataset.anmRotateZ) || 0));
    // How the echoes step back: 'color' mixes them toward the background,
    // 'opacity' keeps the word's colour and makes them more transparent.
    const fade    = root.dataset.anmFade === 'color' ? 'color' : 'opacity';
    // 'scrub' ties the slab to a tall sticky track; 'onEnter' plays it once
    // the word scrolls into view and reverses on the way back up.
    const trigger = root.dataset.anmTrigger === 'onEnter' ? 'onEnter' : 'scrub';
    // 0 (or junk) means scrub: true, the slab follows the scrollbar exactly.
    const scrub   = Math.max(0, parseFloat(root.dataset.anmScrub || '0.5')) || true;
    // Play it once and keep the result: onEnter never reverses, scrub locks
    // the finished slab after the first full pass.
    const once    = root.dataset.anmOnce === 'true';
    // Share of the track at the end where the finished slab stays on screen.
    const hold    = Math.min(0.6, Math.max(0, parseFloat(root.dataset.anmHold ?? '0.2') || 0));
    const disable = root.dataset.anmDisable || '';

    // --- 3. Constants ---
    // Camera distance as a multiple of the word's width, so a short word and
    // a long one foreshorten the same way when they turn.
    const PERSPECTIVE  = 1.6;
    // The vanishing point, in word heights above the word's centre: the
    // echoes recede toward it, so the slab stacks out on top of the word.
    const VANISH_LIFT  = 1.2;
    // Color mode: how far each end of the slab mixes toward the background,
    // in percent. The far end nearly melts into the page.
    const FADE_NEAR    = 30;
    const FADE_FAR     = 90;
    // Opacity mode: geometric, because overlapping see-through layers add up.
    const OPACITY_NEAR = 0.35;
    const OPACITY_FAR  = 0.02;
    const FALLBACK_GROUND = '#ffffff';
    // A fully transparent computed colour: rgba(0, 0, 0, 0), color(... / 0).
    const TRANSPARENT  = /(?:,|\/)\s*0(?:\.0+)?\s*\)$|^transparent$/;
    // Below this spread every echo sits inside the word's own outline.
    const HIDE_BELOW   = 0.002;
    // onEnter: fires when the word's centre passes this line of the viewport.
    const ENTER_START  = 'center 65%';
    const ENTER_DUR    = 1.6;
    const ENTER_EASE   = 'expo.out';
    const BREAKPOINTS = {
      mobile: '(max-width: 479px)',
      landscape: '(orientation: landscape) and (max-width: 767px)',
      tablet: '(max-width: 991px)',
      desktop: '(min-width: 992px)',
    };

    // --- 4. State ---
    const spread = { p: 0 };
    const rest = { p: 0 };
    let echoes = [];
    let shown = false;
    let tl = null;
    let st = null;
    let mm = null;
    let geo = null;

    // --- 5. Helpers ---
    function isDisabled() {
      if (!disable) return false;
      return disable.split(',').some((v) => {
        const q = BREAKPOINTS[v.trim()];
        return q && window.matchMedia(q).matches;
      });
    }

    function em(v) {
      return v.toFixed(4) + 'em';
    }

    // All in em: the word never wraps, so its size in em holds at any width.
    function measure() {
      const fs = parseFloat(getComputedStyle(slab).fontSize);
      const hw = slab.offsetWidth / fs / 2;
      const hh = slab.offsetHeight / fs / 2;
      const p = PERSPECTIVE * hw * 2;
      geo = { hw: hw, hh: hh, p: p, d: depth * p, vy: -VANISH_LIFT * hh * 2 };
      root.style.setProperty('--eh-perspective', em(p));
      root.style.setProperty('--eh-depth', em(geo.d));
      root.style.setProperty('--eh-vanish', '50% calc(50% + ' + em(geo.vy) + ')');
    }

    // Projects the word and the farthest echo at the current pose, the same
    // maths the browser runs, and shifts the slab so both sit centred. At rest
    // the shift is zero, so the word starts dead centre.
    function frame(s) {
      const { hw, hh, p, d, vy } = geo;
      const a = rotateX * s * Math.PI / 180;
      const b = rotateY * s * Math.PI / 180;
      const box = [Infinity, -Infinity, Infinity, -Infinity];
      [0, -d * s].forEach((z) => [-hw, hw].forEach((x) => [-hh, hh].forEach((y) => {
        const x1 = x * Math.cos(b) + z * Math.sin(b);
        const z1 = z * Math.cos(b) - x * Math.sin(b);
        const y2 = y * Math.cos(a) - z1 * Math.sin(a);
        const z2 = y * Math.sin(a) + z1 * Math.cos(a);
        const f = p / (p - z2);
        const sx = x1 * f;
        const sy = vy + (y2 - vy) * f;
        box[0] = Math.min(box[0], sx);
        box[1] = Math.max(box[1], sx);
        box[2] = Math.min(box[2], sy);
        box[3] = Math.max(box[3], sy);
      })));
      root.style.setProperty('--eh-shift', em(-(box[0] + box[1]) / 2) + ', ' + em(-(box[2] + box[3]) / 2));
    }

    // The first painted background behind the headline, whatever colour the
    // page uses; a light page fades the echoes lighter, a dark one darker.
    function findGround() {
      for (let el = slab; el; el = el.parentElement) {
        const bg = getComputedStyle(el).backgroundColor;
        if (!TRANSPARENT.test(bg)) return bg;
      }
      return FALLBACK_GROUND;
    }

    // The mix itself runs in CSS (color-mix in oklab), so any colour format
    // the page uses works and the steps look even to the eye.
    function setTones() {
      root.style.setProperty('--eh-ink', getComputedStyle(word).color);
      root.style.setProperty('--eh-ground', findGround());
    }

    // Farthest first, so the nearest echo paints last and the word, after
    // them in the DOM, stays on top. Each echo knows its place in the slab;
    // the CSS turns that into its depth and tone.
    function buildEchoes() {
      for (let i = copies; i >= 1; i--) {
        const el = document.createElement('div');
        el.className = 'eh_echo';
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = word.innerHTML;
        slab.insertBefore(el, word);
        const far = (i - 1) / (copies - 1);
        el.style.setProperty('--eh-i', (i / copies).toFixed(4));
        if (fade === 'opacity') gsap.set(el, { opacity: OPACITY_NEAR * Math.pow(OPACITY_FAR / OPACITY_NEAR, far) });
        else el.style.setProperty('--eh-fade', (FADE_NEAR + (FADE_FAR - FADE_NEAR) * far).toFixed(1) + '%');
        echoes[i - 1] = el;
      }
    }

    // --- 6. Animation routines ---
    // One progress drives the turn and the extrusion together; the browser
    // does the 3D, so the slab moves as one solid object, never a stagger.
    function render() {
      const s = spread.p;
      root.style.setProperty('--eh-rx', (rotateX * s).toFixed(3) + 'deg');
      root.style.setProperty('--eh-ry', (rotateY * s).toFixed(3) + 'deg');
      root.style.setProperty('--eh-rz', (rotateZ * s).toFixed(3) + 'deg');
      root.style.setProperty('--eh-reach', s.toFixed(4));
      frame(s);
      const show = s > HIDE_BELOW;
      if (show !== shown) {
        shown = show;
        gsap.set(echoes, { visibility: show ? 'visible' : 'hidden' });
      }
    }

    // Linear on purpose: perspective already eases the growth, fast at first
    // and slower as the far end nears the vanishing point.
    // The slab finishes `hold` before the end of the track and the rest of
    // the scroll is an empty stretch with the result on screen.
    function buildScrubTimeline() {
      const run = 1 - hold;
      const t = gsap.timeline({ paused: true });
      t.fromTo(spread, { p: 0 }, {
        p: 0.5, duration: run / 2, ease: 'none', onUpdate: render,
        data: { label: 'Echoes peel out of the word' },
      }, 0);
      t.fromTo(spread, { p: 0.5 }, {
        p: 1, duration: run / 2, ease: 'none', onUpdate: render, immediateRender: false,
        data: { label: 'Slab stretches to full depth' },
      }, run / 2);
      if (hold > 0) {
        t.fromTo(rest, { p: 0 }, {
          p: 1, duration: hold, ease: 'none',
          data: { label: 'Finished slab holds on screen' },
        }, run);
      }
      return t;
    }

    function buildEnterTimeline() {
      const t = gsap.timeline({ paused: true });
      t.fromTo(spread, { p: 0 }, {
        p: 1, duration: ENTER_DUR, ease: ENTER_EASE, easeReverse: true, onUpdate: render,
        data: { label: 'Word turns, echoes peel out' },
      }, 0);
      return t;
    }

    function build() {
      measure();
      setTones();
      // A late webfont changes the word's width; measure again once it lands.
      document.fonts.ready.then(() => { if (tl) { measure(); frame(spread.p); } });
      buildEchoes();
      render();
      if (trigger === 'scrub') {
        tl = buildScrubTimeline();
        st = ScrollTrigger.create({ trigger: root, start: 'top top', end: 'bottom bottom', scrub: scrub, animation: tl });
        // Killing the trigger leaves the timeline where it is: at the end.
        if (once) tl.eventCallback('onComplete', () => st.kill());
      } else {
        tl = buildEnterTimeline();
        st = ScrollTrigger.create({ trigger: root, start: ENTER_START, animation: tl, toggleActions: once ? 'play none none none' : 'play none none reverse' });
      }
    }

    function teardown() {
      if (st) st.kill();
      if (tl) tl.kill();
      echoes.forEach((el) => el.remove());
      ['--eh-perspective', '--eh-depth', '--eh-vanish', '--eh-shift', '--eh-ink', '--eh-ground', '--eh-rx', '--eh-ry', '--eh-rz', '--eh-reach']
        .forEach((v) => root.style.removeProperty(v));
      spread.p = 0;
      rest.p = 0;
      geo = null;
      echoes = [];
      shown = false;
      st = null;
      tl = null;
    }

    // Reduced motion and disabled viewports never get here: without the
    // built class the word sits in the page as one plain headline.
    function enable() {
      if (isDisabled()) return undefined;
      root.classList.add('eh_is-built');
      // Only scrub mode gets the tall sticky track.
      if (trigger === 'scrub') root.classList.add('eh_is-scrub');
      build();
      return () => {
        teardown();
        root.classList.remove('eh_is-built', 'eh_is-scrub');
      };
    }

    function onVisibility() {
      if (document.hidden) gsap.globalTimeline.pause();
      else gsap.globalTimeline.resume();
    }

    // --- 7. Event listeners ---
    // No resize handler: the geometry is all em and percent, nothing is
    // measured in px, and ScrollTrigger refreshes its own positions.
    document.addEventListener('visibilitychange', onVisibility);

    // --- 9. Reduced motion ---
    mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', enable);

    // --- 10. Public API ---
    return {
      kill() {
        document.removeEventListener('visibilitychange', onVisibility);
        mm.revert();
      },
    };
  }

  function waitForGSAP(cb, attempts) {
    attempts = attempts || 0;
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') { cb(); return; }
    if (attempts < 100) setTimeout(() => waitForGSAP(cb, attempts + 1), 50);
    else console.error('[Annnimate] gsap/ScrollTrigger failed to load');
  }

  waitForGSAP(() => {
    gsap.registerPlugin(ScrollTrigger);

    let instances = [];
    function boot() {
      document.querySelectorAll(SELECTOR).forEach((el) => {
        const api = initEchoHeadline(el);
        if (api) instances.push(api);
      });
    }
    boot();

    window.Anm = window.Anm || {};
    window.Anm.EchoHeadline = {
      refresh() {
        instances.forEach((i) => i.kill());
        instances = [];
        boot();
      },
    };
  });
})();
