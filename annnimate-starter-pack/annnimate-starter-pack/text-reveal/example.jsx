import TextReveal from './text-reveal';
import './text-reveal.css';

export default function TextRevealDemo() {
  return (
    <TextReveal
      type="words"
      start="top 75%"
      stagger={0.1}
    >
      Every stride is a statement. Every finish line a new beginning. We build
      gear for athletes who refuse to settle for <strong>yesterday's pace</strong>.
      Push beyond limits. Outrun expectations. This is where
      <strong>champions are made</strong>.
    </TextReveal>
  );
}
