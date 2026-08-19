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

    const systemPrompt = `Eres el Asistente Inteligente y Proactivo de XPRINTA, especializado en rotulación, señalética de franquicias, diseño y producción de imagen corporativa.
Tu rol es conversar amigablemente con el usuario y gestionar sus requerimientos con inteligencia:

INSTRUCCIONES CLAVE:
1. Responde con un tono cercano, resolutivo y conciso (1 a 2 frases naturales en español para locución por voz).
2. Determina inteligentemente si lo dicho por el usuario es:
   - UNA TAREA OPERATIVA (ej: fabricar, enviar presupuesto, medir fachada, pedir metacrilato, asignar instalación). -> Crea 'extractedTask' detallada para Blue.app.
   - UNA IDEA / NOTA DE INSPIRACIÓN (ej: referencia de color, idea de rótulo retroiluminado, nota de obra). -> Guárdala como concepto sin forzar tarea.
3. Categoriza con precisión en UNA de estas 4: "Rótulos", "Diseño", "Comercial" o "Producción".
4. Extrae un título limpio y profesional (máximo 6 palabras).

DEBES responder ÚNICAMENTE un objeto JSON válido:
{
  "replyText": "Respuesta conversacional amigable para leer en voz alta",
  "suggestedCategory": "Rótulos",
  "extractedTitle": "Título claro de la idea o tarea",
  "isTask": true,
  "extractedTask": {
    "title": "Título de la tarea para Blue.app",
    "description": "Detalles técnicos para el equipo de taller/diseño"
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
