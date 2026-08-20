import { ExpoSpeechRecognitionModule, AVAudioSessionCategory, AVAudioSessionCategoryOptions, AVAudioSessionMode } from 'expo-speech-recognition';
import { DictionaryService } from './dictionaryService';

let isListeningActive = false;
let currentTranscript = '';
let onTranscriptChange: ((text: string) => void) | null = null;
let onSilenceAutoEnd: ((finalText: string) => void) | null = null;
let silenceTimer: any = null;

let resultSub: any = null;
let errorSub: any = null;
let endSub: any = null;
let startSub: any = null;
let speechEndSub: any = null;

export class SpeechService {
  static async requestPermissions(): Promise<boolean> {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return result.granted;
    } catch (e) {
      console.warn('Speech permissions error:', e);
      return false;
    }
  }

  /**
   * Inicia el reconocimiento de voz configurando la categoría iOS para que SIEMPRE enrute por altavoz principal
   */
  static async startListening(
    onUpdate?: (text: string) => void,
    onAutoFinish?: (text: string) => void
  ): Promise<boolean> {
    try {
      currentTranscript = '';
      onTranscriptChange = onUpdate || null;
      onSilenceAutoEnd = onAutoFinish || null;

      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }

      const hasPerm = await this.requestPermissions();
      if (!hasPerm) {
        console.warn('Speech recognition permission not granted');
        return false;
      }

      // 1. Configurar AudioSession en iOS antes de iniciar reconocimiento para forzar salida a altavoz
      try {
        if (ExpoSpeechRecognitionModule?.setCategoryIOS) {
          ExpoSpeechRecognitionModule.setCategoryIOS({
            category: AVAudioSessionCategory.playAndRecord,
            categoryOptions: [
              AVAudioSessionCategoryOptions.defaultToSpeaker,
              AVAudioSessionCategoryOptions.allowBluetooth,
              AVAudioSessionCategoryOptions.allowBluetoothA2DP,
              AVAudioSessionCategoryOptions.allowAirPlay,
              AVAudioSessionCategoryOptions.mixWithOthers,
            ],
            mode: AVAudioSessionMode.default,
          });
        }
      } catch (e) {
        console.warn('setCategoryIOS notice:', e);
      }

      // 2. Obtener términos técnicos y nombres para sesgo fonético contextual
      const biasingTerms = await DictionaryService.getAllTermsForSpeechBiasing();

      // Cleanup prior subscriptions
      this.cleanupSubscriptions();

      startSub = ExpoSpeechRecognitionModule.addListener('start', () => {
        isListeningActive = true;
      });

      resultSub = ExpoSpeechRecognitionModule.addListener('result', (event) => {
        if (event.results && event.results.length > 0) {
          const text = event.results[0].transcript;
          currentTranscript = text;
          if (onTranscriptChange) {
            onTranscriptChange(currentTranscript);
          }

          // Reset silence timer on every new word recognized
          if (silenceTimer) clearTimeout(silenceTimer);
          
          // Si el usuario deja de hablar por 1.8 segundos, procesar automáticamente
          if (text.trim().length > 3) {
            silenceTimer = setTimeout(async () => {
              if (isListeningActive && onSilenceAutoEnd) {
                const captured = currentTranscript;
                await SpeechService.stopListening();
                onSilenceAutoEnd(captured);
              }
            }, 1800);
          }
        }
      });

      speechEndSub = ExpoSpeechRecognitionModule.addListener('speechend', () => {
        if (currentTranscript.trim().length > 3 && !silenceTimer) {
          silenceTimer = setTimeout(async () => {
            if (isListeningActive && onSilenceAutoEnd) {
              const captured = currentTranscript;
              await SpeechService.stopListening();
              onSilenceAutoEnd(captured);
            }
          }, 1200);
        }
      });

      errorSub = ExpoSpeechRecognitionModule.addListener('error', (error) => {
        console.warn('Speech recognition event error:', error.message);
        isListeningActive = false;
        if (silenceTimer) clearTimeout(silenceTimer);
      });

      endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
        isListeningActive = false;
        if (silenceTimer) clearTimeout(silenceTimer);
      });

      await ExpoSpeechRecognitionModule.start({
        lang: 'es-ES',
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
        contextualStrings: biasingTerms.slice(0, 100),
        iosTaskHint: 'dictation',
      });

      isListeningActive = true;
      return true;
    } catch (error) {
      console.warn('Failed to start speech recognition:', error);
      return false;
    }
  }

  static async stopListening(): Promise<string> {
    try {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
      if (isListeningActive) {
        await ExpoSpeechRecognitionModule.stop();
        isListeningActive = false;
      }
      // Desactivar la sesión de audio del speech recognizer inmediatamente
      try {
        if (ExpoSpeechRecognitionModule?.setAudioSessionActiveIOS) {
          ExpoSpeechRecognitionModule.setAudioSessionActiveIOS(false, { notifyOthersOnDeactivation: true });
        }
      } catch (e) {}
    } catch (error) {
      console.warn('Failed to stop speech recognition:', error);
    }
    this.cleanupSubscriptions();
    return currentTranscript;
  }

  static cleanupSubscriptions() {
    if (startSub) { startSub.remove(); startSub = null; }
    if (resultSub) { resultSub.remove(); resultSub = null; }
    if (errorSub) { errorSub.remove(); errorSub = null; }
    if (endSub) { endSub.remove(); endSub = null; }
    if (speechEndSub) { speechEndSub.remove(); speechEndSub = null; }
  }

  static isListening(): boolean {
    return isListeningActive;
  }
}
