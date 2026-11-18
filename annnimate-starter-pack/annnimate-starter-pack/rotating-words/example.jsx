'use client';

import RotatingWords from './rotating-words';
import './rotating-words.css';

const WORDS = [
  'Sprint', 'Hurdles', 'Long jump', 'High jump', 'Pole vault',
  'Relay', 'Steeplechase', 'Decathlon', 'Cross country', 'Marathon',
];

export default function RotatingWordsDemo() {
  return (
    <div className="rw_page">
      <div className="rw_cover"><p className="rw_hint">Scroll down</p></div>
      <div className="rw_track" data-anm-rw-track="">
        <section className="rw_stage">
          <RotatingWords
            words={WORDS}
            scrub
            spin={2.4}
            settle={0.15}
            step={18}
            hold={0}
            snap={false}
            snapDelay={0.1}
            start="top 75%"
            once={false}
            nav
            blur={8}
          />
        </section>
      </div>
    </div>
  );
}
