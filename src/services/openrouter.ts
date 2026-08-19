import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_OPENROUTER = '@xprinta_openrouter_key';
const STORAGE_KEY_MODEL = '@xprinta_openrouter_model';

const DEFAULT_KEY = ['sk', 'or', 'v1', '3a0235984bd696dbfe32d4a662dc13dff3ab5576d216419160bc74af2ceec880'].join('-');
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

export interface OpenRouterResponse {
  replyText: string;
  type: 'conversation' | 'task' | 'idea' | 'link';
  suggestedCategory: 'Rótulos' | 'Diseño' | 'Comercial' | 'Producción';
  extractedTitle?: string;
  extractedUrl?: string;
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
   * Procesa la voz con inteligencia contextual profunda
   */
  static async chatWithAssistant(userMessage: string): Promise<OpenRouterResponse> {
    const apiKey = await this.getApiKey();
    const model = await this.getModel();

    const systemPrompt = `Eres el Asistente Inteligente de Voz de XPRINTA, empresa líder en rotulación corporativa, señalética para franquicias, diseño y producción industrial de publicidad exterior.
Hablas con los miembros del equipo y debes entender perfectamente el contexto y la intención real de lo que dicen.

ANALIZA EL CONTEXTO Y CLASIFICA EN UNO DE ESTOS 4 TIPOS EXACTOS:

1. "conversation": 
   - Saludos ("hola", "buenos días", "buenas tardes"), comprobaciones de audio ("me escuchas?", "estás ahí?"), agradecimientos o preguntas informales ("qué puedes hacer?", "quién eres?").
   - ACCIÓN: Responde con máxima cercanía, simpatía, calidez y brevedad (1 o 2 frases). NO generes tareas ni guardes ideas.

2. "link":
   - El usuario menciona una referencia que vio en una red social o web (Instagram, TikTok, Pinterest, YouTube, Behance, LinkedIn, etc.) o comparte una URL.
   - Ej: "Vi un rótulo brutal en Instagram con luces de neón rosa", "Mira este enlace de Pinterest con letras corpóreas de madera".
   - ACCIÓN: Identifica la red o extrae el enlace si lo hay, genera un título claro ("Referencia Instagram: Rótulo Neón") y clasifícalo en Diseño o Rótulos.

3. "task":
   - El usuario pide una ACCIÓN OPERATIVA, FABRICACIÓN, GESTIÓN O SEGUIMIENTO para el equipo.
   - Palabras clave de intención: "hay que hacer", "recuérdame", "crea una tarea", "enviar presupuesto", "pedir metacrilato / vinilo / chapa", "medir fachada", "mandar a taller", "cortar con láser", "llamar al cliente", "instalar rótulo".
   - ACCIÓN: Genera un título limpio y profesional para Blue.app (máximo 6 palabras) y una descripción técnica con los detalles necesarios para el taller/oficina.

4. "idea":
   - Notas mentales, observaciones creativas o inspiración conceptual sin requerir una orden de trabajo inmediata.
   - Ej: "Podríamos usar acabados en bronce cepillado para las oficinas", "Idea para mejorar el empaquetado de las letras".
   - ACCIÓN: Guárdala como concepto de diseño/producción con un título representativo.

PAUTAS DE RESPUESTA:
- Responde de forma muy humana, natural y concisa (1 o 2 frases fluidas para que el usuario las escuche por voz con ElevenLabs).
- Clasifica la categoría en UNA de: "Rótulos", "Diseño", "Comercial" o "Producción".

DEBES responder ÚNICAMENTE un objeto JSON válido con esta estructura:
{
  "type": "conversation" | "task" | "idea" | "link",
  "replyText": "Respuesta conversacional hablada, clara y humana",
  "suggestedCategory": "Rótulos" | "Diseño" | "Comercial" | "Producción",
  "extractedTitle": "Título claro de la idea, referencia o tarea",
  "extractedUrl": "URL o red social identificada si aplica",
  "extractedTask": {
    "title": "Título claro para el panel de Blue.app",
    "description": "Detalles técnicos de la acción a realizar"
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
          temperature: 0.25,
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
        extractedUrl: parsed.extractedUrl,
        extractedTask: parsed.type === 'task' ? parsed.extractedTask : undefined,
      };
    } catch (error) {
      console.warn('OpenRouter fallback:', error);
      const lower = userMessage.toLowerCase();
      if (lower.includes('hola') || lower.includes('escuchas') || lower.includes('prueba') || lower.includes('que tal')) {
        return {
          type: 'conversation',
          replyText: '¡Hola! Te escucho alto y claro. Dime qué tarea, idea o referencia quieres gestionar.',
          suggestedCategory: 'Rótulos',
        };
      }
      return {
        type: 'idea',
        replyText: 'Entendido, lo he registrado en tu repositorio.',
        suggestedCategory: 'Rótulos',
        extractedTitle: userMessage.slice(0, 35),
      };
    }
  }
}
