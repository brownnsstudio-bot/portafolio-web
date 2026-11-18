(function () {
  'use strict';

  const SELECTOR = '[data-anm-rotating-words]';

  function initRotatingWords(root) {
    // --- 1. Selectors ---
    const list = root.querySelector('[data-anm-rw-list]');
    if (!list) return null;
    const items = Array.from(list.children);
    if (items.length < 2) return null;
    // Scrub mode reads its scroll distance from a tall track around the
    // sticky stage when there is one; without it the drum turns while the
    // wheel crosses the viewport.
    const track = root.closest('[data-anm-rw-track]');

    // --- 2. Config ---
    const scrub   = root.dataset.anmScrub === 'true';
    const spin    = parseFloat(root.dataset.anmSpin || '2.4');
    const settle  = parseFloat(root.dataset.anmSettle || '0.15');
    const step    = parseFloat(root.dataset.anmStep || '18');
    const hold    = Math.min(0.9, Math.max(0, parseFloat(root.dataset.anmHold || '0')));
    const snap    = root.dataset.anmSnap === 'true';
    const snapDelay = Math.max(0, parseFloat(root.dataset.anmSnapDelay || '0.1'));
    const start   = root.dataset.anmStart || 'top 75%';
    const once    = 'anmOnce' in root.dataset && root.dataset.anmOnce !== 'false';
    const nav     = root.dataset.anmNav !== 'false';
    const blur    = Math.max(0, parseFloat(root.dataset.anmBlur || '8'));
    const disable = root.dataset.anmDisable || '';

    // --- 3. Constants ---
    const FALLBACK_EASE   = 'expo.out';
    const SPIN_EASE       = 'annnimate';
    const SETTLE_EASE     = 'annnimateInOut';
    const SETTLE_DURATION = 0.6;
    const GOTO_DURATION   = 0.9;
    // Neighbour words sit this light; the centre word is fully dark.
    const DIM             = 0.14;
    // The landing word steps up in weight and tightens its tracking, so it
    // clicks in like a dial instead of just getting darker.
    const WEIGHT_REST     = 300;
    const WEIGHT_ACTIVE   = 500;
    const TRACK_REST      = -0.02;
    const TRACK_ACTIVE    = -0.045;
    // Distance between two neighbour words on the drum, in item heights.
    const ITEM_GAP        = 1.5;
    const PERSPECTIVE     = 4;
    // Nav dots: the one for the centre word stretches into a pill.
    const DOT_STRETCH     = 2.6;
    const DOT_DIM         = 0.3;
    const DRUM_SMOOTH     = 0.9;
    // Blur on the words themselves, by how far they have curved away: none
    // near the centre (BLUR_FROM of the way to the edge), the full amount at
    // the edge. A backdrop-filter overlay cannot see 3D-transformed content in
    // Safari, so the blur lives on each word. Rounded to half pixels so tiny
    // changes do not repaint.
    const BLUR_FROM       = 0.2;
    const SNAP_DURATION   = { min: 0.25, max: 0.7 };
    const RESIZE_DEBOUNCE = 150;
    const BREAKPOINTS = {
      mobile: '(max-width: 479px)',
      landscape: '(orientation: landscape) and (max-width: 767px)',
      tablet: '(max-width: 991px)',
      desktop: '(min-width: 992px)',
    };

    // --- 4. State ---
    const last = items.length - 1;
    const drum = { p: 0 };
    const scrollProxy = { t: 0 };
    let radius = 0;
    let navs = [];
    let tl = null;
    let st = null;
    let goTween = null;
    let active = false;
    let resizeTimer = null;
    let lastWidth = window.innerWidth;
    let mm = null;

    // --- 5. Helpers ---
    function isDisabled() {
      if (!disable) return false;
      return disable.split(',').some((v) => {
        const q = BREAKPOINTS[v.trim()];
        return q && window.matchMedia(q).matches;
      });
    }

    function ease(name) {
      return gsap.parseEase(name) ? name : FALLBACK_EASE;
    }

    // Scrub: optionally linger on each word, then turn to the next. `hold`
    // is the share of every word-to-word stretch spent standing still (0 =
    // an even turn). Word i always sits exactly at progress i / last.
    function shape(t) {
      const raw = t * last;
      const i = Math.min(last, Math.floor(raw));
      const f = raw - i;
      if (!hold) return raw;
      const g = Math.min(1, Math.max(0, (f - hold / 2) / (1 - hold)));
      return i + g * g * (3 - 2 * g);
    }

    // One row of dots under the wheel, one per word; each is a button to
    // that word.
    function buildNavs() {
      if (!nav) return;
      const el = document.createElement('div');
      el.className = 'rw_nav';
      const dots = items.map((item, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rw_dot';
        btn.setAttribute('aria-label', 'Go to ' + item.textContent.trim());
        btn.addEventListener('click', () => goTo(i));
        el.appendChild(btn);
        return btn;
      });
      root.appendChild(el);
      navs.push({ el, dots });
    }

    // Radius from the item height: neighbours sit ITEM_GAP item heights
    // apart along the drum's surface.
    function layout() {
      const itemH = items[0].offsetHeight || 1;
      radius = (itemH * ITEM_GAP) / (2 * Math.sin((step * Math.PI) / 360));
      list.style.height = Math.round(radius * 2) + 'px';
      list.style.perspective = Math.round(radius * PERSPECTIVE) + 'px';
      render();
    }

    // --- 6. Animation routines ---
    function render() {
      const p = drum.p;
      for (let i = 0; i < items.length; i++) {
        const el = items[i];
        const d = i - p;
        const a = d * step;
        if (Math.abs(a) >= 90) {
          el.style.visibility = 'hidden';
          continue;
        }
        const near = Math.max(0, 1 - Math.abs(d));
        const fade = 1 - Math.abs(a) / 90;
        el.style.visibility = '';
        el.style.transform = 'translate(-50%, -50%) translateZ(' + (-radius) + 'px) rotateX(' + (-a) + 'deg) translateZ(' + radius + 'px)';
        el.style.opacity = String(DIM * fade + (1 - DIM) * near);
        el.style.fontWeight = String(Math.round(WEIGHT_REST + (WEIGHT_ACTIVE - WEIGHT_REST) * near));
        el.style.letterSpacing = (TRACK_REST + (TRACK_ACTIVE - TRACK_REST) * near) + 'em';
        if (blur) {
          const depth = Math.max(0, (Math.abs(a) / 90 - BLUR_FROM) / (1 - BLUR_FROM));
          const b = Math.round(blur * depth * depth * 2) / 2;
          el.style.filter = b > 0 ? 'blur(' + b + 'px)' : '';
        }
      }
      const current = Math.round(p);
      navs.forEach((n) => {
        n.dots.forEach((dot, k) => {
          const near = Math.max(0, 1 - Math.abs(k - p));
          dot.style.setProperty('--rw-dot', String(1 + (DOT_STRETCH - 1) * near));
          dot.style.opacity = String(DOT_DIM + (1 - DOT_DIM) * near);
          if (k === current) dot.setAttribute('aria-current', 'true');
          else dot.removeAttribute('aria-current');
        });
      });
    }

    // Click a dot: scrub mode scrolls the page to where that word sits; spin
    // mode turns the wheel there directly.
    function goTo(i) {
      if (scrub && st) {
        const target = st.start + (st.end - st.start) * (i / last);
        window.scrollTo({ top: target, behavior: 'smooth' });
        return;
      }
      if (tl) tl.pause();
      if (goTween) goTween.kill();
      goTween = gsap.to(drum, { p: i, duration: GOTO_DURATION, ease: ease(SETTLE_EASE), onUpdate: render });
    }

    function buildEnterTimeline() {
      const t = gsap.timeline({ paused: true });
      t.fromTo(drum, { p: 0 }, {
        p: last + settle, duration: spin, ease: ease(SPIN_EASE), onUpdate: render,
        data: { label: 'Drum spins through the list' },
      }, 0);
      t.to(drum, {
        p: last, duration: SETTLE_DURATION, ease: ease(SETTLE_EASE), onUpdate: render,
        data: { label: 'Drum settles on the last word' },
      }, spin);
      return t;
    }

    function scrubRange() {
      return track
        ? { trigger: track, start: 'top top', end: 'bottom bottom' }
        : { trigger: root, start: 'top bottom', end: 'bottom top' };
    }

    function build() {
      layout();
      if (scrub) {
        const drumTween = gsap.fromTo(scrollProxy, { t: 0 }, {
          t: 1, ease: 'none', paused: true,
          onUpdate: () => { drum.p = shape(scrollProxy.t); render(); },
          data: { label: 'Drum turns with the scroll' },
        });
        const config = Object.assign({ scrub: DRUM_SMOOTH, animation: drumTween }, scrubRange());
        // Snap: once scrolling has stopped for snapDelay seconds, the page
        // settles so a word sits in the centre.
        if (snap) config.snap = { snapTo: 1 / last, duration: SNAP_DURATION, delay: snapDelay, ease: ease(SETTLE_EASE) };
        st = ScrollTrigger.create(config);
      } else {
        tl = buildEnterTimeline();
        st = ScrollTrigger.create({
          trigger: root,
          start: start,
          once: once,
          toggleActions: once ? 'play none none none' : 'play none none reverse',
          animation: tl,
        });
      }
      gsap.set(root, { autoAlpha: 1 });
    }

    function teardown() {
      if (st) st.kill();
      if (tl) tl.kill();
      if (goTween) goTween.kill();
      st = null;
      tl = null;
      goTween = null;
    }

    // Reduced motion or a disabled viewport: the wheel rests on its last
    // word, nothing moves (the dots still jump to a word).
    function showStatic() {
      drum.p = last;
      layout();
      gsap.set(root, { autoAlpha: 1 });
    }

    function whenFontsReady(cb) {
      const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      ready.then(cb);
    }

    function enable() {
      if (isDisabled()) {
        whenFontsReady(showStatic);
        return undefined;
      }
      active = true;
      drum.p = 0;
      scrollProxy.t = 0;
      gsap.set(root, { autoAlpha: 0 });
      whenFontsReady(() => { if (active) build(); });
      return () => {
        active = false;
        teardown();
      };
    }

    // Width only: a mobile URL bar changes the height on every scroll.
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth === lastWidth) return;
        lastWidth = window.innerWidth;
        layout();
        ScrollTrigger.refresh();
      }, RESIZE_DEBOUNCE);
    }

    function onVisibility() {
      if (document.hidden) gsap.globalTimeline.pause();
      else gsap.globalTimeline.resume();
    }

    // --- 7. Event listeners ---
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    // --- 8. Initial DOM state ---
    // Without JS the words are a plain centred list; the built class turns
    // them into the drum.
    root.classList.add('rw_is-built');
    buildNavs();

    // --- 9. Reduced motion ---
    mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' }, (ctx) => {
      if (ctx.conditions.motion) return enable();
      whenFontsReady(showStatic);
      return undefined;
    });

    // --- 10. Public API ---
    return {
      goTo,
      kill() {
        clearTimeout(resizeTimer);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibility);
        mm.revert();
        navs.forEach((n) => n.el.remove());
        navs = [];
        root.classList.remove('rw_is-built');
        items.forEach((el) => el.removeAttribute('style'));
        list.removeAttribute('style');
        gsap.set(root, { clearProps: 'visibility,opacity' });
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
    if (typeof CustomEase !== 'undefined') {
      gsap.registerPlugin(CustomEase);
      CustomEase.create('annnimate', 'M0,0 C0.3,0.9 0.1,1 1,1');
      CustomEase.create('annnimateInOut', 'M0,0 C0.7,0 0.16,1 1,1');
    }

    let instances = [];
    function boot() {
      document.querySelectorAll(SELECTOR).forEach((el) => {
        const api = initRotatingWords(el);
        if (api) instances.push(api);
      });
    }
    boot();

    window.Anm = window.Anm || {};
    window.Anm.RotatingWords = {
      refresh() {
        instances.forEach((i) => i.kill());
        instances = [];
        boot();
      },
    };
  });
})();
