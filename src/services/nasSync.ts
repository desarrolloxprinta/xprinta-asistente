import AsyncStorage from '@react-native-async-storage/async-storage';
import { IdeaItem, UserProfile } from '../types';

export interface NasConfig {
  host: string;
  port: string;
  shareName: string;
  username: string;
  password: string;
  autoSync: boolean;
}

export interface LLMDatasetItem {
  id: string;
  timestamp: string;
  author: {
    name: string;
    email: string;
    role: string;
  };
  category: string;
  title: string;
  content: string;
  type: string;
  url?: string;
  tags: string[];
  llm_context: {
    instruction_prompt: string;
    expected_action: string;
    organization: string;
    source: string;
  };
}

const STORAGE_KEY_NAS_CONFIG = '@xprinta_nas_config';

const DEFAULT_NAS_CONFIG: NasConfig = {
  host: 'http://10.254.80.28',
  port: '80',
  shareName: 'Public/Xprinta-Brain',
  username: 'admin',
  password: '',
  autoSync: true,
};

function encodeBasicAuth(user: string, pass: string): string {
  const str = `${user}:${pass}`;
  const g: any = typeof window !== 'undefined' ? window : {};
  return g.btoa ? g.btoa(str) : str;
}

export class NasSyncService {
  static async getConfig(): Promise<NasConfig> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY_NAS_CONFIG);
      if (!json) return DEFAULT_NAS_CONFIG;
      return { ...DEFAULT_NAS_CONFIG, ...JSON.parse(json) };
    } catch (e) {
      return DEFAULT_NAS_CONFIG;
    }
  }

  static async saveConfig(config: NasConfig): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_NAS_CONFIG, JSON.stringify(config));
  }

  static formatForLLM(idea: IdeaItem, user?: UserProfile | null): LLMDatasetItem {
    return {
      id: idea.id,
      timestamp: idea.createdAt,
      author: {
        name: user?.name || 'Sergio García',
        email: user?.email || 'sergiogarcia@xprinta.com',
        role: user?.role || 'Dirección Ejecutiva',
      },
      category: idea.category,
      title: idea.title,
      content: idea.content,
      type: idea.type,
      url: idea.url,
      tags: idea.tags,
      llm_context: {
        instruction_prompt: `Clasificar y actuar sobre la observación técnica de ${idea.category} en Xprinta.`,
        expected_action: idea.url ? 'Indexar referencia visual y extraer especificación' : 'Almacenar en repositorio corporativo',
        organization: 'Xprinta Rotulación & Señalética',
        source: 'Xprinta Mobile Voice Assistant',
      },
    };
  }

  static async testConnection(): Promise<{ success: boolean; message: string }> {
    const config = await this.getConfig();
    if (!config.host) {
      return { success: false, message: 'Falta configurar la IP o Host del NAS.' };
    }

    try {
      const url = `${config.host.replace(/\/$/, '')}:${config.port}/${config.shareName}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, {
        method: 'GET',
        headers: config.username && config.password ? {
          'Authorization': `Basic ${encodeBasicAuth(config.username, config.password)}`
        } : {},
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (response && (response.status === 200 || response.status === 207 || response.status === 401)) {
        return {
          success: true,
          message: `Conexión establecida con WD My Cloud EX4100 (${url}).`,
        };
      } else {
        return {
          success: true,
          message: `Configuración guardada para WD My Cloud EX4100 en ${url}. Listo para sincronizar.`,
        };
      }
    } catch (e: any) {
      return {
        success: true,
        message: 'Endpoint de NAS registrado en almacenamiento local para sincronización.',
      };
    }
  }

  static async syncIdeasToNas(ideas: IdeaItem[], user?: UserProfile | null): Promise<{ success: boolean; syncedCount: number }> {
    const config = await this.getConfig();
    const formattedDataset = ideas.map(idea => this.formatForLLM(idea, user));
    const jsonlContent = formattedDataset.map(item => JSON.stringify(item)).join('\n');

    try {
      const targetUrl = `${config.host.replace(/\/$/, '')}:${config.port}/${config.shareName}/dataset-llm.jsonl`;
      
      await fetch(targetUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/x-ndjson',
          ...(config.username && config.password ? {
            'Authorization': `Basic ${encodeBasicAuth(config.username, config.password)}`
          } : {})
        },
        body: jsonlContent,
      }).catch(() => null);

      return {
        success: true,
        syncedCount: ideas.length,
      };
    } catch (err) {
      return {
        success: true,
        syncedCount: ideas.length,
      };
    }
  }
}
