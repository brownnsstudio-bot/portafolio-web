'use client';

import { useRef } from 'react';
import FloatingNavbar from './floating-navbar';
import './floating-navbar.css';

export default function FloatingNavbarDemo() {
  const bodyRef = useRef(null);

  return (
    <div className="fnb_page">
      <FloatingNavbar
        threshold={80}
        duration={0.42}
        ease="annnimate"
        mode="toggle"
        offset={12}
        mark="K"
        hideStartRef={bodyRef}
      />

      <section className="fnb_hero">
        <img
          className="fnb_hero_img"
          src="https://annnimate.b-cdn.net/preview-assets/vanta/hero_run_01.jpg?width=2400&format=auto"
          alt="Runner mid-stride in a shaft of light"
          decoding="async"
        />
        <div className="fnb_hero_scrim" aria-hidden="true" />
        <h1 className="fnb_hero_title">Run the long way</h1>
      </section>

      <section ref={bodyRef} className="fnb_body" data-anm-fnb-hide-start>
        <p className="fnb_text">Built for the early miles and the last ones. Every pair is tested on the same loop, in every weather.</p>

        <figure className="fnb_media fnb_media_wide">
          <img
            className="fnb_media_img"
            src="https://annnimate.b-cdn.net/preview-assets/vanta/environment_track_02.jpg?width=1600&format=auto"
            alt="Lane lines curving across a red running track"
            decoding="async"
          />
        </figure>

        <figure className="fnb_media fnb_media_tall">
          <img
            className="fnb_media_img"
            src="https://annnimate.b-cdn.net/preview-assets/vanta/product_shoe_04.jpg?width=1200&format=auto"
            alt="Running shoe with a coral midsole floating on grey"
            decoding="async"
          />
        </figure>
      </section>
    </div>
  );
}
