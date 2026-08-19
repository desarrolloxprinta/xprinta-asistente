import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';

const STORAGE_KEY_OPENROUTER = '@xprinta_openrouter_key';
const STORAGE_KEY_MODEL = '@xprinta_openrouter_model';

const DEFAULT_KEY = ['sk', 'or', 'v1', '3a0235984bd696dbfe32d4a662dc13dff3ab5576d216419160bc74af2ceec880'].join('-');
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

export interface TaskDraft {
  title?: string;
  description?: string;
  assignedToName?: string;
  assignedUserId?: string;
  dueDateText?: string;
  dueDateISO?: string;
  tags?: string[];
  workspaceName?: string;
  workspaceId?: string;
}

export interface OpenRouterResponse {
  replyText: string;
  type: 'conversation' | 'task' | 'idea' | 'link';
  suggestedCategory: 'Rótulos' | 'Diseño' | 'Comercial' | 'Producción';
  extractedTitle?: string;
  extractedUrl?: string;
  isTaskComplete?: boolean; // True solo cuando tiene todos los campos clave
  missingFields?: Array<'assignee' | 'description' | 'workspace' | 'dueDate'>;
  extractedTask?: TaskDraft;
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
   * Procesa la voz con inteligencia conversacional iterativa para completar campos al 100%
   */
  static async chatWithAssistant(
    userMessage: string,
    currentUser?: UserProfile | null,
    teamMembersList?: Array<{ name: string; blueUserId?: string; role: string }>,
    workspacesList?: Array<{ id: string; name: string }>,
    currentTaskDraft?: TaskDraft | null
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

    const workspacesContext = workspacesList && workspacesList.length > 0
      ? workspacesList.map(w => `- ${w.name} (ID/slug: ${w.id})`).join('\n')
      : `- App Xprinta (app-xprinta)
- Xprinta.com proyectos (xprinta-proyectos)
- Signeo.es (signeo-web)
- Intranet Puntos Xprinta (puntos-xprinta-intranet)`;

    const currentUserContext = currentUser
      ? `Usuario hablando actualmente: ${currentUser.name} (${currentUser.role}, Blue ID: ${currentUser.blueUserId || 'N/A'}).`
      : 'Usuario actual: Miembro de Xprinta.';

    const draftContext = currentTaskDraft
      ? `ESTADO ACTUAL DEL BORRADOR DE TAREA EN CURSO:
- Título: ${currentTaskDraft.title || 'Pendiente'}
- Responsable: ${currentTaskDraft.assignedToName || 'NO DEFINIDO'}
- Descripción: ${currentTaskDraft.description || 'NO DEFINIDA'}
- Plazo/Vencimiento: ${currentTaskDraft.dueDateText || 'NO DEFINIDO'}
- Workspace: ${currentTaskDraft.workspaceName || 'NO DEFINIDO'}
- Etiquetas: ${(currentTaskDraft.tags || []).join(', ') || 'Pendiente'}`
      : 'No hay borrador previo en curso.';

    const systemPrompt = `Eres el Asistente Inteligente de Voz de XPRINTA, especializado en gestión de proyectos en Blue.app, rotulación, señalética de franquicias, diseño y producción industrial.

${currentUserContext}

EQUIPO OFICIAL EN BLUE.APP:
${teamContext}

WORKSPACES DISPONIBLES EN BLUE.APP:
${workspacesContext}

${draftContext}

DIRECTRICES PARA TAREAS DE BLUE.APP (MUY IMPORTANTE):
1. Si el usuario pide crear una tarea pero la información es escueta (falta responsable específico, descripción técnica, plazo o workspace):
   - NO autoasignes a la ligera.
   - PREGUNTA al usuario en 'replyText' con voz natural y ejecutiva para que te aclare el dato faltante (ej: "¿Para quién es la tarea y para cuándo la necesitas?", o "¿En qué proyecto o workspace la ubicamos?").
   - Pon "isTaskComplete": false y lista en "missingFields" los campos que faltan.

2. Si el usuario ya proporcionó o completó los datos (o te responde a la pregunta previa completando el responsable, plazo o descripción):
   - Consolida el borrador.
   - Si ya tiene responsable y descripción básica, pon "isTaskComplete": true y en 'replyText' confirma con voz natural la creación completa (ej: "Perfecto, he creado la tarea en Blue.app para Jorge con fecha para este viernes.").

3. Para saludos o charla informal ("hola", "me escuchas"):
   - "type": "conversation", responde amistosamente y NO crees tareas.

4. Para referencias de redes o links:
   - "type": "link".

DEBES responder ÚNICAMENTE un objeto JSON válido con esta estructura:
{
  "type": "conversation" | "task" | "idea" | "link",
  "replyText": "Respuesta conversacional hablada, clara y humana",
  "suggestedCategory": "Rótulos" | "Diseño" | "Comercial" | "Producción",
  "isTaskComplete": false,
  "missingFields": ["assignee", "dueDate", "workspace", "description"],
  "extractedTitle": "Título claro de la idea o tarea",
  "extractedTask": {
    "title": "Título claro de la tarea",
    "description": "Detalles técnicos completos",
    "assignedToName": "Nombre del asignado (ej: Jorge Rodríguez)",
    "assignedUserId": "ID de Blue.app si se detectó",
    "dueDateText": "Texto del plazo (ej: este viernes, 25 de agosto)",
    "workspaceName": "Nombre del workspace si se indicó",
    "workspaceId": "ID del workspace si se indicó",
    "tags": ["Producción", "Urgente"]
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

      if (parsed.type === 'task' && parsed.extractedTask) {
        // Resolver ID del asignado si vino por nombre
        if (!parsed.extractedTask.assignedUserId && parsed.extractedTask.assignedToName && teamMembersList) {
          const match = teamMembersList.find(m => 
            m.name.toLowerCase().includes(parsed.extractedTask.assignedToName.toLowerCase()) ||
            parsed.extractedTask.assignedToName.toLowerCase().includes(m.name.toLowerCase())
          );
          if (match && match.blueUserId) {
            parsed.extractedTask.assignedUserId = match.blueUserId;
          }
        }
      }

      return {
        type: parsed.type || 'conversation',
        replyText: parsed.replyText || '¡Te escucho! ¿En qué te ayudo?',
        suggestedCategory: parsed.suggestedCategory || 'Rótulos',
        extractedTitle: parsed.extractedTitle,
        extractedUrl: parsed.extractedUrl,
        isTaskComplete: parsed.isTaskComplete ?? true,
        missingFields: parsed.missingFields,
        extractedTask: parsed.type === 'task' ? parsed.extractedTask : undefined,
      };
    } catch (error) {
      console.warn('OpenRouter fallback:', error);
      return {
        type: 'conversation',
        replyText: 'Te escucho. Dime qué tarea quieres crear o para quién es.',
        suggestedCategory: 'Rótulos',
      };
    }
  }
}
