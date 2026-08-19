import AsyncStorage from '@react-native-async-storage/async-storage';
import { IdeaItem, UserProfile } from '../types';

const STORAGE_KEYS = {
  USER: '@xprinta_user_v1',
  CONFIG: '@xprinta_config_v1',
  LEGACY_IDEAS: '@xprinta_ideas_v1',
  IDEAS_PREFIX: '@xprinta_ideas_user_',
};

export const StorageService = {
  /**
   * Obtiene las ideas y tareas guardadas específicamente por el usuario autenticado
   */
  async getIdeas(userId?: string): Promise<IdeaItem[]> {
    const userKey = `${STORAGE_KEYS.IDEAS_PREFIX}${userId || 'global'}`;
    try {
      const data = await AsyncStorage.getItem(userKey);
      if (data) {
        return JSON.parse(data);
      }

      // Si es el perfil de Sergio (xp_usr_01) y su repositorio nuevo está vacío, migrar historial legacy
      if (userId === 'xp_usr_01') {
        const legacyData = await AsyncStorage.getItem(STORAGE_KEYS.LEGACY_IDEAS);
        if (legacyData) {
          const parsed = JSON.parse(legacyData);
          await AsyncStorage.setItem(userKey, JSON.stringify(parsed));
          return parsed;
        }
      }

      return [];
    } catch (e) {
      console.error('Error reading user ideas', e);
      return [];
    }
  },

  /**
   * Guarda una idea o tarea en el repositorio privado del usuario
   */
  async saveIdea(idea: IdeaItem, userId?: string): Promise<IdeaItem[]> {
    const userKey = `${STORAGE_KEYS.IDEAS_PREFIX}${userId || 'global'}`;
    const list = await this.getIdeas(userId);
    const updated = [idea, ...list.filter(i => i.id !== idea.id)];
    await AsyncStorage.setItem(userKey, JSON.stringify(updated));
    return updated;
  },

  /**
   * Elimina una idea del repositorio privado del usuario
   */
  async deleteIdea(id: string, userId?: string): Promise<IdeaItem[]> {
    const userKey = `${STORAGE_KEYS.IDEAS_PREFIX}${userId || 'global'}`;
    const list = await this.getIdeas(userId);
    const updated = list.filter(i => i.id !== id);
    await AsyncStorage.setItem(userKey, JSON.stringify(updated));
    return updated;
  },

  async getUser(): Promise<UserProfile | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    if (!data) return null;
    return JSON.parse(data);
  },

  async saveUser(user: UserProfile): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }
};
