import '../src/index.css'; // import tailwind styles

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  themes: {
    clearable: false,
    list: [
      {
        name: 'Light',
        class: [],
        color: '#F9FAFB', // gray-50
        default: true,
      },
      {
        name: 'Dark',
        class: ['dark'],
        color: '#111928', // gray-900
      },
    ],
  },
  backgrounds: {
    default: 'Light',
    values: [
      {
        name: 'Light',
        value: '#F9FAFB', // gray-50
      },
      {
        name: 'Dark',
        value: '#111928', // gray-900
      },
    ],
  },
};
