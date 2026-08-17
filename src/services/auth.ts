import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../types';

const STORAGE_KEY_AUTH_USER = '@xprinta_auth_current_user';
const STORAGE_KEY_AUTH_TOKEN = '@xprinta_auth_token';

// Directorio privado oficial de miembros autorizados de Xprinta
export const XPRINTA_AUTHORIZED_MEMBERS: Array<UserProfile & { pinCode: string }> = [
  {
    id: 'xp_usr_01',
    name: 'Sergio García',
    email: 'sergiogarcia@xprinta.com',
    role: 'Dirección Ejecutiva',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    pinCode: '1234',
  },
  {
    id: 'xp_usr_02',
    name: 'Apps Xprinta',
    email: 'apps@xprinta.com',
    role: 'Administrador de Aplicaciones & Sistemas',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
    pinCode: '2026',
  },
  {
    id: 'xp_usr_03',
    name: 'Jorge Xprinta',
    email: 'jorge@xprinta.com',
    role: 'Gestión de Proyectos & Clientes',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    pinCode: '7788',
  },
  {
    id: 'xp_usr_04',
    name: 'Equipo Desarrollo',
    email: 'desarrollo@xprinta.com',
    role: 'Ingeniería, Tecnología & IA',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    pinCode: '9900',
  },
  {
    id: 'xp_usr_05',
    name: 'Operaciones Xprinta',
    email: 'operaciones@xprinta.com',
    role: 'Producción, Fabricación & Montajes',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    pinCode: '4321',
  },
];

export class AuthService {
  /**
   * Obtener el usuario autenticado actualmente
   */
  static async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const userJson = await AsyncStorage.getItem(STORAGE_KEY_AUTH_USER);
      if (!userJson) return null;
      return JSON.parse(userJson) as UserProfile;
    } catch (e) {
      return null;
    }
  }

  /**
   * Autenticación corporativa: validación estricta por email corporativo y código PIN
   */
  static async login(email: string, pin: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!cleanEmail.endsWith('@xprinta.com')) {
      return {
        success: false,
        error: 'Acceso restringido: Solo se permiten correos corporativos @xprinta.com',
      };
    }

    const member = XPRINTA_AUTHORIZED_MEMBERS.find(
      (m) => m.email.toLowerCase() === cleanEmail && m.pinCode === cleanPin
    );

    if (!member) {
      return {
        success: false,
        error: 'Credenciales inválidas o miembro no dado de alta por el administrador.',
      };
    }

    const userProfile: UserProfile = {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      avatar: member.avatar,
    };

    await AsyncStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(userProfile));
    await AsyncStorage.setItem(STORAGE_KEY_AUTH_TOKEN, `xp_tok_${Date.now()}`);

    return {
      success: true,
      user: userProfile,
    };
  }

  /**
   * Cierre de sesión seguro
   */
  static async logout(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY_AUTH_USER);
    await AsyncStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
  }
}
