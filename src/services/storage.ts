import AsyncStorage from '@react-native-async-storage/async-storage';
import { IdeaItem, UserProfile } from '../types';

const STORAGE_KEYS = {
  IDEAS: '@xprinta_ideas_v1',
  USER: '@xprinta_user_v1',
  CONFIG: '@xprinta_config_v1',
};

export const StorageService = {
  async getIdeas(): Promise<IdeaItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.IDEAS);
      if (!data) {
        const initialIdeas: IdeaItem[] = [
          {
            id: '1',
            title: 'Rótulo Corpóreo Retroiluminado LED',
            content: 'Investigar perfilería de aluminio lacado en negro mate con iluminación cálida 3000K para franquicia Xprinta.',
            category: 'Rótulos',
            type: 'observation',
            tags: ['LED', 'Corpóreo', 'Xprinta'],
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            title: 'Tendencia en Vinilos de Corte Ácido',
            content: 'Inspiración de escaparate visto en tienda de diseño con degradado impreso sobre vinilo glaseado.',
            category: 'Diseño',
            type: 'link',
            url: 'https://instagram.com/p/xprinta_sample',
            tags: ['Vinilos', 'Escaparates'],
            createdAt: new Date().toISOString(),
          }
        ];
        await AsyncStorage.setItem(STORAGE_KEYS.IDEAS, JSON.stringify(initialIdeas));
        return initialIdeas;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading ideas', e);
      return [];
    }
  },

  async saveIdea(idea: IdeaItem): Promise<IdeaItem[]> {
    const list = await this.getIdeas();
    const updated = [idea, ...list.filter(i => i.id !== idea.id)];
    await AsyncStorage.setItem(STORAGE_KEYS.IDEAS, JSON.stringify(updated));
    return updated;
  },

  async deleteIdea(id: string): Promise<IdeaItem[]> {
    const list = await this.getIdeas();
    const updated = list.filter(i => i.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.IDEAS, JSON.stringify(updated));
    return updated;
  },

  async getUser(): Promise<UserProfile | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    if (!data) {
      const defaultUser: UserProfile = {
        id: 'usr_xp_01',
        name: 'Equipo Xprinta',
        email: 'asistente@xprinta.com',
        role: 'project_manager',
        avatar: '',
      };
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(defaultUser));
      return defaultUser;
    }
    return JSON.parse(data);
  },

  async saveUser(user: UserProfile): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }
};
