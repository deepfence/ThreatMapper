import { render, RenderOptions } from '@testing-library/react';
import { rest } from 'msw';
import React, { FC, ReactElement } from 'react';

import theme from '../theme/default';
import { ThemeProvider, useThemeMode } from '../theme/ThemeContext';

export const handlers = [
  rest.get('*/api', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        name: 'test',
      }),
    );
  }),
];

const AllTheProviders: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toggleMode } = useThemeMode(true);
  return <ThemeProvider value={{ theme, toggleMode }}>{children}</ThemeProvider>;
};

const renderUI = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { renderUI };
