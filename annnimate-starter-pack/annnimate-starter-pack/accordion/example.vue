<script setup>
import Accordion from './accordion.vue'
import './accordion.css'

const accordionItems = [
  {
    title: 'What makes Kinetic Athletics gear different?',
    content:
      'We engineer high-performance athletic gear built for speed and durability. Every product uses advanced materials tested by professional athletes. Our carbon-plate running shoes deliver propulsion without stiffness. Compression gear uses graduated pressure zones for optimal blood flow and recovery.',
    defaultOpen: true,
    enableStagger: true,
  },
  {
    title: 'How do I find my size?',
    content:
      "Check our size guide for detailed measurements. For running shoes, we recommend going half a size up from your street shoe size. Compression gear should fit snug but not restrictive. If you're between sizes, choose the larger option for tops and the smaller for compression items.",
    enableStagger: true,
  },
  {
    title: 'What is your return policy?',
    content:
      '30-day return window for unworn items with original tags. Running shoes can be tested for up to 50 miles. Free return shipping within the US. Refunds processed within 5-7 business days after we receive your return. Final sale items and custom gear cannot be returned.',
    enableStagger: true,
  },
  {
    title: 'How long does shipping take?',
    content:
      "Standard shipping takes 3-5 business days. Express shipping delivers in 1-2 days. International orders typically arrive within 7-14 days depending on customs. You'll receive tracking information once your order ships. Free shipping on orders over $120.",
  },
  {
    title: 'Are your products sustainable?',
    content:
      'We use recycled materials in 60% of our product line. All packaging is 100% recyclable. By 2026, our entire supply chain will be carbon neutral. We partner with factories that meet strict environmental and labor standards. Every product has a sustainability score visible on its page.',
  },
  {
    title: 'Do you offer team or bulk discounts?',
    content:
      'Yes, we offer bulk pricing for teams and organizations. Orders of 10+ items receive 15% off. Orders of 25+ receive 20% off. Custom team branding available for orders over 50 items. Contact our team sales department for a quote and customization options.',
  },
  {
    title: 'How do I track my order?',
    content:
      "Check your email for tracking information sent after your order ships. Log into your account to view order status and tracking details. Track directly from the carrier's website using your tracking number. Contact support if you haven't received tracking after 2 business days.",
  },
  {
    title: 'What payment methods do you accept?',
    content:
      'We accept all major credit cards, PayPal, Apple Pay, and Google Pay. For team orders, we also accept purchase orders and wire transfers. All transactions are encrypted and secure. We do not store your payment information on our servers.',
  },
]
</script>

<template>
  <div class="accordion_demo_wrap">
    <h1 class="accordion_demo_title">Frequently Asked Questions</h1>

    <div class="accordion_demo_content">
      <Accordion
        :allow-multiple="false"
        :duration="0.8"
        ease="expo.inOut"
        icon-mode="both"
        :icon-rotation="-180"
      >
        <div
          v-for="(item, index) in accordionItems"
          :key="index"
          data-anm-accordion-item
          :data-anm-open="item.defaultOpen || false"
        >
          <button data-anm-accordion-trigger class="accordion_trigger">
            <span class="accordion_title">{{ item.title }}</span>
            <svg data-anm-accordion-icon class="accordion_icon" viewBox="0 0 16 16" fill="none">
              <path
                data-anm-accordion-icon-vertical
                d="M8 1V15"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
              <path
                d="M1 8H15"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
          <div
            data-anm-accordion-content
            class="accordion_content"
            :data-anm-accordion-stagger-text="item.enableStagger || undefined"
            data-anm-stagger-duration="0.6"
            data-anm-stagger-delay="0.15"
            data-anm-stagger-ease="expo.out"
            data-anm-stagger-y-percent="110"
            data-anm-stagger-start-delay="200"
          >
            <p class="accordion_text">{{ item.content }}</p>
          </div>
        </div>
      </Accordion>
    </div>
  </div>
</template>
