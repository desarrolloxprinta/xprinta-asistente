import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DictionaryCategory {
  id: string;
  name: string;
  terms: string[];
}

const STORAGE_KEY_DICTIONARY = '@xprinta_technical_dictionary';

export const DEFAULT_DICTIONARY: DictionaryCategory[] = [
  {
    id: 'team',
    name: 'Equipo y Personas',
    terms: [
      'Sergio Carbonell',
      'Jorge Rodríguez',
      'Ruy De jesus',
      'Carlos Jimenez',
      'Jonathan Seldas',
      'Mariana Diaz Sola',
      'Emilio Sánchez coloma',
      'Enrique Jiménez',
      'Eva Perez',
      'Francisco José Perona',
      'Lourdes Benavides',
      'Martina G Morante',
    ],
  },
  {
    id: 'materials',
    name: 'Materiales y Sustratos de Rotulación',
    terms: [
      'Alucobond',
      'Dibond 3mm',
      'Metacrilato colado',
      'Metacrilato extrusionado',
      'PVC espumado Forex',
      'Vinilo polimérico',
      'Vinilo monomérico',
      'Vinilo de corte',
      'Vinilo microperforado',
      'Lona frontlit',
      'Lona microperforada mesh',
      'Lona backlight retroiluminable',
      'Neón LED flex 12V',
      'Neón LED 24V',
      'Policarbonato celular',
      'Policarbonato compacto',
      'Chapa de aluminio lacada',
      'Perfilería de aluminio anodizado',
      'Bandeja de composite plegada',
      'Letras corpóreas de latón',
      'Acero inoxidable cepillado',
      'Espuma foam board',
      'Adhesivo de alto agarre High Tack',
      'Laminado mate antirreflejo',
      'Laminado brillante UV',
      'Módulo LED Samsung IP68',
      'Transformador Mean Well',
    ],
  },
  {
    id: 'machinery',
    name: 'Maquinaria y Herramientas de Taller',
    terms: [
      'Fresadora CNC 3 ejes',
      'Láser CO2 de corte y grabado',
      'Láser de fibra óptica',
      'Plotter de corte Roland',
      'Plotter de impresión UV híbrida',
      'Plotter ecosolvente Epson',
      'Mesa de corte plana con cuchilla oscilante',
      'Plegadora térmica para metacrilato',
      'Plegadora de composite y chapa',
      'Laminadora en frío con rodillo térmico',
      'Remachadora neumática',
      'Pistola de calor decapadora Steinel',
      'Soldadora TIG para aluminio',
      'Prensa térmica de transfer',
      'Guillotina vertical de paneles',
    ],
  },
  {
    id: 'processes',
    name: 'Procesos Técnicos y Montaje',
    terms: [
      'Fresado y vaciado de bandejas',
      'Termoconformado de letras',
      'Rotulación integral de flotas de vehículos',
      'Wrapping automotriz',
      'Fondeado de lunas y escaparates',
      'Instalación con plataforma elevadora PEMP',
      'Fijación mediante anclaje químico',
      'Corte a sangre y solape',
      'Vaciado de vinilo con pelador',
      'Aplicación con transportador de papel transfer',
      'Montaje de monopostes y tótems exteriores',
      'Caja de luz retroiluminada',
      'Rótulo corpóreo con iluminación trasera halo o indirecta',
    ],
  },
  {
    id: 'systems',
    name: 'Sistemas y Software Xprinta',
    terms: [
      'Blue.app',
      'Signeo.es',
      'Xprinta Pro',
      'WD My Cloud EX4100',
      'CorelDraw',
      'Adobe Illustrator',
      'Aspire Vectric CAD/CAM',
      'Caldera RIP',
      'VersaWorks',
      'Supabase',
      'OpenRouter',
      'ElevenLabs',
    ],
  },
];

export class DictionaryService {
  static async getDictionary(): Promise<DictionaryCategory[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY_DICTIONARY);
      if (!json) return DEFAULT_DICTIONARY;
      const parsed: DictionaryCategory[] = JSON.parse(json);
      return parsed.length > 0 ? parsed : DEFAULT_DICTIONARY;
    } catch {
      return DEFAULT_DICTIONARY;
    }
  }

  static async saveDictionary(categories: DictionaryCategory[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_DICTIONARY, JSON.stringify(categories));
  }

  /**
   * Obtiene una lista plana con todos los términos para inyección en el motor de voz (contextualStrings)
   */
  static async getAllTermsForSpeechBiasing(): Promise<string[]> {
    const dict = await this.getDictionary();
    const termSet = new Set<string>();
    for (const cat of dict) {
      for (const term of cat.terms) {
        if (term && term.trim().length > 0) {
          termSet.add(term.trim());
        }
      }
    }
    return Array.from(termSet);
  }

  /**
   * Genera el bloque de contexto estructurado para el systemPrompt del LLM
   */
  static async getContextPrompt(): Promise<string> {
    const dict = await this.getDictionary();
    return dict
      .map(cat => `### ${cat.name.toUpperCase()}:\n${cat.terms.map(t => `- ${t}`).join('\n')}`)
      .join('\n\n');
  }

  static async addCustomTerm(categoryId: string, newTerm: string): Promise<DictionaryCategory[]> {
    const trimmed = newTerm.trim();
    if (!trimmed) return await this.getDictionary();

    const dict = await this.getDictionary();
    const targetCat = dict.find(c => c.id === categoryId) || dict[0];
    if (targetCat && !targetCat.terms.includes(trimmed)) {
      targetCat.terms.push(trimmed);
      await this.saveDictionary(dict);
    }
    return dict;
  }

  static async removeTerm(categoryId: string, termToRemove: string): Promise<DictionaryCategory[]> {
    const dict = await this.getDictionary();
    const targetCat = dict.find(c => c.id === categoryId);
    if (targetCat) {
      targetCat.terms = targetCat.terms.filter(t => t !== termToRemove);
      await this.saveDictionary(dict);
    }
    return dict;
  }
}
