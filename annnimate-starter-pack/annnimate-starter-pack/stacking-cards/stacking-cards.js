(function () {
  'use strict';

  const SELECTOR = '[data-anm-stacking-cards]';

  function initStackingCards(root) {
    // --- 1. Selectors ---
    // root is the tall scroll track; the stage inside it sticks while the
    // track scrolls past, and the cards slide through the frame in order.
    const cards = Array.from(root.querySelectorAll('[data-anm-stk-card]')).map((card) => {
      const fig = card.querySelector('[data-anm-stk-fig]');
      const label = card.querySelector('[data-anm-stk-label]');
      return {
        card: card,
        clip: card.querySelector('[data-anm-stk-clip]'),
        fig: fig,
        img: fig && fig.querySelector('img'),
        label: label,
        text: label && label.firstElementChild,
      };
    });
    const index = root.querySelector('[data-anm-stk-index]');
    if (cards.length < 2 || cards.some((c) => !c.clip || !c.fig)) return null;

    // --- 2. Config ---
    // The covered card sinks `drop` percent, shrinks by `shrink` times the
    // base clip and darkens to `shade`; its photo zooms to `zoom`, which with
    // the shared tilt turns the photo inside its shrinking frame. The incoming
    // photo trails its card by `drift` percent, and its label rises once the
    // card is `labelDelay` of the way in.
    const stepHeight = readNum('anmStepHeight', 50, 20, 150);
    const tilt = readNum('anmTilt', 2, -10, 10);
    const zoom = readNum('anmZoom', 1.2, 1, 2);
    const drop = readNum('anmDrop', 20, 0, 60);
    const drift = readNum('anmDrift', 10, 0, 30);
    const labelDelay = readNum('anmLabelDelay', 60, 0, 95) / 100;
    const shrink = root.dataset.anmShrink;
    const shade = root.dataset.anmShade;
    const radius = root.dataset.anmRadius;
    const scrub = readNum('anmScrub', 0.5, 0, 3);
    const disable = root.dataset.anmDisable || '';

    // --- 3. Constants ---
    CustomEase.create('annnimate', 'M0,0 C0.3,0.9 0.1,1 1,1');
    // Share of a step the covered card's label takes to fade.
    const LABEL_OUT = 0.1;
    // The incoming label and the counter play on their own clock, not the scrub.
    const LABEL_RISE_DUR = 0.8;
    const LABEL_DROP_DUR = 0.4;
    // clears the mask with the descender padding included
    const LABEL_HIDE = 120;
    const COUNT_DUR = 0.6;
    // a click holds the counter on its target until the page arrives there
    const CLICK_LOCK = 1.5;
    const JUMP_DUR = 0.6;
    const BREAKPOINTS = {
      mobile: '(max-width: 479px)',
      landscape: '(orientation: landscape) and (max-width: 767px)',
      tablet: '(max-width: 991px)',
      desktop: '(min-width: 992px)',
    };

    // --- 4. State ---
    const n = cards.length;
    const nums = [];
    const ticks = [];
    const risen = [];
    let tl = null;
    let mm = null;
    let active = -1;
    let lockTo = -1;
    let lockUntil = 0;
    let lastY = null;

    // --- 5. Helpers ---
    function readNum(key, fallback, min, max) {
      const v = parseFloat(root.dataset[key]);
      return isNaN(v) ? fallback : Math.min(max, Math.max(min, v));
    }

    function isDisabled(conditions) {
      if (!disable) return false;
      return disable.split(',').some((v) => conditions[v.trim()]);
    }

    function nameOf(c) {
      return c.label ? c.label.textContent.trim() : 'Card';
    }

    function pad2(i) {
      return (i < 10 ? '0' : '') + i;
    }

    function make(tag, className, text) {
      const el = document.createElement(tag);
      el.className = className;
      if (text) el.textContent = text;
      return el;
    }

    // The counter shows the card number, the ticks fill as each card slides in
    // and jump to it on click. Built from the cards, so a copied card gets one.
    function buildIndex() {
      const count = make('span', 'stk_count');
      const num = make('span', 'stk_num');
      const list = make('span', 'stk_ticks');
      count.setAttribute('aria-hidden', 'true');
      cards.forEach((c, i) => {
        nums.push(num.appendChild(make('span', '', pad2(i + 1))));
        const tick = list.appendChild(make('button', 'stk_tick'));
        tick.type = 'button';
        tick.setAttribute('aria-label', nameOf(c));
        ticks.push(tick);
      });
      count.append(num, make('span', 'stk_total', '/ ' + pad2(n)));
      index.append(count, list);
    }

    function scrollToY(y) {
      if (window.lenis) {
        window.lenis.scrollTo(y, { duration: JUMP_DUR, easing: (t) => 1 - Math.pow(1 - t, 3) });
        return;
      }
      const scroller = document.querySelector('[data-transition-content]');
      if (scroller && scroller.scrollHeight > scroller.clientHeight) scroller.scrollTo({ top: y, behavior: 'smooth' });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    }

    // --- 6. Animation routines ---
    // One step per card after the first: it slides up through the frame with
    // its photo trailing inside it, while the card under it shrinks back,
    // tilts and sinks. The scale lets the trailing photo still cover the card.
    function buildStep(out, inc, i) {
      const step = gsap.timeline({ data: { label: nameOf(inc) + ' slides over ' + nameOf(out) } });
      step.fromTo(inc.card, { yPercent: 101, y: 0 }, { yPercent: 0, y: 0, duration: 1, ease: 'none', force3D: true }, 0);
      if (drift && inc.img) {
        step.fromTo(inc.img, { yPercent: -drift, y: 0, scale: 1 + drift / 50 }, {
          yPercent: 0, y: 0, scale: 1, duration: 1, ease: 'none', force3D: true,
        }, 0);
      }
      step.fromTo(out.clip, { rotation: 0, yPercent: 0, y: 0, '--stk-c': 0 }, {
        rotation: tilt, yPercent: drop, y: 0, '--stk-c': 1, duration: 1, ease: 'none', force3D: true,
      }, 0);
      step.fromTo(out.fig, { scale: 1, rotation: 0 }, { scale: zoom, rotation: tilt, duration: 1, ease: 'none', force3D: true }, 0);
      if (out.label) step.fromTo(out.label, { opacity: 1 }, { opacity: 0, duration: LABEL_OUT, ease: 'none' }, 0);
      if (ticks[i]) step.fromTo(ticks[i], { '--stk-f': 0 }, { '--stk-f': 1, duration: 1, ease: 'none' }, 0);
      return step;
    }

    function setLabel(i, up, now) {
      const text = cards[i].text;
      if (!text || risen[i] === up) return;
      risen[i] = up;
      const yPercent = up ? 0 : LABEL_HIDE;
      if (now) gsap.set(text, { yPercent: yPercent, y: 0, overwrite: true });
      else gsap.to(text, { yPercent: yPercent, y: 0, duration: up ? LABEL_RISE_DUR : LABEL_DROP_DUR, ease: 'annnimate', overwrite: true });
    }

    // The old number leaves the way the scroll is going and the new one
    // follows it in; a change mid-roll carries on from where it is.
    function setActive(i, now) {
      if (i === active) return;
      const prev = active;
      const dir = i > prev ? 1 : -1;
      active = i;
      ticks.forEach((t, k) => {
        if (k === i) t.setAttribute('aria-current', 'true');
        else t.removeAttribute('aria-current');
      });
      if (!nums.length) return;
      if (now || prev < 0) {
        nums.forEach((d, k) => gsap.set(d, { yPercent: k === i ? 0 : 100, y: 0, overwrite: true }));
        return;
      }
      gsap.to(nums[prev], { yPercent: -100 * dir, y: 0, duration: COUNT_DUR, ease: 'annnimate', overwrite: true });
      gsap.fromTo(nums[i], { yPercent: 100 * dir, y: 0 }, { yPercent: 0, y: 0, duration: COUNT_DUR, ease: 'annnimate', overwrite: true });
    }

    // A scroll plays the changes; a refresh at the same scroll position only
    // sets them, so nothing plays without input.
    function sync(self) {
      const y = self.scroll();
      const now = lastY === null || y === lastY;
      lastY = y;
      const pos = self.progress * (n - 1);
      for (let i = 1; i < n; i++) setLabel(i, pos >= i - 1 + labelDelay, now);
      if (lockTo >= 0) {
        if (Math.round(pos) !== lockTo && performance.now() < lockUntil) return;
        lockTo = -1;
      }
      setActive(Math.round(pos), now);
    }

    function scrollToCard(i) {
      const st = tl && tl.scrollTrigger;
      if (!st || i < 0) return;
      lockTo = i;
      lockUntil = performance.now() + CLICK_LOCK * 1000;
      setActive(i, false);
      scrollToY(st.start + (st.end - st.start) * (i / (n - 1)));
    }

    // The track is one screen plus one step per card after the first, so the
    // stage sticks exactly while the steps run, back to back.
    function build() {
      root.classList.remove('stk_is-static');
      root.style.setProperty('--stk-n', n);
      root.style.setProperty('--stk-step', stepHeight);
      tl = gsap.timeline({
        scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: scrub || true, onUpdate: sync },
      });
      for (let i = 1; i < n; i++) tl.add(buildStep(cards[i - 1], cards[i], i), i - 1);
      risen.length = 0;
      active = -1;
      lastY = null;
      sync(tl.scrollTrigger);
    }

    function teardown() {
      root.style.removeProperty('--stk-n');
      root.style.removeProperty('--stk-step');
      const rolled = nums.concat(cards.map((c) => c.text).filter(Boolean));
      gsap.killTweensOf(rolled);
      gsap.set(rolled, { clearProps: 'transform' });
      ticks.forEach((t) => t.removeAttribute('aria-current'));
      tl = null;
    }

    // --- 7. Event listeners ---
    function onTick(e) {
      scrollToCard(ticks.indexOf(e.currentTarget));
    }

    function onVisibility() {
      if (document.hidden) gsap.globalTimeline.pause();
      else gsap.globalTimeline.resume();
    }

    if (index) buildIndex();
    ticks.forEach((t) => t.addEventListener('click', onTick));
    document.addEventListener('visibilitychange', onVisibility);

    // --- 8. Initial DOM state ---
    // The look-only settings are CSS variables, so the CSS keeps the defaults.
    if (shrink) root.style.setProperty('--stk-shrink', readNum('anmShrink', 1, 0, 2));
    if (shade) root.style.setProperty('--stk-shade', readNum('anmShade', 0.5, 0, 1));
    if (radius) root.style.setProperty('--stk-radius', readNum('anmRadius', 4, 0, 40) + 'px');

    // --- 9. Reduced motion ---
    // Reduced motion and disabled viewports get the plain list of cards.
    mm = gsap.matchMedia();
    mm.add(Object.assign({
      motion: '(prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)',
    }, BREAKPOINTS), (context) => {
      if (context.conditions.reduce || isDisabled(context.conditions)) {
        root.classList.add('stk_is-static');
        return undefined;
      }
      build();
      return teardown;
    });

    // --- 10. Public API ---
    return {
      kill() {
        ticks.forEach((t) => t.removeEventListener('click', onTick));
        document.removeEventListener('visibilitychange', onVisibility);
        mm.revert();
        if (index) index.replaceChildren();
        root.classList.remove('stk_is-static');
        ['--stk-shrink', '--stk-shade', '--stk-radius'].forEach((v) => root.style.removeProperty(v));
      },
    };
  }

  function waitForGSAP(cb, attempts) {
    attempts = attempts || 0;
    const ready = typeof gsap !== 'undefined'
      && typeof ScrollTrigger !== 'undefined'
      && typeof CustomEase !== 'undefined';
    if (ready) { cb(); return; }
    if (attempts < 100) setTimeout(() => waitForGSAP(cb, attempts + 1), 50);
    else console.error('[Annnimate] gsap/ScrollTrigger/CustomEase failed to load');
  }

  waitForGSAP(() => {
    gsap.registerPlugin(ScrollTrigger, CustomEase);

    let instances = [];
    function boot() {
      document.querySelectorAll(SELECTOR).forEach((el) => {
        const api = initStackingCards(el);
        if (api) instances.push(api);
      });
    }
    boot();

    window.Anm = window.Anm || {};
    window.Anm.StackingCards = {
      refresh() {
        instances.forEach((i) => i.kill());
        instances = [];
        boot();
      },
      kill() {
        instances.forEach((i) => i.kill());
        instances = [];
      },
    };
  });
})();
