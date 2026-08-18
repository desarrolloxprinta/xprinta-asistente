import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

let isListeningActive = false;
let currentTranscript = '';
let onTranscriptChange: ((text: string) => void) | null = null;

let resultSub: any = null;
let errorSub: any = null;
let endSub: any = null;
let startSub: any = null;

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

  static async startListening(onUpdate?: (text: string) => void): Promise<boolean> {
    try {
      currentTranscript = '';
      onTranscriptChange = onUpdate || null;

      const hasPerm = await this.requestPermissions();
      if (!hasPerm) {
        console.warn('Speech recognition permission not granted');
        return false;
      }

      // Cleanup prior subscriptions
      this.cleanupSubscriptions();

      startSub = ExpoSpeechRecognitionModule.addListener('start', () => {
        isListeningActive = true;
      });

      resultSub = ExpoSpeechRecognitionModule.addListener('result', (event) => {
        if (event.results && event.results.length > 0) {
          currentTranscript = event.results[0].transcript;
          if (onTranscriptChange) {
            onTranscriptChange(currentTranscript);
          }
        }
      });

      errorSub = ExpoSpeechRecognitionModule.addListener('error', (error) => {
        console.warn('Speech recognition event error:', error.message);
        isListeningActive = false;
      });

      endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
        isListeningActive = false;
      });

      await ExpoSpeechRecognitionModule.start({
        lang: 'es-ES',
        interimResults: true,
        continuous: true,
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
      if (isListeningActive) {
        await ExpoSpeechRecognitionModule.stop();
        isListeningActive = false;
      }
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
  }

  static isListening(): boolean {
    return isListeningActive;
  }
}
