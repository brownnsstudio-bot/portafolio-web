(function () {
  'use strict';

  // Digit columns use the same technique as index-wipe's odometer: a fixed
  // height strip of the ten digit faces, positioned via a y offset in em
  // units. Tweening that offset from the old digit to the new one is
  // automatically direction-aware - a larger digit sits further down the
  // strip, so the tween naturally scrolls up, and a smaller digit scrolls
  // down. Nothing has to branch on direction by hand.

  function initPricing(container) {
    // --- 1. Selectors ---
    const toggleBtn = container.querySelector('[data-anm-prc-toggle]');
    const knob = container.querySelector('[data-anm-prc-knob]');
    const chip = container.querySelector('[data-anm-prc-chip]');
    const chipInner = chip ? chip.querySelector('[data-anm-prc-chip-inner]') : null;
    const cardEls = Array.prototype.slice.call(container.querySelectorAll('[data-anm-prc-card]'));

    if (!toggleBtn || !knob || !cardEls.length) return null;
    if (isDisabledOnViewport(container)) return null;

    // --- 2. Config ---
    const rollDuration = parseFloat(container.dataset.anmRollDuration || '0.6');
    const digitStagger = parseFloat(container.dataset.anmDigitStagger || '0.04');
    const toggleDuration = parseFloat(container.dataset.anmToggleDuration || '0.4');
    const savingsLabel = container.dataset.anmSavingsLabel || 'Save 17%';
    const defaultPeriod = container.dataset.anmDefaultPeriod === 'yearly' ? 'yearly' : 'monthly';
    const currency = container.dataset.anmCurrency || 'EUR';
    const showChip = container.dataset.anmShowSavingsChip !== 'false';
    const ease = container.dataset.anmEase || 'annnimateInOut';
    const shimmerDuration = parseFloat(container.dataset.anmShimmerDuration || '2.4');

    // --- 3. Constants ---
    const KNOB_STRETCH_DUR = toggleDuration * 0.35;
    const KNOB_SETTLE_DUR = toggleDuration * 0.45;
    const KNOB_SMEAR_SCALE = 1.18;
    const CHIP_DUR = 0.28;
    const DIGIT_WIDTH = '0.6em';
    const PERIOD_ROLL_DUR = 0.4;

    // --- 4. State ---
    let period = defaultPeriod;
    let reducedMotion = false;
    let activeTl = null;
    let cards = [];

    // --- 5. Helpers ---

    function isDisabledOnViewport(el) {
      const disable = el.dataset.anmDisable;
      if (!disable) return false;
      const breakpoints = {
        mobile: '(max-width: 479px)',
        landscape: '(orientation: landscape) and (max-width: 767px)',
        tablet: '(max-width: 991px)',
        desktop: '(min-width: 992px)',
      };
      return disable.split(',').some(function (v) {
        const q = breakpoints[v.trim()];
        return q && window.matchMedia(q).matches;
      });
    }

    function digitsOf(value) {
      return String(Math.round(value)).split('');
    }

    function buildDigitColumn(digitChar) {
      const col = document.createElement('span');
      col.className = 'prc_digit_col';
      const roller = document.createElement('span');
      roller.className = 'prc_digit_roller';
      for (let d = 0; d <= 9; d++) {
        const face = document.createElement('span');
        face.className = 'prc_digit_face';
        face.textContent = String(d);
        roller.appendChild(face);
      }
      col.appendChild(roller);
      gsap.set(roller, { y: -parseInt(digitChar, 10) + 'em' });
      return col;
    }

    // Called when a toggle interrupts a running one: columns still clipping
    // out are removed now, columns still clipping in snap to full width, so
    // the next roll starts from a consistent column set.
    function settlePrice(priceEl) {
      Array.prototype.slice.call(priceEl.querySelectorAll('[data-dropping]')).forEach(function (col) {
        col.remove();
      });
      gsap.set(priceEl.children, { clearProps: 'width' });
    }

    // The highlight band of each name gradient sweeps across the text on a
    // constant loop (Julian's call, 2026-09-01 - a deliberate exception to
    // the no-idle-loop rule), offset per card so the three never sweep in
    // unison. Pauses with the tab via the visibilitychange handler.
    // The gradient is periodic (two bands over a 200% image), so one linear
    // pass from 100% to 0% shifts it by exactly one period and the repeat is
    // seamless - no rest, no visible reset. Each card starts a third of a
    // cycle apart.
    function startShimmerLoop(nameEl, index) {
      if (!nameEl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
      const t = gsap.fromTo(nameEl, { backgroundPosition: '100% 0%' }, {
        backgroundPosition: '0% 0%',
        duration: shimmerDuration,
        ease: 'none',
        repeat: -1,
        data: { label: 'Plan name shimmer loop' },
      });
      t.progress((index / 3) % 1);
      return t;
    }

    function setPriceValue(priceEl, value) {
      priceEl.innerHTML = '';
      digitsOf(value).forEach(function (ch) {
        priceEl.appendChild(buildDigitColumn(ch));
      });
    }

    // Rolls a price to a new value on the master timeline `tl`, at `pos`.
    // Digit count can change between plans (20 -> 199): columns the new
    // value no longer needs clip out and are removed on complete, columns it
    // gains clip in from zero width, and the overlapping right-aligned
    // columns just roll like a normal odometer, staggered from the right.
    function addPriceRoll(tl, priceEl, value, pos, label) {
      const newDigits = digitsOf(value);
      const cols = Array.prototype.slice.call(priceEl.children);
      const diff = newDigits.length - cols.length;

      // Breaking the transform-only rule on purpose: width is the one
      // property that moves the currency and period labels WITH the new
      // digit. A clip or scale leaves the column at full width in layout,
      // so the row jumps. Scoped to 0.6em columns, three prices at most.
      if (diff > 0) {
        for (let i = 0; i < diff; i++) {
          const col = buildDigitColumn('0');
          gsap.set(col, { width: 0 });
          priceEl.insertBefore(col, priceEl.firstChild);
          tl.to(col, {
            width: DIGIT_WIDTH,
            duration: rollDuration,
            ease: 'expo.out',
            overwrite: true,
            data: { label: label + ' gains a digit' },
          }, pos);
        }
      } else if (diff < 0) {
        for (let i = 0; i < -diff; i++) {
          const col = cols[i];
          col.dataset.dropping = '1';
          tl.to(col, {
            width: 0,
            duration: rollDuration * 0.7,
            ease: 'expo.inOut',
            overwrite: true,
            data: { label: label + ' drops a digit' },
            onComplete: function () { col.remove(); },
          }, pos);
        }
      }

      const remaining = diff < 0
        ? cols.slice(-diff)
        : Array.prototype.slice.call(priceEl.children);
      const alignDigits = newDigits;
      const rollers = remaining.map(function (col) {
        return col.querySelector('.prc_digit_roller');
      });

      tl.to(rollers, {
        y: function (i) { return -parseInt(alignDigits[i], 10) + 'em'; },
        duration: rollDuration,
        ease: 'expo.out',
        stagger: { each: digitStagger, from: 'end' },
        force3D: true,
        overwrite: true,
        data: { label: label + ' rolls to the new value' },
      }, pos);
    }

    // A two-face masked roll for the /mo <-> /yr period label. Both faces
    // are written once at build time, so a toggle only ever tweens a y
    // offset - never a textContent write on animated markup.
    function buildSwap(el, textA, textB, startOnB) {
      el.innerHTML = '';
      const mask = document.createElement('span');
      mask.className = 'prc_swap';
      const a = document.createElement('span');
      a.className = 'prc_swap_face';
      a.textContent = textA;
      const b = document.createElement('span');
      b.className = 'prc_swap_face prc_swap_face_next';
      b.textContent = textB;
      mask.appendChild(a);
      mask.appendChild(b);
      el.appendChild(mask);
      const swap = { mask: mask, a: a, b: b };
      gsap.set(mask, { yPercent: startOnB ? -100 : 0 });
      setSwapAria(swap, startOnB);
      return swap;
    }

    function setSwapAria(swap, toB) {
      swap.a.setAttribute('aria-hidden', toB ? 'true' : 'false');
      swap.b.setAttribute('aria-hidden', toB ? 'false' : 'true');
    }

    function buildCard(cardEl) {
      const monthly = parseFloat(cardEl.dataset.anmMonthly || '0');
      const yearly = parseFloat(cardEl.dataset.anmYearly || '0');
      const popular = cardEl.hasAttribute('data-anm-popular');
      const priceEl = cardEl.querySelector('[data-anm-prc-price]');
      const periodEl = cardEl.querySelector('[data-anm-prc-period]');
      const currencyEl = cardEl.querySelector('[data-anm-prc-currency]');
      const srEl = cardEl.querySelector('[data-anm-prc-sr]');
      const nameEl = cardEl.querySelector('[data-anm-prc-name]');

      if (!priceEl || !periodEl) return null;

      priceEl.setAttribute('aria-hidden', 'true');
      periodEl.setAttribute('aria-hidden', 'true');
      if (currencyEl) currencyEl.textContent = currency;

      const startOnYearly = period === 'yearly';
      const periodSwap = buildSwap(periodEl, '/mo', '/yr', startOnYearly);

      setPriceValue(priceEl, startOnYearly ? yearly : monthly);

      const card = {
        el: cardEl,
        monthly: monthly,
        yearly: yearly,
        popular: popular,
        priceEl: priceEl,
        nameEl: nameEl,
        periodSwap: periodSwap,
        srEl: srEl,
      };
      updateSrPrice(card, startOnYearly);
      return card;
    }

    function updateSrPrice(card, toYearly) {
      if (!card.srEl) return;
      const value = toYearly ? card.yearly : card.monthly;
      card.srEl.textContent = currency + ' ' + value + ' per ' + (toYearly ? 'year' : 'month');
    }

    // --- 6. Animation routines ---

    function applyPeriod(newPeriod) {
      if (newPeriod === period) return null;
      if (activeTl) {
        activeTl.kill();
        activeTl = null;
        cards.forEach(function (card) { settlePrice(card.priceEl); });
      }
      const toYearly = newPeriod === 'yearly';
      period = newPeriod;
      toggleBtn.setAttribute('aria-checked', String(toYearly));

      cards.forEach(function (card) { updateSrPrice(card, toYearly); });

      if (reducedMotion) {
        const originSide = toYearly ? 'left' : 'right';
        gsap.set(knob, { transformOrigin: originSide + ' center', x: toYearly ? '100%' : '0%', scaleX: 1 });
        cards.forEach(function (card) {
          setPriceValue(card.priceEl, toYearly ? card.yearly : card.monthly);
          gsap.set(card.periodSwap.mask, { yPercent: toYearly ? -100 : 0 });
          setSwapAria(card.periodSwap, toYearly);
        });
        if (chip) {
          const chipOn = showChip && toYearly;
          gsap.set(chip, { scale: chipOn ? 1 : 0, autoAlpha: chipOn ? 1 : 0 });
        }
        return null;
      }

      const originSide = toYearly ? 'left' : 'right';
      gsap.set(knob, { transformOrigin: originSide + ' center' });

      const tl = gsap.timeline({
        defaults: { force3D: true },
        onComplete: function () { activeTl = null; },
      });
      activeTl = tl;

      tl.to(knob, {
        x: toYearly ? '100%' : '0%',
        duration: toggleDuration,
        ease: ease,
        data: { label: 'Toggle knob travels to the new position' },
      }, 0);
      tl.to(knob, {
        scaleX: KNOB_SMEAR_SCALE,
        duration: KNOB_STRETCH_DUR,
        ease: 'power2.out',
        data: { label: 'Toggle knob stretches along the travel axis' },
      }, 0);
      tl.to(knob, {
        scaleX: 1,
        duration: KNOB_SETTLE_DUR,
        ease: 'power2.inOut',
        data: { label: 'Toggle knob snaps back to shape' },
      }, KNOB_STRETCH_DUR);

      if (chip) {
        if (toYearly && showChip) {
          gsap.set(chip, { autoAlpha: 1 });
          tl.to(chip, {
            scale: 1,
            duration: CHIP_DUR,
            ease: 'back.out(1.7)',
            data: { label: 'Savings chip pops in' },
          }, 0.05);
        } else {
          tl.to(chip, {
            scale: 0,
            duration: CHIP_DUR * 0.8,
            ease: 'power3.out',
            data: { label: 'Savings chip shrinks out' },
            onComplete: function () { gsap.set(chip, { autoAlpha: 0 }); },
          }, 0);
        }
      }

      cards.forEach(function (card, i) {
        const label = 'Card ' + (i + 1) + ' price';
        addPriceRoll(tl, card.priceEl, toYearly ? card.yearly : card.monthly, 0, label);

        setSwapAria(card.periodSwap, toYearly);
        tl.to(card.periodSwap.mask, {
          yPercent: toYearly ? -100 : 0,
          duration: PERIOD_ROLL_DUR,
          ease: 'annnimate',
          data: { label: label + ' period label rolls' },
        }, 0.05);
      });

      return tl;
    }

    // --- 7. Event listeners ---

    cards = cardEls.map(buildCard).filter(Boolean);
    if (!cards.length) return null;

    function handleToggleClick() {
      applyPeriod(period === 'monthly' ? 'yearly' : 'monthly');
    }
    toggleBtn.addEventListener('click', handleToggleClick);

    const shimmerLoops = cards.map(function (card, i) { return startShimmerLoop(card.nameEl, i); }).filter(Boolean);

    // --- 8. Initial DOM state ---
    container.setAttribute('role', 'region');
    toggleBtn.setAttribute('role', 'switch');
    toggleBtn.setAttribute('aria-checked', String(period === 'yearly'));
    toggleBtn.setAttribute('aria-label', 'Billing period');

    const startOnYearly = period === 'yearly';
    gsap.set(knob, {
      transformOrigin: (startOnYearly ? 'left' : 'right') + ' center',
      x: startOnYearly ? '100%' : '0%',
      scaleX: 1,
    });
    if (chip) {
      if (chipInner) chipInner.textContent = savingsLabel;
      const chipOn = showChip && startOnYearly;
      gsap.set(chip, {
        transformOrigin: 'center center',
        yPercent: -50,
        scale: chipOn ? 1 : 0,
        autoAlpha: chipOn ? 1 : 0,
      });
    }

    // --- 9. Reduced motion ---
    gsap.matchMedia().add('(prefers-reduced-motion: reduce)', function () {
      reducedMotion = true;
      return function () { reducedMotion = false; };
    });

    // --- 10. Public API ---

    let resizeTimer = null;
    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        // Every measurement here is em/percentage relative - nothing to
        // remeasure, kept for symmetry with the debounced-resize rule.
      }, 150);
    }
    window.addEventListener('resize', handleResize);

    function handleVisibility() {
      if (document.hidden) gsap.globalTimeline.pause();
      else gsap.globalTimeline.resume();
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return {
      getPeriod: function () { return period; },
      setPeriod: function (p) { return applyPeriod(p === 'yearly' ? 'yearly' : 'monthly'); },
      // Timeline inspector demo (ADR-0011): one full toggle to the opposite
      // period, then back to the default. Returns the first switch's
      // timeline handle.
      demo: function () {
        const target = period === 'monthly' ? 'yearly' : 'monthly';
        const handle = applyPeriod(target);
        setTimeout(function () {
          if (period !== defaultPeriod) applyPeriod(defaultPeriod);
        }, (toggleDuration + rollDuration) * 1000 + 500);
        return handle;
      },
      kill: function () {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('visibilitychange', handleVisibility);
        toggleBtn.removeEventListener('click', handleToggleClick);
        shimmerLoops.forEach(function (t) { t.kill(); });
        if (activeTl) activeTl.kill();
      },
    };
  }

  function waitForGSAP(cb, attempts) {
    attempts = attempts || 0;
    if (typeof gsap !== 'undefined' && typeof CustomEase !== 'undefined') { cb(); return; }
    if (attempts < 100) setTimeout(function () { waitForGSAP(cb, attempts + 1); }, 50);
    else console.error('[Annnimate] gsap/CustomEase failed to load');
  }

  waitForGSAP(function () {
    gsap.registerPlugin(CustomEase);
    CustomEase.create('annnimate', 'M0,0 C0.3,0.9 0.1,1 1,1');
    CustomEase.create('annnimateInOut', 'M0,0 C0.7,0 0.16,1 1,1');
    const instances = [];
    document.querySelectorAll('[data-anm-pricing]').forEach(function (el) {
      const api = initPricing(el);
      if (api) instances.push(api);
    });
    window.Anm = window.Anm || {};
    window.Anm.Pricing = {
      refresh: function () {},
      setPeriod: function (p) { instances.forEach(function (i) { i.setPeriod(p); }); },
      demo: function () { return instances[0] ? instances[0].demo() : null; },
    };
  });
})();
