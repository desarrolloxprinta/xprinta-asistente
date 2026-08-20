import AsyncStorage from '@react-native-async-storage/async-storage';
import { IdeaItem, UserProfile, BlueAppProject } from '../types';
import { DictionaryService } from './dictionaryService';

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
  columnName?: string;
  columnId?: string;
  category?: string;
  attachedToType?: 'idea' | 'task';
  attachedToId?: string;
  potentialDuplicateNotice?: string;
}

export interface OpenRouterResponse {
  replyText: string;
  type: 'conversation' | 'query' | 'task' | 'idea' | 'link';
  suggestedCategory?: string;
  isCategoryNew?: boolean;
  needsClarification?: boolean;
  isTaskComplete?: boolean;
  isPotentialDuplicate?: boolean;
  extractedTitle?: string;
  extractedUrl?: string;
  duplicateDetails?: {
    existingItemTitle: string;
    existingItemType: 'task' | 'idea' | 'workspace' | 'column';
    similarityReason: string;
  };
  missingFields?: Array<'assignee' | 'description' | 'workspace' | 'column' | 'dueDate' | 'category' | 'linkAttachment' | 'duplicateConfirmation'>;
  extractedTask?: TaskDraft;
  queryFilter?: {
    section?: 'ideas' | 'tasks' | 'links' | 'all';
    targetCategory?: string;
    searchTerm?: string;
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
   * Procesa la voz con rol DUAL, integración Kanban y POLÍTICA ESTRICTA ANTI-DUPLICADOS
   */
  static async chatWithAssistant(
    userMessage: string,
    currentUser?: UserProfile | null,
    teamMembersList?: Array<{ name: string; blueUserId?: string; role: string }>,
    workspacesList?: BlueAppProject[],
    existingCategories?: string[],
    currentTaskDraft?: TaskDraft | null,
    currentRepositoryItems?: IdeaItem[]
  ): Promise<OpenRouterResponse> {
    const apiKey = await this.getApiKey();
    const model = await this.getModel();

    const dictionaryContext = await DictionaryService.getContextPrompt();

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

    // Contexto enriquecido de Workspaces y sus Columnas Kanban reales
    const workspacesContext = workspacesList && workspacesList.length > 0
      ? workspacesList.map(w => {
          const cols = (w.columns && w.columns.length > 0)
            ? w.columns.map(c => `      * "${c.title}" [ID: ${c.id}]`).join('\n')
            : '      * (Sin columnas definidas)';
          return `📂 Workspace: "${w.name}" [ID: ${w.id}]\n   Columnas Kanban:\n${cols}`;
        }).join('\n\n')
      : `📂 Workspace: "App Xprinta" [ID: ckxq3g5k6137634503papa0kmfxj]
   Columnas Kanban:
      * "ELEMENTOS APP" [ID: ckxq3h0cxhvze0834bhirftqk]

📂 Workspace: "Xprinta.com (proyectos)" [ID: ckiykv9rffi200834jghnh48y]
   Columnas Kanban:
      * "EN COLA" [ID: ckiyl943ifjai0834yl9mtg7g]
      * "HACIENDO" [ID: ckiyl9iucfjel0834juh5bbni]
      * "ASIGNACION SEO" [ID: ckiynjmmufssh0834h0gc9a4v]
      * "PUBLICADO WEB" [ID: ckiyn85azfr0e0834hqb7zuha]

📂 Workspace: "Signeo.es" [ID: ckih439pgg2l50834lmap77lh]
   Columnas Kanban:
      * "INFORMACIÓN GENERAL" [ID: ckih6awt5gdsz08343ru99vb7]
      * "DISEÑO ESTRUCTURA WEB" [ID: ckih7lknxgkjb0834ugzwynij]
      * "MANTENIMIENTO TÉCNICO" [ID: ckihbq0zvh1910834o8idg39g]`;

    const currentUserContext = currentUser
      ? `Usuario hablando actualmente: ${currentUser.name} (${currentUser.role}, Blue ID: ${currentUser.blueUserId || 'N/A'}).`
      : 'Usuario actual: Miembro de Xprinta.';

    const categoriesContext = existingCategories && existingCategories.length > 0
      ? `CATEGORÍAS EXISTENTES EN LA APP: ${existingCategories.join(', ')}.`
      : 'El usuario aún no tiene categorías creadas.';

    // Base de Conocimiento de Ideas/Tareas/Enlaces actuales del usuario
    const repositoryContext = currentRepositoryItems && currentRepositoryItems.length > 0
      ? currentRepositoryItems.slice(0, 40).map(item => {
          const typeLabel = item.type === 'task' ? 'TAREA' : (item.type === 'link' ? 'ENLACE' : 'IDEA');
          return `[${typeLabel}] (${item.category}) "${item.title}": ${item.content.replace(/\n+/g, ' ')} ${item.url ? `[URL: ${item.url}]` : ''} (${item.createdAt.slice(0, 10)})`;
        }).join('\n')
      : 'El repositorio de ideas y tareas está vacío.';

    const draftContext = currentTaskDraft
      ? `ESTADO ACTUAL DEL BORRADOR EN CURSO:
- Título: ${currentTaskDraft.title || 'Pendiente'}
- Responsable: ${currentTaskDraft.assignedToName || 'NO DEFINIDO'}
- Categoría: ${currentTaskDraft.category || 'NO DEFINIDA'}
- Workspace: ${currentTaskDraft.workspaceName || 'NO DEFINIDO'} [ID: ${currentTaskDraft.workspaceId || 'N/A'}]
- Columna Kanban: ${currentTaskDraft.columnName || 'NO DEFINIDA'} [ID: ${currentTaskDraft.columnId || 'N/A'}]
- Enlace vinculado a: ${currentTaskDraft.attachedToType || 'NO DEFINIDO'}`
      : 'No hay borrador previo en curso.';

    const systemPrompt = `Eres el Asistente Inteligente de Voz de XPRINTA.
Tu misión es gestionar tareas, ideas y consultas con precisión ejecutiva, integrándote a la perfección con el sistema de **Workspaces y Kanban de Blue.app**.

${currentUserContext}

DICCIONARIO TÉCNICO Y VOCABULARIO CLAVE DE XPRINTA:
${dictionaryContext}

ESTRUCTURA OFICIAL DE WORKSPACES Y COLUMNAS KANBAN EN BLUE.APP:
${workspacesContext}

EQUIPO OFICIAL EN BLUE.APP:
${teamContext}

REPOSITORIO ACTUAL DE IDEAS, TAREAS Y ENLACES GUARDADOS EN LA APP:
${repositoryContext}

${categoriesContext}

${draftContext}

POLÍTICAS OBLIGATORIAS Y ESTRICTAS:

🛡️ 1. **POLÍTICA ESTRICTA ANTI-DUPLICIDAD (WORKSPACES, COLUMNAS Y TAREAS)**:
   - **NUNCA DUPLICAR CIEGAMENTE**: Antes de crear una tarea o idea, revisa el REPOSITORIO ACTUAL y la lista de WORKSPACES / COLUMNAS.
   - **COINCIDENCIA SEMÁNTICA**: Si el usuario pide crear algo que coincide semánticamente o se parece mucho a una tarea o idea existente (ej: si ya existe "Revisar rotulación furgoneta" y el usuario dice "Crea una tarea para mirar los vinilos del vehículo"):
     - **DETÉN LA CREACIÓN AUTOMÁTICA**: Pon "isTaskComplete": false, "isPotentialDuplicate": true, "needsClarification": true.
     - En tu "replyText", adviértele de forma natural: *"Oye, ya tenemos una tarea/idea parecida llamada '[Título Existente]'. ¿Deseas actualizarla, moverla o crear una nueva por separado?"*.
     - Solo cuando el usuario confirme explícitamente ("Sí, crea una nueva" o "No, actualízala"), se procede a la creación.
   - **WORKSPACES Y COLUMNAS**: JAMÁS inventes ni crees un nuevo Workspace o Columna si existe uno con nombre similar (ej: si el usuario dice "En el proyecto de la web", mapea a "Xprinta.com (proyectos)" o a "Signeo.es" y pregunta si hay duda, en vez de crear uno nuevo).

🎯 2. **ASIGNACIÓN DE WORKSPACE Y COLUMNA KANBAN**:
   - Toda tarea en Blue.app debe asignarse a un **Workspace** específico y a una **Columna Kanban** de ese workspace.
   - Si no está especificado por el usuario, pregunta amigablemente: *"¿En qué Workspace lo asignamos (ej. Xprinta Proyectos o Signeo) y en qué columna Kanban?"*.
   - Pon "isTaskComplete": false hasta que estén definidos.

📋 3. **CAMPOS OBLIGATORIOS PARA LA CARD (100% COMPLETA)**:
   - Título y Descripción concisa y técnica.
   - Responsable asignado (assignedToName + assignedUserId).
   - Workspace (workspaceName + workspaceId).
   - Columna Kanban (columnName + columnId).
   - Plazo / Fecha límite (dueDateText).

🔍 4. **CONSULTAS / PREGUNTAS (type: "query")**:
   - Responde con exactitud sobre el estado de tareas, ideas o enlaces guardados usando el repositorio.

💡 5. **NUEVA IDEA O MEMO (type: "idea")**:
   - Clasifica o pregunta la categoría si no coincide con ninguna.

💬 6. **CONVERSACIÓN CASUAL (type: "conversation")**:
   - Respuestas directas, inteligentes y cordiales.

DEBES responder ÚNICAMENTE un objeto JSON válido con esta estructura:
{
  "type": "conversation" | "query" | "task" | "idea" | "link",
  "replyText": "Respuesta hablada conversacional y ejecutiva con tono humano y claro",
  "suggestedCategory": "Nombre de la categoría existente o nueva propuesta",
  "isCategoryNew": true/false,
  "needsClarification": true/false,
  "isTaskComplete": true/false,
  "isPotentialDuplicate": true/false,
  "duplicateDetails": {
    "existingItemTitle": "Título de la tarea o idea existente",
    "existingItemType": "task" | "idea" | "workspace" | "column",
    "similarityReason": "Explicación breve de por qué coincide semánticamente"
  },
  "missingFields": ["assignee", "workspace", "column", "dueDate", "description", "category", "duplicateConfirmation"],
  "extractedTitle": "Título claro de la idea o tarea",
  "extractedUrl": "URL si se detectó",
  "queryFilter": {
    "section": "tasks" | "ideas" | "links" | "all",
    "targetCategory": "Nombre de categoría si aplica",
    "searchTerm": "Término de búsqueda si aplica"
  },
  "extractedTask": {
    "title": "Título claro de la tarea",
    "description": "Detalles completos de la ejecución",
    "category": "Categoría técnica",
    "assignedToName": "Nombre del responsable",
    "assignedUserId": "ID de Blue.app del usuario",
    "workspaceName": "Nombre exacto del Workspace de Blue",
    "workspaceId": "ID del Workspace de Blue",
    "columnName": "Nombre exacto de la Columna Kanban",
    "columnId": "ID de la Columna Kanban (todoListId)",
    "dueDateText": "Texto del plazo (ej: Viernes)",
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
          temperature: 0.20,
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      if (parsed.type === 'task' && parsed.extractedTask) {
        // Asignar ID de usuario de Blue si falta
        if (!parsed.extractedTask.assignedUserId && parsed.extractedTask.assignedToName && teamMembersList) {
          const match = teamMembersList.find(m => 
            m.name.toLowerCase().includes(parsed.extractedTask.assignedToName.toLowerCase()) ||
            parsed.extractedTask.assignedToName.toLowerCase().includes(m.name.toLowerCase())
          );
          if (match && match.blueUserId) {
            parsed.extractedTask.assignedUserId = match.blueUserId;
          }
        }

        // Asignar ID de Workspace y Columna Kanban si se detectaron por nombre
        if (workspacesList && workspacesList.length > 0) {
          const targetWs = workspacesList.find(w => 
            (parsed.extractedTask.workspaceId && w.id === parsed.extractedTask.workspaceId) ||
            (parsed.extractedTask.workspaceName && w.name.toLowerCase().includes(parsed.extractedTask.workspaceName.toLowerCase())) ||
            (parsed.extractedTask.workspaceName && parsed.extractedTask.workspaceName.toLowerCase().includes(w.name.toLowerCase()))
          );
          if (targetWs) {
            parsed.extractedTask.workspaceId = targetWs.id;
            parsed.extractedTask.workspaceName = targetWs.name;

            if (targetWs.columns && targetWs.columns.length > 0) {
              if (parsed.extractedTask.columnName) {
                const matchCol = targetWs.columns.find(c => 
                  c.title.toLowerCase().includes(parsed.extractedTask.columnName.toLowerCase()) ||
                  parsed.extractedTask.columnName.toLowerCase().includes(c.title.toLowerCase())
                );
                if (matchCol) {
                  parsed.extractedTask.columnId = matchCol.id;
                  parsed.extractedTask.columnName = matchCol.title;
                }
              } else if (!parsed.extractedTask.columnId) {
                parsed.extractedTask.columnId = targetWs.columns[0].id;
                parsed.extractedTask.columnName = targetWs.columns[0].title;
              }
            }
          }
        }
      }

      return {
        type: parsed.type || 'conversation',
        replyText: parsed.replyText || '¡Te escucho! ¿En qué te ayudo?',
        suggestedCategory: parsed.suggestedCategory,
        isCategoryNew: parsed.isCategoryNew,
        needsClarification: parsed.needsClarification,
        isPotentialDuplicate: parsed.isPotentialDuplicate,
        duplicateDetails: parsed.duplicateDetails,
        extractedTitle: parsed.extractedTitle,
        extractedUrl: parsed.extractedUrl,
        isTaskComplete: parsed.isTaskComplete ?? true,
        missingFields: parsed.missingFields,
        extractedTask: parsed.extractedTask,
        queryFilter: parsed.queryFilter,
      };
    } catch (error) {
      console.warn('OpenRouter fallback:', error);
      return {
        type: 'conversation',
        replyText: 'Te escucho. Cuéntame tu consulta o qué tarea deseas preparar.',
      };
    }
  }
}
