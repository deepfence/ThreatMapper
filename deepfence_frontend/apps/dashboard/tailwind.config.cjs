/* eslint-disable @typescript-eslint/no-var-requires */

const { preset } = require('tailwind-preset');

module.exports = {
  presets: [preset],
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui-components/src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      animation: {
        'text-gradient': 'text-gradient 4s ease infinite',
      },
      keyframes: {
        'text-gradient': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
