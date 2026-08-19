export const colors = {
  primary: '#F18108',
  primaryHover: '#D97307',
  primarySubtle: '#FFF5EB',
  primaryGlow: 'rgba(241, 129, 8, 0.45)',
  ink: '#0A0A0A',
  paper: '#F4F4F5',

  n100: '#FAFAFA',
  n200: '#F4F4F5',
  n300: '#E4E4E7',
  n400: '#A1A1AA',
  n500: '#71717A',
  n600: '#52525B',
  n700: '#3F3F46',
  n800: '#27272A',
  n900: '#18181B',

  white: '#FFFFFF',
  black: '#000000',
  success: '#10B981',
  successSubtle: '#ECFDF5',
  warning: '#F59E0B',
  warningSubtle: '#FEF3C7',
  error: '#EF4444',
  errorSubtle: '#FEE2E2',
  info: '#3B82F6',
  infoSubtle: '#EFF6FF',
};

export interface ThemeColors {
  isDark: boolean;
  bgApp: string;
  bgSurface: string;
  bgCard: string;
  bgInput: string;
  borderSubtle: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primarySubtle: string;
  sheetBg: string;
  badgeBg: string;
  tabActiveBg: string;
  chipBg: string;
  chipBorder: string;
  statusBubbleBg: string;
  
  // 2027 Futuristic Glassmorphism Tokens
  glassPillBg: string;
  glassPillBorder: string;
  glassFabBg: string;
  glassFabBorder: string;
  glassSheetBg: string;
  glassSheetBorder: string;
  glassCardBg: string;
  glassCardBorder: string;
}

export const lightTheme: ThemeColors = {
  isDark: false,
  bgApp: '#F4F5F8',
  bgSurface: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgInput: '#EDF0F3',
  borderSubtle: '#E2E6EA',
  borderStrong: '#CBD2D9',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  primary: '#F18108',
  primarySubtle: '#FFF4E6',
  sheetBg: 'rgba(255, 255, 255, 0.94)',
  badgeBg: '#FFF4E6',
  tabActiveBg: '#F18108',
  chipBg: '#EDF0F3',
  chipBorder: '#E2E6EA',
  statusBubbleBg: 'rgba(255, 255, 255, 0.88)',

  // Glassmorphism Light
  glassPillBg: 'rgba(255, 255, 255, 0.82)',
  glassPillBorder: 'rgba(255, 255, 255, 0.95)',
  glassFabBg: '#F18108',
  glassFabBorder: 'rgba(255, 255, 255, 0.65)',
  glassSheetBg: 'rgba(255, 255, 255, 0.96)',
  glassSheetBorder: 'rgba(255, 255, 255, 0.9)',
  glassCardBg: 'rgba(255, 255, 255, 0.85)',
  glassCardBorder: 'rgba(255, 255, 255, 0.95)',
};

export const darkTheme: ThemeColors = {
  isDark: true,
  bgApp: '#060608',
  bgSurface: '#121216',
  bgCard: '#15151A',
  bgInput: '#1A1A22',
  borderSubtle: '#22222C',
  borderStrong: '#2E2E3C',
  textPrimary: '#F8F9FA',
  textSecondary: '#A0A5B5',
  textMuted: '#6B7280',
  primary: '#F18108',
  primarySubtle: 'rgba(241, 129, 8, 0.16)',
  sheetBg: 'rgba(16, 16, 20, 0.94)',
  badgeBg: '#1C1C24',
  tabActiveBg: '#F18108',
  chipBg: '#181820',
  chipBorder: '#282834',
  statusBubbleBg: 'rgba(18, 18, 24, 0.85)',

  // Glassmorphism Dark
  glassPillBg: 'rgba(24, 24, 30, 0.75)',
  glassPillBorder: 'rgba(255, 255, 255, 0.12)',
  glassFabBg: '#F18108',
  glassFabBorder: 'rgba(255, 255, 255, 0.35)',
  glassSheetBg: 'rgba(14, 14, 18, 0.95)',
  glassSheetBorder: 'rgba(255, 255, 255, 0.08)',
  glassCardBg: 'rgba(22, 22, 28, 0.75)',
  glassCardBorder: 'rgba(255, 255, 255, 0.08)',
};

export const typography = {
  fontSans: {
    light: 'Inter_300Light',
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  fontSerif: {
    regular: 'Merriweather_400Regular',
    italic: 'Merriweather_400Regular_Italic',
    bold: 'Merriweather_700Bold',
  },
  sizes: {
    eyebrow: 14,
    caption: 14.5,
    bodySm: 16,
    body: 18,
    lead: 20.5,
    h3: 23,
    h2: 29,
    h1: 38,
    display: 48,
  },
  letterSpacing: {
    tighter: -0.8,
    tight: -0.4,
    normal: 0,
    wide: 0.8,
    eyebrow: 2.0,
  }
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  pill: 9999,
};
