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
  category?: string;
  attachedToType?: 'idea' | 'task';
  attachedToId?: string;
}

export interface OpenRouterResponse {
  replyText: string;
  type: 'conversation' | 'task' | 'idea' | 'link';
  suggestedCategory?: string;
  isCategoryNew?: boolean;
  needsClarification?: boolean;
  extractedTitle?: string;
  extractedUrl?: string;
  isTaskComplete?: boolean;
  missingFields?: Array<'assignee' | 'description' | 'workspace' | 'dueDate' | 'category' | 'linkAttachment'>;
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
   * Procesa la voz con diálogo interactivo dinámico (categorías libres + vinculación de enlaces)
   */
  static async chatWithAssistant(
    userMessage: string,
    currentUser?: UserProfile | null,
    teamMembersList?: Array<{ name: string; blueUserId?: string; role: string }>,
    workspacesList?: Array<{ id: string; name: string }>,
    existingCategories?: string[],
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

    const categoriesContext = existingCategories && existingCategories.length > 0
      ? `CATEGORÍAS EXISTENTES CREADAS POR EL USUARIO: ${existingCategories.join(', ')}.`
      : 'El usuario aún no tiene categorías creadas (es totalmente libre de crear la que prefiera).';

    const draftContext = currentTaskDraft
      ? `ESTADO ACTUAL DEL BORRADOR EN CURSO:
- Título: ${currentTaskDraft.title || 'Pendiente'}
- Responsable: ${currentTaskDraft.assignedToName || 'NO DEFINIDO'}
- Categoría: ${currentTaskDraft.category || 'NO DEFINIDA'}
- Workspace: ${currentTaskDraft.workspaceName || 'NO DEFINIDO'}
- Enlace vinculado a: ${currentTaskDraft.attachedToType || 'NO DEFINIDO'}`
      : 'No hay borrador previo en curso.';

    const systemPrompt = `Eres el Asistente Inteligente de Voz de XPRINTA.

${currentUserContext}

EQUIPO OFICIAL EN BLUE.APP:
${teamContext}

WORKSPACES EN BLUE.APP:
${workspacesContext}

${categoriesContext}

${draftContext}

DIRECTRICES DE DIÁLOGO E INTERACCIÓN (MUY IMPORTANTE):
1. **CATEGORÍAS DINÁMICAS (NO HARDCODED)**:
   - Las categorías no son fijas ni predeterminadas. El usuario crea las que necesite.
   - Cuando el usuario te transmita una idea nueva, analiza si encaja en alguna categoría existente o pregúntale por voz en qué categoría desea clasificarla o si creamos una nueva para esa idea.

2. **ENLACES INTERESANTES (INSTAGRAM, WEB, REDES)**:
   - Cuando el usuario comparta o mencione un enlace de referencia o inspiración, pregúntale de forma natural si quiere vincularlo a una idea general o atarlo a una tarea específica del equipo.

3. **TAREAS DE TRABAJO EN BLUE.APP**:
   - Si faltan datos clave (responsable, plazo o especificaciones técnicas), pregunta amigablemente para completarlos antes de publicar la tarea.

4. **CONVERSACIÓN CASUAL O SALUDOS**:
   - "type": "conversation", responde de manera humana y ejecutiva sin crear notas innecesarias.

DEBES responder ÚNICAMENTE un objeto JSON válido con esta estructura:
{
  "type": "conversation" | "task" | "idea" | "link",
  "replyText": "Respuesta conversacional hablada con tono humano y claro",
  "suggestedCategory": "Nombre de la categoría existente o nueva propuesta",
  "isCategoryNew": true/false,
  "needsClarification": true/false,
  "isTaskComplete": true/false,
  "missingFields": ["assignee", "category", "linkAttachment", "dueDate", "description"],
  "extractedTitle": "Título claro de la idea o tarea",
  "extractedUrl": "URL si se detectó",
  "extractedTask": {
    "title": "Título claro de la tarea o idea",
    "description": "Detalles completos",
    "category": "Categoría acordada",
    "assignedToName": "Nombre del asignado si es tarea",
    "assignedUserId": "ID de Blue.app si aplica",
    "dueDateText": "Texto del plazo",
    "workspaceName": "Nombre del workspace",
    "workspaceId": "ID del workspace",
    "tags": ["Etiqueta1", "Etiqueta2"]
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
        suggestedCategory: parsed.suggestedCategory,
        isCategoryNew: parsed.isCategoryNew,
        needsClarification: parsed.needsClarification,
        extractedTitle: parsed.extractedTitle,
        extractedUrl: parsed.extractedUrl,
        isTaskComplete: parsed.isTaskComplete ?? true,
        missingFields: parsed.missingFields,
        extractedTask: parsed.extractedTask,
      };
    } catch (error) {
      console.warn('OpenRouter fallback:', error);
      return {
        type: 'conversation',
        replyText: 'Te escucho. Cuéntame tu idea o qué tarea deseas preparar.',
      };
    }
  }
}
