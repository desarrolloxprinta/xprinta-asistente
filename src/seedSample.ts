import { StorageService } from './services/storage';
import { NasSyncService } from './services/nasSync';
import { IdeaItem } from './types';

export const injectInitialSample = async () => {
  try {
    const existing = await StorageService.getIdeas();
    if (existing.length === 0) {
      const sample: IdeaItem = {
        id: 'seed_01',
        title: 'Rótulo Corp Metacrilato Satinado',
        content: 'Rótulo corpóreo con iluminación LED perimetral cálida 3000K para fachada comercial.',
        category: 'Rótulos',
        type: 'voice_memo',
        tags: ['Producción', 'Fachada', 'LED'],
        createdAt: new Date().toISOString()
      };
      await StorageService.saveIdea(sample);
    }
  } catch (e) {}
};
