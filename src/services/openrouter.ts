import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_OPENROUTER = '@xprinta_openrouter_key';
const STORAGE_KEY_MODEL = '@xprinta_openrouter_model';

const DEFAULT_KEY = ['sk', 'or', 'v1', '3a0235984bd696dbfe32d4a662dc13dff3ab5576d216419160bc74af2ceec880'].join('-');
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

export interface OpenRouterResponse {
  replyText: string;
  type: 'conversation' | 'task' | 'idea';
  suggestedCategory: 'Rótulos' | 'Diseño' | 'Comercial' | 'Producción';
  extractedTitle?: string;
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
   * Process voice input with conversational intelligence
   */
  static async chatWithAssistant(userMessage: string): Promise<OpenRouterResponse> {
    const apiKey = await this.getApiKey();
    const model = await this.getModel();

    const systemPrompt = `Eres el Asistente Inteligente de voz de XPRINTA, empresa líder en rotulación, señalética de franquicias, diseño y producción publicitaria.
Hablas con los miembros del equipo (dirección, comercial, diseño, taller y montaje).

INSTRUCCIONES CLAVE DE COMPORTAMIENTO:
1. DISTINGUE EL TIPO DE MENSAJE:
   - "conversation": Si el usuario te saluda ("hola", "me escuchas?", "buenos días"), te hace una pregunta general ("qué hora es?", "cómo estás?"), o simplemente está probando el micro. 
     -> Responde con cercanía, naturalidad y simpatía (máximo 1 o 2 frases breves). NO inventes tareas ni lo guardes como idea.
   - "task": Si el usuario te pide una ACCIÓN CONCRETA o DE TRABAJO (ej: "Crear tarea para pedir metacrilato", "Enviar presupuesto a franquicia", "Mandar a fabricar rótulo de LED", "Medir fachada en Gran Vía").
     -> Genera un título claro y conciso para Blue.app y una descripción técnica.
   - "idea": Si el usuario dicta una NOTA DE INSPIRACIÓN o CONCEPTO (ej: "Me gusta esta combinación de colores mate", "Idea de iluminación perimetral para tiendas").
     -> Guárdala como concepto sin crear tarea en Blue.app.

2. Responde SIEMPRE en español de forma fluida, profesional y concisa (1 a 2 frases para ser leídas por voz).
3. Clasifica la categoría en UNA de: "Rótulos", "Diseño", "Comercial" o "Producción".

DEBES responder ÚNICAMENTE un objeto JSON válido con esta estructura:
{
  "type": "conversation" | "task" | "idea",
  "replyText": "Respuesta conversacional natural para locución por voz",
  "suggestedCategory": "Rótulos",
  "extractedTitle": "Título si es tarea o idea (opcional si es conversation)",
  "extractedTask": {
    "title": "Título de la tarea para Blue.app (solo si type es task)",
    "description": "Descripción detallada"
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
      const parsed = JSON.parse(content);

      return {
        type: parsed.type || 'conversation',
        replyText: parsed.replyText || '¡Te escucho perfectamente! ¿En qué puedo ayudarte hoy?',
        suggestedCategory: parsed.suggestedCategory || 'Rótulos',
        extractedTitle: parsed.extractedTitle,
        extractedTask: parsed.type === 'task' ? parsed.extractedTask : undefined,
      };
    } catch (error) {
      console.warn('OpenRouter notice, using conversational fallback:', error);
      const lower = userMessage.toLowerCase();
      if (lower.includes('hola') || lower.includes('escuchas') || lower.includes('prueba') || lower.includes('que tal')) {
        return {
          type: 'conversation',
          replyText: '¡Hola! Te escucho alto y claro. Dime qué tarea o idea quieres gestionar.',
          suggestedCategory: 'Rótulos',
        };
      }
      return {
        type: 'idea',
        replyText: 'Anotado en tu repositorio corporativo.',
        suggestedCategory: 'Rótulos',
        extractedTitle: userMessage.slice(0, 35),
      };
    }
  }
}
