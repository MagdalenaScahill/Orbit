'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

export interface ThemeColors {
  name: string;
  bg: string;
  panelBg: string;
  cardBg: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentMuted: string;
  inputBg: string;
  success: string;
  danger: string;
  nodeColors: Record<string, string>;
  flowBg: string;
  flowDot: string;
  nodeLabelShadow?: string;
}

export const themes: Record<string, ThemeColors> = {
  midnight: {
    name: '🌑 Midnight',
    bg: '#0f172a',
    panelBg: '#0f172a',
    cardBg: '#1e293b',
    border: '#1e293b',
    text: '#e2e8f0',
    textMuted: '#64748b',
    accent: '#6366f1',
    accentMuted: '#312e81',
    inputBg: '#1e293b',
    success: '#22c55e',
    danger: '#f87171',
    nodeColors: { person: '#818cf8', project: '#22d3ee', event: '#fbbf24', default: '#a78bfa' },
    flowBg: '#0f172a',
    flowDot: '#334155',
    nodeLabelShadow: '0 1px 4px rgba(0,0,0,0.8)',
  },
  aurora: {
    name: '🌌 Aurora',
    bg: '#0d1117',
    panelBg: '#161b22',
    cardBg: '#21262d',
    border: '#30363d',
    text: '#e6edf3',
    textMuted: '#8b949e',
    accent: '#58a6ff',
    accentMuted: '#1f3b5e',
    inputBg: '#21262d',
    success: '#3fb950',
    danger: '#f85149',
    nodeColors: { person: '#58a6ff', project: '#3fb950', event: '#d2a8ff', default: '#79c0ff' },
    flowBg: '#0d1117',
    flowDot: '#21262d',
    nodeLabelShadow: '0 1px 4px rgba(0,0,0,0.9)',
  },
  obsidian: {
    name: '⬛ Obsidian',
    bg: '#18181b',
    panelBg: '#1c1c1f',
    cardBg: '#27272a',
    border: '#3f3f46',
    text: '#fafafa',
    textMuted: '#71717a',
    accent: '#a78bfa',
    accentMuted: '#2e1065',
    inputBg: '#27272a',
    success: '#4ade80',
    danger: '#f87171',
    nodeColors: { person: '#a78bfa', project: '#34d399', event: '#fbbf24', default: '#c084fc' },
    flowBg: '#18181b',
    flowDot: '#3f3f46',
    nodeLabelShadow: '0 1px 4px rgba(0,0,0,0.9)',
  },
  forest: {
    name: '🌲 Forest',
    bg: '#0a1628',
    panelBg: '#0d1f2d',
    cardBg: '#112233',
    border: '#1a3344',
    text: '#d1fae5',
    textMuted: '#6b9e82',
    accent: '#34d399',
    accentMuted: '#064e3b',
    inputBg: '#112233',
    success: '#10b981',
    danger: '#f87171',
    nodeColors: { person: '#34d399', project: '#6ee7b7', event: '#fde68a', default: '#a7f3d0' },
    flowBg: '#0a1628',
    flowDot: '#1a3344',
    nodeLabelShadow: '0 1px 4px rgba(0,0,0,0.9)',
  },
  rose: {
    name: '🌸 Rose',
    bg: '#1a0a14',
    panelBg: '#1f0d1a',
    cardBg: '#2d1525',
    border: '#4a1f38',
    text: '#fce7f3',
    textMuted: '#9f6b8a',
    accent: '#f472b6',
    accentMuted: '#831843',
    inputBg: '#2d1525',
    success: '#86efac',
    danger: '#fca5a5',
    nodeColors: { person: '#f472b6', project: '#c084fc', event: '#fb923c', default: '#e879f9' },
    flowBg: '#1a0a14',
    flowDot: '#4a1f38',
    nodeLabelShadow: '0 1px 4px rgba(0,0,0,0.9)',
  },
  daylight: {
    name: '☀️ Daylight',
    bg: '#f8fafc',
    panelBg: '#ffffff',
    cardBg: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#64748b',
    accent: '#6366f1',
    accentMuted: '#e0e7ff',
    inputBg: '#f1f5f9',
    success: '#16a34a',
    danger: '#dc2626',
    nodeColors: { person: '#6366f1', project: '#0891b2', event: '#d97706', default: '#7c3aed' },
    flowBg: '#f8fafc',
    flowDot: '#cbd5e1',
    nodeLabelShadow: '0 1px 2px rgba(255,255,255,0.8)',
  },
};

interface ThemeContextType {
  theme: ThemeColors;
  themeName: string;
  setThemeName: (name: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: themes.midnight,
  themeName: 'midnight',
  setThemeName: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState('midnight');
  return (
    <ThemeContext.Provider value={{ theme: themes[themeName], themeName, setThemeName }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
