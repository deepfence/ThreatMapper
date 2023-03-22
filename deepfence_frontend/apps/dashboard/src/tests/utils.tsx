import { render, RenderOptions } from '@testing-library/react';
import { rest } from 'msw';
import React, { FC, ReactElement } from 'react';

import { ThemeProvider, useThemeMode } from '@/theme/ThemeContext';

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
  const { mode, setMode, userSelectedMode } = useThemeMode();
  return (
    <ThemeProvider value={{ mode, setMode, userSelectedMode }}>{children}</ThemeProvider>
  );
};

const renderUI = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { renderUI };
