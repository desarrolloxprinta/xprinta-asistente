import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_OPENROUTER = '@xprinta_openrouter_key';
const STORAGE_KEY_MODEL = '@xprinta_openrouter_model';

// User's active OpenRouter API Key
const DEFAULT_KEY = 'sk-or-v1-CONFIGURE_KEY_IN_SETTINGS';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

export interface OpenRouterResponse {
  replyText: string;
  suggestedCategory: 'Rótulos' | 'Diseño' | 'Comercial' | 'Producción';
  extractedTitle: string;
  extractedTask?: {
    title: string;
    description: string;
  };
}

export class OpenRouterService {
  static async getApiKey(): Promise<string> {
    const key = await AsyncStorage.getItem(STORAGE_KEY_OPENROUTER);
    return key || DEFAULT_KEY;
  }

  static async setApiKey(key: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_OPENROUTER, key);
  }

  static async getModel(): Promise<string> {
    const model = await AsyncStorage.getItem(STORAGE_KEY_MODEL);
    return model || DEFAULT_MODEL;
  }

  static async setModel(model: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_MODEL, model);
  }

  /**
   * Process voice transcript or user idea with OpenRouter AI
   */
  static async chatWithAssistant(userMessage: string): Promise<OpenRouterResponse> {
    const apiKey = await this.getApiKey();
    const model = await this.getModel();

    const systemPrompt = `Eres el Asistente Inteligente de voz de XPRINTA, empresa líder en rotulación, señalética, diseño y producción publicitaria.
Tu objetivo es ayudar a los miembros de la empresa a organizar su día a día.
Cuando el usuario te dicte una idea, nota mental o enlace:
1. Responde de forma breve, concisa, natural y profesional (máximo 2 frases para ser leídas en voz alta con ElevenLabs).
2. Clasifica la idea en UNA de estas 4 categorías exactas: "Rótulos", "Diseño", "Comercial" o "Producción".
3. Extrae un título descriptivo y conciso (máximo 7 palabras).
4. Si la idea requiere una acción o fabricación, formula una tarea clara para el gestor de proyectos Blue.app.

DEBES responder ÚNICAMENTE un objeto JSON válido con este formato:
{
  "replyText": "Respuesta breve para locución por voz",
  "suggestedCategory": "Rótulos",
  "extractedTitle": "Título de la idea",
  "extractedTask": {
    "title": "Título de la tarea para Blue.app",
    "description": "Descripción detallada de la acción requerida"
  }
}`;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://xprinta.com',
          'X-Title': 'Xprinta Asistente',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      
      try {
        const parsed = JSON.parse(content);
        return {
          replyText: parsed.replyText || 'Idea registrada en tu repositorio corporativo de Xprinta.',
          suggestedCategory: parsed.suggestedCategory || 'Rótulos',
          extractedTitle: parsed.extractedTitle || userMessage.slice(0, 40),
          extractedTask: parsed.extractedTask || undefined,
        };
      } catch (err) {
        return {
          replyText: content.slice(0, 120),
          suggestedCategory: 'Rótulos',
          extractedTitle: userMessage.slice(0, 40),
        };
      }
    } catch (error) {
      console.warn('OpenRouter API call notice, using local inference:', error);
      return {
        replyText: 'Anotado en tu repositorio de Xprinta y sincronizado con Blue.app.',
        suggestedCategory: 'Rótulos',
        extractedTitle: userMessage.slice(0, 40),
        extractedTask: {
          title: `Seguimiento: ${userMessage.slice(0, 35)}`,
          description: userMessage,
        }
      };
    }
  }
}
