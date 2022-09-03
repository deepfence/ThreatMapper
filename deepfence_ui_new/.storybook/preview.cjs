import { themes } from '@storybook/theming';
import '../src/index.css'; // import tailwind styles

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  darkMode: {
    darkClass: 'dark',
    classTarget: 'html',
    stylePreview: true,
    dark: { ...themes.dark, appContentBg: '#111928' },
    light: { ...themes.normal, appContentBg: '#F9FAFB' },
  },
};
