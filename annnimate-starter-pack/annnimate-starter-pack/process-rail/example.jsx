'use client';

import ProcessRail from './process-rail';
import './process-rail.css';

const STEPS = [
  {
    num: '01',
    title: 'Scan',
    text: 'Both feet are scanned in store, standing and mid-stride.',
    image: 'https://annnimate.b-cdn.net/preview-assets/vanta/product_shoe_01.jpg?width=800',
    alt: 'A running shoe in tan and cream',
  },
  {
    num: '02',
    title: 'Cut',
    text: 'A last is milled to the scan and the upper is cut around it.',
    image: 'https://annnimate.b-cdn.net/preview-assets/vanta/texture_fabric-macro_05.jpg?width=800',
    alt: 'Close-up of grey technical fabric',
  },
  {
    num: '03',
    title: 'Build',
    text: 'Sole, plate and upper are bonded by hand in Berlin.',
    image: 'https://annnimate.b-cdn.net/preview-assets/vanta/product_shoe_05.jpg?width=800',
    alt: 'A finished running shoe with a white sole',
  },
  {
    num: '04',
    title: 'Run',
    text: 'Delivered in twelve days, with a second fitting after fifty kilometres.',
    image: 'https://annnimate.b-cdn.net/preview-assets/vanta/action_runner_01.jpg?width=800',
    alt: 'A runner mid-stride on a red track',
  },
];

export default function ProcessRailDemo() {
  return (
    <ProcessRail
      steps={STEPS}
      scrub={0.6}
      beadSize={10}
      sticky
      stagger={0.08}
    />
  );
}
