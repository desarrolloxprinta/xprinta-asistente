
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from './src/services/storage';
import { NasSyncService } from './src/services/nasSync';
import { IdeaItem, UserProfile } from './src/types';

async function createSampleRecord() {
  const sampleUser: UserProfile = {
    id: 'xp_usr_01',
    name: 'Sergio García',
    email: 'sergiogarcia@xprinta.com',
    role: 'Dirección Ejecutiva',
  };

  const sampleIdea: IdeaItem = {
    id: 'idea_xp_' + Date.now(),
    title: 'Rótulo Corpóreo Retroiluminado LED Negro Mate - Franquicia Xprinta',
    content: 'Observada nueva tendencia en letras corpóreas de aluminio lacado en negro mate con halo posterior LED 3000K cálido y base de metacrilato satinado de 10mm. Añadir orden de corte fresado para el equipo de producción y cotizar perfilería.',
    category: 'Rótulos',
    type: 'link',
    url: 'https://www.instagram.com/p/DF_xprinta_sample_design',
    tags: ['Rótulos', 'Corpóreo', 'LED3000K', 'Aluminio', 'Franquicias', 'Producción'],
    createdAt: new Date().toISOString(),
    syncedWithBlueApp: true
  };

  const currentIdeas = await StorageService.getIdeas();
  const updated = [sampleIdea, ...currentIdeas];
  await AsyncStorage.setItem('@xprinta_ideas_items', JSON.stringify(updated));

  const llmRecord = NasSyncService.formatForLLM(sampleIdea, sampleUser);
  console.log('=== REGISTRO ENRIQUECIDO PARA EL LLM ===');
  console.log(JSON.stringify(llmRecord, null, 2));
}

createSampleRecord();
