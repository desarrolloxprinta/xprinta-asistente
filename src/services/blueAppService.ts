import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlueAppProject, BlueAppTask } from '../types';

const STORAGE_KEY_BLUE_TOKEN_ID = '@xprinta_blue_token_id';
const STORAGE_KEY_BLUE_SECRET = '@xprinta_blue_secret';
const STORAGE_KEY_BLUE_ORG_ID = '@xprinta_blue_org_id';
const STORAGE_KEY_ACTIVE_PROJECT = '@xprinta_blue_active_project';

const DEFAULT_TOKEN_ID = 'a237c6fed4f04b9a9fe07e1620efbfb9';
const DEFAULT_SECRET = 'pat_d7332db64cd84d1a9834deb093149623';
const DEFAULT_ORG_ID = 'xprinta';
const DEFAULT_PROJECT_SLUG = 'app-xprinta';

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

  static async setActiveProject(projectSlug: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_PROJECT, projectSlug);
  }

  static async saveCredentials(tokenId: string, secret: string, orgId: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_BLUE_TOKEN_ID, tokenId);
    await AsyncStorage.setItem(STORAGE_KEY_BLUE_SECRET, secret);
    await AsyncStorage.setItem(STORAGE_KEY_BLUE_ORG_ID, orgId);
  }

  /**
   * Fetch all active projects / workspaces for the organization from Blue.app GraphQL
   */
  static async fetchProjects(): Promise<BlueAppProject[]> {
    const tokenId = await this.getTokenId();
    const secret = await this.getSecret();
    const orgId = await this.getOrgId();

    const query = `
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
          query,
          variables: { companyId: 'ckih42wh5g2io0834nie8uh0d' }
        })
      });

      if (!res.ok) {
        throw new Error(`Blue.app HTTP ${res.status}`);
      }

      const data = await res.json();
      const items = data?.data?.workspaceList?.items || [];
      return items.map((w: any) => ({
        id: w.id,
        name: w.name,
        companyName: 'Xprinta',
        color: '#F18108',
      }));
    } catch (e) {
      console.warn('Could not fetch projects from Blue.app, using local fallback:', e);
      return [
        { id: 'app-xprinta', name: 'App Xprinta', companyName: 'Xprinta', color: '#F18108' },
        { id: 'xprinta-proyectos', name: 'Xprinta.com (proyectos)', companyName: 'Xprinta', color: '#00A0D2' },
        { id: 'signeo-web', name: 'Signeo.es', companyName: 'Xprinta', color: '#10B981' },
        { id: 'puntos-xprinta-intranet', name: 'Intranet Puntos Xprinta', companyName: 'Xprinta', color: '#8B5CF6' },
      ];
    }
  }

  /**
   * Create a new task / record in Blue.app in real-time
   */
  static async createTask(task: {
    title: string;
    description: string;
    projectId?: string;
    assigneeId?: string;
  }): Promise<{ id: string; success: boolean; title: string }> {
    const tokenId = await this.getTokenId();
    const secret = await this.getSecret();
    const orgId = await this.getOrgId();
    const workspaceId = task.projectId || (await this.getActiveProject());

    const mutation = `
      mutation CreateRecord($input: CreateRecordInput!) {
        createRecord(input: $input) {
          id
          title
          createdAt
        }
      }
    `;

    const inputPayload: any = {
      title: task.title,
      description: task.description,
    };

    if (task.assigneeId) {
      inputPayload.assigneeIds = [task.assigneeId];
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
