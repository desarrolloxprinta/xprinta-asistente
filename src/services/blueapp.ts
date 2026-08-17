import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlueAppProject, BlueAppTask } from '../types';

const BLUE_APP_KEY = '@xprinta_blue_app_key';
const BLUE_API_URL = 'https://app.blue.cc/api/v1';

export const BlueAppService = {
  async getApiKey(): Promise<string> {
    const key = await AsyncStorage.getItem(BLUE_APP_KEY);
    return key || '';
  },

  async saveApiKey(key: string): Promise<void> {
    await AsyncStorage.setItem(BLUE_APP_KEY, key);
  },

  async getProjects(): Promise<BlueAppProject[]> {
    const key = await this.getApiKey();
    if (!key) {
      return [
        { id: 'proj_01', name: 'Xprinta — Rótulos Franquicias', color: '#F18108', companyName: 'Xprinta Central' },
        { id: 'proj_02', name: 'Impresión Gran Formato Lonas', color: '#3B82F6', companyName: 'Cliente Retail' },
        { id: 'proj_03', name: 'Señalética Corporativa Oficinas', color: '#10B981', companyName: 'Sede Madrid' },
      ];
    }

    try {
      const res = await fetch(BLUE_API_URL + '/projects', {
        headers: { 'Authorization': 'Bearer ' + key }
      });
      return await res.json();
    } catch (e) {
      console.error('Error fetching Blue.app projects', e);
      return [];
    }
  },

  async createTask(task: { title: string; description?: string; projectId: string; listId?: string }): Promise<boolean> {
    const key = await this.getApiKey();
    if (!key) {
      console.log('Blue.app API key no configurada. Tarea simulada:', task);
      return true;
    }

    try {
      const res = await fetch(BLUE_API_URL + '/projects/' + task.projectId + '/tasks', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(task)
      });
      return res.ok;
    } catch (e) {
      console.error('Error creando tarea en Blue.app', e);
      return false;
    }
  }
};
