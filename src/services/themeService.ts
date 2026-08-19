import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, ThemeColors } from '../theme/tokens';

export type ThemePreference = 'light' | 'dark' | 'auto';

const STORAGE_KEY_THEME = '@xprinta_theme_preference';

export const ThemeService = {
  async getThemePreference(): Promise<ThemePreference> {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_THEME);
    return (saved as ThemePreference) || 'light'; // Light por defecto
  },

  async setThemePreference(pref: ThemePreference): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_THEME, pref);
  }
};
