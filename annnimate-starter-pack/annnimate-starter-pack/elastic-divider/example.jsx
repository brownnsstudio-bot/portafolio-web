'use client';

import ElasticDivider from './elastic-divider';
import './elastic-divider.css';

/**
 * Demo for ElasticDivider
 *
 * Mirrors elastic-divider.html: a section label and one line of copy sit
 * just above the string, inside the demo stage.
 */
export default function ElasticDividerDemo() {
  return (
    <section className="eldv_stage">
      <div className="eldv_container">
        <div className="eldv_block">
          <span className="eldv_label">01 Approach</span>
          <p className="eldv_text">Every frame is strung by hand.</p>
        </div>
        <ElasticDivider />
      </div>
    </section>
  );
}
