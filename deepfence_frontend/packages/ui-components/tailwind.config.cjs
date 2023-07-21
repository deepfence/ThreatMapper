/* eslint-disable @typescript-eslint/no-var-requires */

const { preset } = require('tailwind-preset');

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
        'slide-left-in': {
          '100%': { left: 0 },
        },
        'slide-left-out': {
          '0%': { left: 0 },
        },
        'opacity-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'opacity-out': {
          '0%': { opacity: 1 },
          '100%': { opacity: 0 },
        },
        'modal-slide-in': {
          '0%': { opacity: 1, transform: 'translateY(-24px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
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
        'slide-down': 'slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        // modal
        'pop-in': 'pop-in 250ms ease',
        'pop-out': 'pop-out 250ms ease',
        'slide-right-in': 'slide-right-in 250ms forwards cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-right-out': 'slide-right-out 250ms forwards cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-left-in': 'slide-left-in 250ms forwards cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-left-out': 'slide-left-out 250ms forwards cubic-bezier(0.16, 1, 0.3, 1)',
        'opacity-out': 'opacity-out 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        'opacity-in': 'opacity-in 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        'modal-slide-in': 'modal-slide-in 300ms cubic-bezier(0.5, 1, 0.5, 1)',
        'accordion-open': 'accordion-slide-down 100ms cubic-bezier(0.16, 1, 0.3, 1)',
        'accordion-closed': 'accordion-slide-up 100ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
};
