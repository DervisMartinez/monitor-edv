import React, { createContext, useState, useContext, ReactNode } from 'react';
import { DarkTheme, LightTheme, AppThemeColors } from '@/constants/colors';

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: AppThemeColors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>('light');

  const toggleTheme = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDark = mode === 'dark';
  const colors: AppThemeColors = isDark ? DarkTheme : LightTheme;

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
