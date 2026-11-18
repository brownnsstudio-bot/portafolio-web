'use client';

import FeatureDialog from './feature-dialog';

/**
 * Demo for FeatureDialog
 *
 * This file provides example prop values for testing the React component.
 * Content matches the HTML demo file.
 */
export default function FeatureDialogDemo() {
  return (
    <FeatureDialog
      duration={0.7}
      ease="annnimate"
      label="Court issue, 01"
      title="Game leather"
      tileImage={{
        src: 'https://annnimate.b-cdn.net/preview-assets/vanta/product_ball_05.jpg',
        alt: 'Basketball floating in a shaft of light in a dark locker room',
      }}
      sheetTitle="Broken in by hand"
      sheetText="A game ball built to be played - full-grain leather with a deep pebble, worked in before it ships so the first grip feels like the hundredth."
      actionLabel="Explore the story"
      listItems={[
        'Full-grain pebble, tacked for grip',
        'Holds pressure through cold courts',
        'Indoor pace, outdoor wear',
      ]}
      mediaImages={[
        {
          src: 'https://annnimate.b-cdn.net/preview-assets/vanta/action_leap_01.jpg',
          alt: 'Athlete captured mid-leap against a dark studio ground',
        },
        {
          src: 'https://annnimate.b-cdn.net/preview-assets/vanta/roster_cap-silhouette_03.jpg',
          alt: 'Silhouetted athlete in a cap with a glowing brim on a green field',
        },
      ]}
      stats={[
        { num: '620 g', label: 'Regulation weight' },
        { num: '75.5 cm', label: 'Circumference, size 7' },
        { num: '0.6 bar', label: 'Playing pressure' },
      ]}
      sheetImage={{
        src: 'https://annnimate.b-cdn.net/preview-assets/vanta/hero_profile_03.jpg',
        alt: 'Silhouetted athlete profile against a deep orange field',
      }}
      outro="Built for the court you actually play on - the cracked one behind the gym, in January, with cold hands."
    />
  );
}
