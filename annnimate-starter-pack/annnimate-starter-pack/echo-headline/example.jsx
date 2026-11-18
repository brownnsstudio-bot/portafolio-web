'use client';

import EchoHeadline from './echo-headline';
import './echo-headline.css';

export default function EchoHeadlineDemo() {
  return (
    <div className="eh_page">
      <div className="eh_cover"><p className="eh_hint">Scroll down</p></div>
      <EchoHeadline
        copies={8}
        depth={1}
        rotateX={20}
        rotateY={20}
        rotateZ={0}
        fade="opacity"
        trigger="scrub"
        scrub={0.5}
        hold={0.2}
        once={false}
      >
        Endurance
      </EchoHeadline>
      <div className="eh_cover" />
    </div>
  );
}
