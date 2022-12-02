import { render, RenderOptions } from '@testing-library/react';
import React, { FC, ReactElement } from 'react';

import { ThemeProvider, useThemeMode } from '@/theme/ThemeContext';

const AllTheProviders: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toggleMode } = useThemeMode(true);
  return <ThemeProvider value={{ toggleMode }}>{children}</ThemeProvider>;
};

const renderUI = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { renderUI };
