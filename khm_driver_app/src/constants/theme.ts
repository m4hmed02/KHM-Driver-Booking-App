/**
 * KHM App Color Theme
 * Light theme only — matches design.md color palette
 */

import { Platform } from 'react-native';

const khmGreen = '#3CB54A';
const khmGreenDark = '#2A8738';
const khmBlack = '#14171A';

export const Colors = {
  light: {
    text: khmBlack,
    background: '#FFFFFF',
    tint: khmGreen,
    icon: '#6C7580',
    tabIconDefault: '#6C7580',
    tabIconSelected: khmGreen,
    border: '#E4E7EA',
    card: '#FFFFFF',
    primary: khmGreen,
    primaryDark: khmGreenDark,
    secondaryText: '#6C7580',
    success: '#E8F7EA',
    amber: '#F0A93A',
    blue: '#3A7CF0',
    red: '#E0453C',
  },
  // Same as light — app is explicitly light-theme only, but kept for
  // compatibility with useColorScheme()/useTheme() hooks in the template
  dark: {
    text: khmBlack,
    background: '#FFFFFF',
    tint: khmGreen,
    icon: '#6C7580',
    tabIconDefault: '#6C7580',
    tabIconSelected: khmGreen,
    border: '#E4E7EA',
    card: '#FFFFFF',
    primary: khmGreen,
    primaryDark: khmGreenDark,
    secondaryText: '#6C7580',
    success: '#E8F7EA',
    amber: '#F0A93A',
    blue: '#3A7CF0',
    red: '#E0453C',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, -apple-system, sans-serif",
    serif: "Poppins, serif",
    rounded: "Poppins, sans-serif",
    mono: "monospace",
  },
});