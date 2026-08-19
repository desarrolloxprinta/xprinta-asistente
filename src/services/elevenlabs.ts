import * as Speech from 'expo-speech';

export class VoiceOutputService {
  /**
   * Locución hablada por voz en tiempo real
   */
  static async speakText(text: string): Promise<void> {
    if (!text || text.trim().length === 0) return;

    try {
      // Detener cualquier locución previa
      Speech.stop();

      Speech.speak(text, {
        language: 'es-ES',
        pitch: 1.0,
        rate: 0.96, // Velocidad natural y clara
      });
    } catch (e) {
      console.warn('Native speech playback notice:', e);
    }
  }

  static stop(): void {
    try {
      Speech.stop();
    } catch (e) {}
  }
}

// Mantener compatibilidad con ElevenLabsService
export const ElevenLabsService = VoiceOutputService;
