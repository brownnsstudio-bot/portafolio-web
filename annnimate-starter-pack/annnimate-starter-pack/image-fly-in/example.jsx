'use client';

import ImageFlyIn from './image-fly-in';
import './image-fly-in.css';

/**
 * Demo for ImageFlyIn.
 *
 * The ambient depth loop plays immediately - no scroll runway needed for the
 * loop itself. In the "scroll-cover" preview the headline reveals on
 * scroll-enter; on a direct in-view mount it plays immediately.
 */
export default function ImageFlyInDemo() {
  return <ImageFlyIn />;
}
