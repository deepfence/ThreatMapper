import { render, RenderOptions } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import React, { FC, ReactElement } from 'react';

import { ThemeProvider, useThemeMode } from '@/theme/ThemeContext';

export const handlers = [
  http.get('*/api', () => {
    return HttpResponse.json({
      name: 'test',
    });
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
