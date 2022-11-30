/* eslint-disable @typescript-eslint/no-var-requires */
/** @type {import('tailwindcss').Config} */

const tailwindRadix = require('tailwindcss-radix');
const plugin = require('tailwindcss/plugin');
const preset = require('tailwind-preset');

module.exports = {
  presets: [preset],
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        // tooltip
        'slide-up-fade': {
          '0%': { opacity: 0, transform: 'translateY(2px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-right-fade': {
          '0%': { opacity: 0, transform: 'translateX(-2px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
        'slide-down-fade': {
          '0%': { opacity: 0, transform: 'translateY(-2px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-left-fade': {
          '0%': { opacity: 0, transform: 'translateX(2px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
        // dropdown menu & select
        'scale-in': {
          '0%': { opacity: 0, transform: 'scale(0)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        'slide-down': {
          '0%': { opacity: 0, transform: 'translateY(-10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-right-in': {
          '100%': { right: 0 },
        },
        'slide-right-out': {
          '0%': { right: 0 },
        },
        'opacity-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'opacity-out': {
          '100%': { opacity: 0.5 },
          '0%': { opacity: 0 },
        },
        'slide-opacity-out': {
          '0%': { opacity: 1 },
          '50%': { opacity: 0.7 },
          '20%': { opacity: 0.5 },
          '70%': { opacity: 0.2 },
          '100%': { opacity: 0 },
        },
        'pop-in': {
          '0%': { opacity: 0, transform: 'scale(.96)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        'pop-out': {
          '100%': { opacity: 1, transform: 'scale(1)' },
          '0%': { opacity: 0, transform: 'scale(0.96)' },
        },
        'accordion-slide-down': {
          from: {
            height: 0,
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-slide-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: 0,
          },
        },
      },
      animation: {
        // tooltip
        'slide-up-fade': 'slide-up-fade 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-right-fade': 'slide-right-fade 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down-fade': 'slide-down-fade 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-left-fade': 'slide-left-fade 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        // dropdown menu & select
        'scale-in': 'scale-in 0.2s ease-in-out',
        'slide-down': 'slide-down 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        // modal
        'pop-in': 'pop-in 0.5s ease',
        'pop-out': 'pop-out 0.5s ease',
        'slide-right-in': 'slide-right-in 0.5s forwards',
        'slide-right-out': 'slide-right-out 0.5s forwards',
        'slide-opacity-out': 'slide-opacity-out 0.3s ease',
        'opacity-out': 'opacity-out 0.5s ease',
        'opacity-in': 'opacity-in 0.5s ease',
        'accordion-open': 'accordion-slide-down 100ms cubic-bezier(0.16, 1, 0.3, 1)',
        'accordion-closed': 'accordion-slide-up 100ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [
    tailwindRadix(),
    plugin(({ addVariant }) => {
      addVariant('data-active-item', '&[data-active-item]');
      addVariant('data-focus-visible', '&[data-focus-visible]');
    }),
  ],
};
