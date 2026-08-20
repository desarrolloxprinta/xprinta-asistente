import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlueAppProject, BlueAppColumn } from '../types';
import fallbackKanbanCache from './blue_kanban_cache.json';

const STORAGE_KEY_BLUE_TOKEN_ID = '@xprinta_blue_token_id';
const STORAGE_KEY_BLUE_SECRET = '@xprinta_blue_secret';
const STORAGE_KEY_BLUE_ORG_ID = '@xprinta_blue_org_id';
const STORAGE_KEY_ACTIVE_PROJECT = '@xprinta_blue_active_project';
const STORAGE_KEY_WORKSPACES_CACHE = '@xprinta_blue_workspaces_cache_v2';

const DEFAULT_TOKEN_ID = 'a237c6fed4f04b9a9fe07e1620efbfb9';
const DEFAULT_SECRET = 'pat_d7332db64cd84d1a9834deb093149623';
const DEFAULT_ORG_ID = 'xprinta';
const DEFAULT_PROJECT_SLUG = 'ckxq3g5k6137634503papa0kmfxj'; // App Xprinta

export interface CreateTaskParams {
  title: string;
  description?: string;
  projectId?: string;
  columnId?: string; // ID de la columna Kanban (todoListId)
  assigneeIds?: string[];
  tags?: Array<{ title: string; color?: string }>;
  duedAt?: string; // ISO 8601 string
}

export class BlueAppService {
  static async getTokenId(): Promise<string> {
    const id = await AsyncStorage.getItem(STORAGE_KEY_BLUE_TOKEN_ID);
    return id || DEFAULT_TOKEN_ID;
  }

  static async getSecret(): Promise<string> {
    const secret = await AsyncStorage.getItem(STORAGE_KEY_BLUE_SECRET);
    return secret || DEFAULT_SECRET;
  }

  static async getOrgId(): Promise<string> {
    const org = await AsyncStorage.getItem(STORAGE_KEY_BLUE_ORG_ID);
    return org || DEFAULT_ORG_ID;
  }

  static async getActiveProject(): Promise<string> {
    const proj = await AsyncStorage.getItem(STORAGE_KEY_ACTIVE_PROJECT);
    return proj || DEFAULT_PROJECT_SLUG;
  }

  static async setActiveProject(projectIdOrSlug: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_PROJECT, projectIdOrSlug);
  }

  static async saveCredentials(tokenId: string, secret: string, orgId: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_BLUE_TOKEN_ID, tokenId);
    await AsyncStorage.setItem(STORAGE_KEY_BLUE_SECRET, secret);
    await AsyncStorage.setItem(STORAGE_KEY_BLUE_ORG_ID, orgId);
  }

  /**
   * Fetch all active workspaces and their Kanban columns from Blue.app GraphQL in real time
   */
  static async fetchProjects(): Promise<BlueAppProject[]> {
    const tokenId = await this.getTokenId();
    const secret = await this.getSecret();
    const orgId = await this.getOrgId();

    const queryWorkspaces = `
      query GetWorkspaces($companyId: String!) {
        workspaceList(filter: { companyIds: [$companyId] }) {
          items {
            id
            name
            slug
          }
        }
      }
    `;

    const queryLists = `
      query GetLists($projectId: String!) {
        todoLists(projectId: $projectId) {
          id
          title
          position
        }
      }
    `;

    try {
      const res = await fetch('https://api.blue.app/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'blue-token-id': tokenId,
          'blue-token-secret': secret,
          'blue-org-id': orgId,
        },
        body: JSON.stringify({
          query: queryWorkspaces,
          variables: { companyId: 'ckih42wh5g2io0834nie8uh0d' }
        })
      });

      if (!res.ok) {
        throw new Error(`Blue.app HTTP ${res.status}`);
      }

      const data = await res.json();
      const wsItems = data?.data?.workspaceList?.items || [];
      
      const loadedProjects: BlueAppProject[] = [];

      for (const ws of wsItems) {
        let columns: BlueAppColumn[] = [];
        try {
          const resCols = await fetch('https://api.blue.app/graphql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'blue-token-id': tokenId,
              'blue-token-secret': secret,
              'blue-org-id': orgId,
            },
            body: JSON.stringify({
              query: queryLists,
              variables: { projectId: ws.id }
            })
          });
          if (resCols.ok) {
            const dataCols = await resCols.json();
            columns = (dataCols?.data?.todoLists || []).map((l: any) => ({
              id: l.id,
              title: l.title,
            }));
          }
        } catch {
          // fallback to bundled cache for this workspace if single call fails
          const cached = (fallbackKanbanCache as any[]).find(c => c.id === ws.id);
          columns = cached?.columns || [];
        }

        loadedProjects.push({
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          companyName: 'Xprinta',
          color: '#F18108',
          columns,
        });
      }

      if (loadedProjects.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEY_WORKSPACES_CACHE, JSON.stringify(loadedProjects));
        return loadedProjects;
      }
      return fallbackKanbanCache as BlueAppProject[];
    } catch (e) {
      console.warn('Could not fetch live projects from Blue.app, using cached fallback:', e);
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY_WORKSPACES_CACHE);
        if (cached) return JSON.parse(cached);
      } catch {}
      return fallbackKanbanCache as BlueAppProject[];
    }
  }

  /**
   * Create a new 100% complete card / record in Blue.app assigned to workspace and kanban column
   */
  static async createTask(task: CreateTaskParams): Promise<{ id: string; success: boolean; title: string; columnTitle?: string }> {
    const tokenId = await this.getTokenId();
    const secret = await this.getSecret();
    const orgId = await this.getOrgId();
    const workspaceId = task.projectId || (await this.getActiveProject());

    const mutation = `
      mutation CreateRecord($input: CreateRecordInput!) {
        createRecord(input: $input) {
          id
          title
          duedAt
          todoList {
            id
            title
          }
          users {
            id
            fullName
          }
          tags {
            id
            title
          }
          createdAt
        }
      }
    `;

    const inputPayload: any = {
      title: task.title,
    };

    if (task.description && task.description.trim().length > 0) {
      inputPayload.description = task.description;
    }

    if (task.columnId) {
      inputPayload.todoListId = task.columnId;
    }

    if (task.assigneeIds && task.assigneeIds.length > 0) {
      inputPayload.assigneeIds = task.assigneeIds;
    }

    if (task.tags && task.tags.length > 0) {
      inputPayload.tags = task.tags.map(t => ({
        title: t.title,
        color: t.color || '#F18108'
      }));
    }

    if (task.duedAt) {
      inputPayload.duedAt = task.duedAt;
    }

    try {
      const res = await fetch('https://api.blue.app/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'blue-token-id': tokenId,
          'blue-token-secret': secret,
          'blue-org-id': orgId,
          'blue-workspace-id': workspaceId,
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            input: inputPayload
          }
        })
      });

      const data = await res.json();
      if (data?.data?.createRecord?.id) {
        console.log('Task successfully created in Blue.app:', data.data.createRecord.id);
        return {
          id: data.data.createRecord.id,
          title: data.data.createRecord.title,
          columnTitle: data.data.createRecord.todoList?.title,
          success: true,
        };
      } else {
        console.warn('Blue.app createRecord response error:', data?.errors);
        return {
          id: `local_${Date.now()}`,
          title: task.title,
          success: false,
        };
      }
    } catch (e) {
      console.warn('Blue.app createTask network error:', e);
      return {
        id: `local_${Date.now()}`,
        title: task.title,
        success: false,
      };
    }
  }
}
