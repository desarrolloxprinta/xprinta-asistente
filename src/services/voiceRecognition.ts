import { Audio } from 'expo-av';
import Voice from '@react-native-voice/voice';

let isListeningActive = false;
let currentTranscript = '';
let onPartialCallback: ((text: string) => void) | null = null;

export class VoiceRecognitionService {
  static isAvailable = false;

  static async init(onTranscriptUpdate?: (text: string) => void) {
    onPartialCallback = onTranscriptUpdate || null;
    currentTranscript = '';

    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        console.warn('Microphone permission denied');
        return false;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      Voice.onSpeechStart = () => {
        isListeningActive = true;
      };

      Voice.onSpeechResults = (e: any) => {
        if (e.value && e.value.length > 0) {
          currentTranscript = e.value[0];
          if (onPartialCallback) {
            onPartialCallback(currentTranscript);
          }
        }
      };

      Voice.onSpeechPartialResults = (e: any) => {
        if (e.value && e.value.length > 0) {
          currentTranscript = e.value[0];
          if (onPartialCallback) {
            onPartialCallback(currentTranscript);
          }
        }
      };

      Voice.onSpeechError = (e: any) => {
        console.warn('Speech recognition notice:', e.error);
      };

      this.isAvailable = true;
      return true;
    } catch (e) {
      console.warn('Voice init warning:', e);
      return false;
    }
  }

  static async startListening(onTranscriptUpdate?: (text: string) => void): Promise<boolean> {
    currentTranscript = '';
    onPartialCallback = onTranscriptUpdate || null;

    try {
      await this.init(onTranscriptUpdate);
      try {
        await Voice.stop();
      } catch (e) {}
      await Voice.start('es-ES');
      isListeningActive = true;
      return true;
    } catch (error) {
      console.warn('Failed to start Voice:', error);
      return false;
    }
  }

  static async stopListening(): Promise<string> {
    try {
      if (isListeningActive) {
        await Voice.stop();
        isListeningActive = false;
      }
    } catch (error) {
      console.warn('Stop Voice error:', error);
    }
    return currentTranscript;
  }

  static isListening(): boolean {
    return isListeningActive;
  }
}
