import { useColorScheme } from 'react-native';

// Validated palette (dataviz skill reference palette). Categorical slots 1-3
// validate all-pairs in both light and dark modes.
const light = {
  bg: '#f9f9f7',
  surface: '#fcfcfb',
  card: '#ffffff',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  textMuted: '#898781',
  border: 'rgba(11,11,11,0.10)',
  gridline: '#e1e0d9',
  baseline: '#c3c2b7',
  // categorical
  protein: '#2a78d6', // slot 1 blue
  carbs: '#eb6834', // slot 2 orange
  fat: '#1baf7a', // slot 3 aqua
  calories: '#2a78d6', // sequential blue
  good: '#0ca30c',
  warning: '#fab219',
  critical: '#d03b3b',
};

const dark = {
  bg: '#0d0d0d',
  surface: '#1a1a19',
  card: '#232322',
  textPrimary: '#ffffff',
  textSecondary: '#c3c2b7',
  textMuted: '#898781',
  border: 'rgba(255,255,255,0.10)',
  gridline: '#2c2c2a',
  baseline: '#383835',
  protein: '#3987e5',
  carbs: '#d95926',
  fat: '#199e70',
  calories: '#3987e5',
  good: '#0ca30c',
  warning: '#fab219',
  critical: '#e66767',
};

export type ThemeColors = typeof light;

export function useTheme() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? dark : light;
  return { colors, dark: scheme === 'dark' };
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

export const typography = {
  hero: { fontSize: 40, fontWeight: '700' as const },
  title: { fontSize: 22, fontWeight: '700' as const },
  subtitle: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 13, fontWeight: '500' as const },
  tiny: { fontSize: 11, fontWeight: '500' as const },
};
