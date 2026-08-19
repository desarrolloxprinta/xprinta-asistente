import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';
import { BlueAppService } from './blueAppService';

const STORAGE_KEY_AUTH_USER = '@xprinta_auth_current_user';
const STORAGE_KEY_AUTH_TOKEN = '@xprinta_auth_token';
const STORAGE_KEY_SYNCED_USERS = '@xprinta_synced_team_members';

export interface AuthorizedMember extends UserProfile {
  pinCode: string;
  username: string;
}

// 1. Directorio oficial de los 12 miembros reales de Blue.app (PIN 1234 unificado para todos)
export const XPRINTA_AUTHORIZED_MEMBERS: AuthorizedMember[] = [
  {
    id: 'xp_usr_01',
    name: 'Sergio Carbonell',
    username: 'sergiogarcia',
    email: 'sergiogarcia@xprinta.com',
    role: 'CEO / Dirección Ejecutiva',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    pinCode: '1234',
    blueUserId: 'ckih42q6eg2hq0834tmwvlkjs',
  },
  {
    id: 'xp_usr_02',
    name: 'Jorge Rodríguez',
    username: 'jorge',
    email: 'jorge@xprinta.com',
    role: 'Marketing & Gestión de Proyectos',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    pinCode: '1234',
    blueUserId: 'ckih52yz4g9f40834y2g0c81a',
  },
  {
    id: 'xp_usr_03',
    name: 'Ruy De jesus',
    username: 'desarrollo',
    email: 'desarrollo@xprinta.com',
    role: 'Desarrollo Web & IA',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    pinCode: '1234',
    blueUserId: 'ckn49pzmf3370268cquaob16osj',
  },
  {
    id: 'xp_usr_04',
    name: 'Carlos Jimenez',
    username: 'grafico',
    email: 'grafico@xprinta.com',
    role: 'Diseño Gráfico & Rotulación',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    pinCode: '1234',
    blueUserId: 'ckiyplx7bg0hx08343e5r8gc1',
  },
  {
    id: 'xp_usr_05',
    name: 'Jonathan Seldas',
    username: 'grafico3',
    email: 'jonathan@xprinta.com',
    role: 'Diseñador y Desarrollador 3D',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    pinCode: '1234',
    blueUserId: 'cm74uh7y91fkjr92liuka2nrh',
  },
  {
    id: 'xp_usr_06',
    name: 'Mariana Diaz Sola',
    username: 'grafico2',
    email: 'mariana@xprinta.com',
    role: 'Xprinta Signs Spain / Diseño',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    pinCode: '1234',
    blueUserId: 'ckirahpgfnpgs0834xw04ao9z',
  },
  {
    id: 'xp_usr_07',
    name: 'Emilio Sánchez coloma',
    username: 'operaciones',
    email: 'operaciones@xprinta.com',
    role: 'Responsable Operaciones Xprinta',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    pinCode: '1234',
    blueUserId: 'ckih51k42g98d0834l9d5nhud',
  },
  {
    id: 'xp_usr_08',
    name: 'Enrique Jiménez',
    username: 'marketing20',
    email: 'marketing20@xprinta.com',
    role: 'Marketing & Comunicación',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    pinCode: '1234',
    blueUserId: 'cln2wa6lz00pppo1fqtcfgi8a',
  },
  {
    id: 'xp_usr_09',
    name: 'Eva Perez',
    username: 'marketing30',
    email: 'marketing30@xprinta.com',
    role: 'Marketing Digital',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    pinCode: '1234',
    blueUserId: 'clp8b7fum0164rb1fq2vcl2dc',
  },
  {
    id: 'xp_usr_10',
    name: 'Francisco José Perona Galindo',
    username: 'gestion',
    email: 'gestion@xprinta.com',
    role: 'Gestión & Logística',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    pinCode: '1234',
    blueUserId: 'ckpxuu7cy12878435anvw736qwbm',
  },
  {
    id: 'xp_usr_11',
    name: 'Lourdes Benavides',
    username: 'contabilidad2',
    email: 'contabilidad@xprinta.com',
    role: 'Contabilidad & Administración',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    pinCode: '1234',
    blueUserId: 'cm74v31oo1ijir92lwn0yhiiy',
  },
  {
    id: 'xp_usr_12',
    name: 'Martina G Morante',
    username: 'video',
    email: 'video@xprinta.com',
    role: 'Producción Audiovisual & Video',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    pinCode: '1234',
    blueUserId: 'ckkmb8xtdh0280834zscatfew',
  },
];

export class AuthService {
  static async getMembers(): Promise<AuthorizedMember[]> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY_SYNCED_USERS);
      const baseMembers = cached ? (JSON.parse(cached) as AuthorizedMember[]) : XPRINTA_AUTHORIZED_MEMBERS;
      this.syncWithBlueBackground().catch(() => {});
      return baseMembers;
    } catch {
      return XPRINTA_AUTHORIZED_MEMBERS;
    }
  }

  static async syncWithBlueBackground(): Promise<AuthorizedMember[]> {
    try {
      const tokenId = await BlueAppService.getTokenId();
      const secret = await BlueAppService.getSecret();
      const orgId = await BlueAppService.getOrgId();

      const query = `
        query GetOrganizationUsers($companyId: String!) {
          organizationUserList(companyId: $companyId) {
            users {
              id
              email
              fullName
              role
              username
              jobTitle
            }
          }
        }
      `;

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

      const json = await res.json();
      const remoteUsers = json?.data?.organizationUserList?.users || [];

      const mergedMembers: AuthorizedMember[] = remoteUsers.map((ru: any, idx: number) => {
        const local = XPRINTA_AUTHORIZED_MEMBERS.find((m) => m.blueUserId === ru.id);
        const emailGuess = ru.email || (ru.username ? `${ru.username}@xprinta.com` : `user_${idx}@xprinta.com`);

        return {
          id: local?.id || `xp_usr_blue_${ru.id.slice(-6)}`,
          name: ru.fullName || local?.name || 'Miembro Xprinta',
          username: ru.username || local?.username || 'usuario',
          email: local?.email || emailGuess,
          role: ru.jobTitle || local?.role || 'Miembro del Equipo',
          avatar: local?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          pinCode: '1234',
          blueUserId: ru.id,
        };
      });

      await AsyncStorage.setItem(STORAGE_KEY_SYNCED_USERS, JSON.stringify(mergedMembers));
      return mergedMembers;
    } catch (e) {
      return XPRINTA_AUTHORIZED_MEMBERS;
    }
  }

  static async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const userJson = await AsyncStorage.getItem(STORAGE_KEY_AUTH_USER);
      if (!userJson) return null;
      return JSON.parse(userJson) as UserProfile;
    } catch (e) {
      return null;
    }
  }

  static async login(identifier: string, pin: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const clean = identifier.trim().toLowerCase();
    const cleanPin = pin.trim();

    const members = await this.getMembers();

    const member = members.find((m) => {
      const matchesEmail = m.email.toLowerCase() === clean;
      const matchesUsername = m.username.toLowerCase() === clean;
      const matchesPrefix = m.email.split('@')[0].toLowerCase() === clean;
      return (matchesEmail || matchesUsername || matchesPrefix) && (m.pinCode === cleanPin || cleanPin === '1234');
    });

    if (!member) {
      return {
        success: false,
        error: 'Usuario o PIN incorrecto. Introduce tu correo corporativo (@xprinta.com) o usuario y PIN 1234.',
      };
    }

    const userProfile: UserProfile = {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      avatar: member.avatar,
      blueUserId: member.blueUserId,
    };

    await AsyncStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(userProfile));
    await AsyncStorage.setItem(STORAGE_KEY_AUTH_TOKEN, `xp_tok_${Date.now()}`);

    return {
      success: true,
      user: userProfile,
    };
  }

  static async logout(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY_AUTH_USER);
    await AsyncStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
  }
}
