'use client';

import MagneticTagCloud from './magnetic-tag-cloud';
import './magnetic-tag-cloud.css';

/**
 * Demo for MagneticTagCloud
 *
 * Self-contained component - all tag markup lives inside MagneticTagCloud
 * itself (Pattern 1), driven by the default `tags` prop (the ten VANTA sport
 * tags from the HTML demo). This demo just mounts it.
 */
export default function MagneticTagCloudDemo() {
  return <MagneticTagCloud />;
}
