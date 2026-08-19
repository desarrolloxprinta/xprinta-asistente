export type IdeaCategory = string;

export type IdeaType = 'voice_memo' | 'task' | 'link' | 'quick_note' | 'observation';

export interface IdeaItem {
  id: string;
  title: string;
  content: string;
  category: string; // Categoría dinámica creada por el usuario o asignada por la IA
  type: IdeaType;
  url?: string;
  tags: string[];
  createdAt: string;
  syncedWithBlueApp?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  blueUserId?: string;
}

export interface BlueAppProject {
  id: string;
  name: string;
  companyName: string;
  color?: string;
}

export interface BlueAppTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
}
