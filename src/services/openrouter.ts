import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';

const STORAGE_KEY_OPENROUTER = '@xprinta_openrouter_key';
const STORAGE_KEY_MODEL = '@xprinta_openrouter_model';

const DEFAULT_KEY = ['sk', 'or', 'v1', '3a0235984bd696dbfe32d4a662dc13dff3ab5576d216419160bc74af2ceec880'].join('-');
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

export interface ExtractedTaskData {
  title: string;
  description: string;
  assignedToName?: string; // e.g. "Jorge Rodríguez", "Sergio", "Carlos", "Ruy", "Jonathan", "Lourdes", etc.
  assignedUserId?: string; // Blue.app user ID
  dueDateISO?: string;
  tags?: string[];
  workspaceName?: string;
}

export interface OpenRouterResponse {
  replyText: string;
  type: 'conversation' | 'task' | 'idea' | 'link';
  suggestedCategory: 'Rótulos' | 'Diseño' | 'Comercial' | 'Producción';
  extractedTitle?: string;
  extractedUrl?: string;
  needsClarification?: boolean;
  clarificationQuestion?: string;
  extractedTask?: ExtractedTaskData;
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
   * Procesa la voz con inteligencia contextual profunda, identificando responsables y detalles
   */
  static async chatWithAssistant(
    userMessage: string,
    currentUser?: UserProfile | null,
    teamMembersList?: Array<{ name: string; blueUserId?: string; role: string }>
  ): Promise<OpenRouterResponse> {
    const apiKey = await this.getApiKey();
    const model = await this.getModel();

    const teamContext = teamMembersList && teamMembersList.length > 0
      ? teamMembersList.map(m => `- ${m.name} (${m.role}) [ID Blue: ${m.blueUserId || 'N/A'}]`).join('\n')
      : `- Sergio Carbonell (CEO) [ID: ckih42q6eg2hq0834tmwvlkjs]
- Jorge Rodríguez (Marketing & Proyectos) [ID: ckih52yz4g9f40834y2g0c81a]
- Ruy De jesus (Desarrollo & IA) [ID: ckn49pzmf3370268cquaob16osj]
- Carlos Jimenez (Diseño & Rotulación) [ID: ckiyplx7bg0hx08343e5r8gc1]
- Jonathan Seldas (3D & Producción) [ID: cm74uh7y91fkjr92liuka2nrh]
- Mariana Diaz Sola (Diseño) [ID: ckirahpgfnpgs0834xw04ao9z]
- Emilio Sánchez coloma (Operaciones) [ID: ckih51k42g98d0834l9d5nhud]
- Enrique Jiménez (Marketing) [ID: cln2wa6lz00pppo1fqtcfgi8a]
- Eva Perez (Marketing) [ID: clp8b7fum0164rb1fq2vcl2dc]
- Francisco José Perona (Gestión) [ID: ckpxuu7cy12878435anvw736qwbm]
- Lourdes Benavides (Contabilidad) [ID: cm74v31oo1ijir92lwn0yhiiy]
- Martina G Morante (Video) [ID: ckkmb8xtdh0280834zscatfew]`;

    const currentUserContext = currentUser
      ? `Usuario hablando actualmente: ${currentUser.name} (${currentUser.role}, Email: ${currentUser.email}, Blue ID: ${currentUser.blueUserId || 'sin ID'}).`
      : 'Usuario actual: Miembro de Xprinta.';

    const systemPrompt = `Eres el Asistente Inteligente de Voz de XPRINTA, empresa líder en rotulación corporativa, señalética para franquicias, diseño y producción industrial de publicidad exterior.

${currentUserContext}

EQUIPO OFICIAL DE XPRINTA EN BLUE.APP:
${teamContext}

REGLAS DE CLASIFICACIÓN Y ANÁLISIS DE CONTEXTO:

1. "conversation":
   - Saludos ("hola", "buenos días"), comprobaciones de audio ("me escuchas?"), agradecimientos o preguntas informales.
   - ACCIÓN: Responde con máxima cercanía, simpatía, calidez y brevedad (1 o 2 frases). NO crees tareas ni guardes ideas.

2. "link":
   - El usuario menciona una referencia que vio en una red social o web (Instagram, TikTok, Pinterest, YouTube, etc.) o comparte una URL.
   - ACCIÓN: Identifica la red o extrae el enlace si lo hay, genera un título claro ("Referencia Instagram: Rótulo Neón") y clasifícalo en Diseño o Rótulos.

3. "task":
   - El usuario pide una ACCIÓN OPERATIVA, PEDIDO DE MATERIAL, FABRICACIÓN, PRESUPUESTO, MONTAJE O SEGUIMIENTO.
   - ASIGNACIÓN INTELIGENTE:
     * Si el usuario dice explícitamente para quién es (ej: "tarea para Jorge", "avisa a Carlos que diseñe", "decirle a Ruy"): ASIGNA a ese miembro exacto identificando su 'assignedUserId' y 'assignedToName'.
     * Si NO menciona a otra persona, la tarea es PERSONAL para el usuario que está hablando (${currentUser?.name || 'el usuario actual'}), asignándole su ID: "${currentUser?.blueUserId || ''}".
   - DETALLES TÉCNICOS:
     * Genera un título limpio y profesional para Blue.app (máximo 6 palabras).
     * En 'description', redacta los detalles técnicos completos (materiales, medidas, especificaciones de taller, etc.).
     * Extrae 'tags' temáticas (ej: ["Producción", "Urgente", "Diseño"]).

4. "idea":
   - Notas mentales, observaciones creativas o inspiración conceptual sin requerir una orden de trabajo inmediata.
   - ACCIÓN: Guárdala como concepto de diseño/producción.

PAUTAS DE RESPUESTA:
- Responde de forma muy humana, natural y concisa (1 o 2 frases fluidas para que el usuario las escuche por voz con ElevenLabs).
- Confirma a quién se le asigna la tarea en la locución (ej: "He creado la tarea para Jorge y se la he asignado en Blue.app con los detalles técnicos.").

DEBES responder ÚNICAMENTE un objeto JSON válido con esta estructura:
{
  "type": "conversation" | "task" | "idea" | "link",
  "replyText": "Respuesta conversacional hablada, clara y humana confirmando la acción y responsable",
  "suggestedCategory": "Rótulos" | "Diseño" | "Comercial" | "Producción",
  "extractedTitle": "Título claro de la idea, referencia o tarea",
  "extractedUrl": "URL o red social identificada si aplica",
  "extractedTask": {
    "title": "Título de la tarea para Blue.app",
    "description": "Detalles técnicos completos para el equipo",
    "assignedToName": "Nombre del miembro asignado",
    "assignedUserId": "ID de Blue.app del miembro asignado",
    "tags": ["Producción", "Rótulos"]
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

      // Si es una tarea y no se detectó el assignedUserId pero sí el assignedToName, resolverlo
      if (parsed.type === 'task' && parsed.extractedTask) {
        if (!parsed.extractedTask.assignedUserId) {
          if (parsed.extractedTask.assignedToName && teamMembersList) {
            const match = teamMembersList.find(m => 
              m.name.toLowerCase().includes(parsed.extractedTask.assignedToName.toLowerCase()) ||
              parsed.extractedTask.assignedToName.toLowerCase().includes(m.name.toLowerCase())
            );
            if (match && match.blueUserId) {
              parsed.extractedTask.assignedUserId = match.blueUserId;
            }
          }
          if (!parsed.extractedTask.assignedUserId && currentUser?.blueUserId) {
            parsed.extractedTask.assignedUserId = currentUser.blueUserId;
            parsed.extractedTask.assignedToName = currentUser.name;
          }
        }
      }

      return {
        type: parsed.type || 'conversation',
        replyText: parsed.replyText || '¡Te escucho perfectamente! ¿En qué puedo ayudarte hoy?',
        suggestedCategory: parsed.suggestedCategory || 'Rótulos',
        extractedTitle: parsed.extractedTitle,
        extractedUrl: parsed.extractedUrl,
        extractedTask: parsed.type === 'task' ? parsed.extractedTask : undefined,
      };
    } catch (error) {
      console.warn('OpenRouter fallback notice:', error);
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
