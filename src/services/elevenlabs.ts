import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system/legacy';
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';
import { ExpoSpeechRecognitionModule, AVAudioSessionCategory, AVAudioSessionCategoryOptions, AVAudioSessionMode } from 'expo-speech-recognition';

const STORAGE_KEY_ELEVENLABS = '@xprinta_elevenlabs_key';
const STORAGE_KEY_ELEVENLABS_VOICE = '@xprinta_elevenlabs_voice_id';

const DEFAULT_KEY = 'sk_9bfb86dc60bd91b3977a997168a8b6c5453672a860872bce';

// Catálogo de Voces Oficiales Hiper-Humanas en Español de Xprinta
export const ELEVENLABS_VOICES = [
  {
    id: 't8NIKqytDP52LZhxHPhn',
    name: 'Sergio',
    gender: 'male',
    description: 'Voz Masculina Natural, Cálida y Profesional',
    accent: 'Español Peninsular',
  },
  {
    id: 'gJlzF5JxsCvM5hQAoRyD',
    name: 'Beatriz',
    gender: 'female',
    description: 'Voz Femenina Agradable, Expresiva y Fluida',
    accent: 'Español Peninsular',
  },
  {
    id: 'rou7JK9I4KSUr1I7wxW7',
    name: 'Emilio',
    gender: 'male',
    description: 'Voz Emilio Xprinta Oficial',
    accent: 'Español Peninsular',
  },
] as const;

export const DEFAULT_VOICE_ID = 't8NIKqytDP52LZhxHPhn';

let currentPlayer: any = null;

export class ElevenLabsService {
  static async getApiKey(): Promise<string> {
    try {
      const key = await AsyncStorage.getItem(STORAGE_KEY_ELEVENLABS);
      return key || DEFAULT_KEY;
    } catch {
      return DEFAULT_KEY;
    }
  }

  static async setApiKey(key: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_ELEVENLABS, key);
  }

  static async getVoiceId(): Promise<string> {
    try {
      const vId = await AsyncStorage.getItem(STORAGE_KEY_ELEVENLABS_VOICE);
      return vId || DEFAULT_VOICE_ID;
    } catch {
      return DEFAULT_VOICE_ID;
    }
  }

  static async setVoiceId(vId: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_ELEVENLABS_VOICE, vId);
  }

  /**
   * Genera locución hiper-humana con ElevenLabs Turbo v2.5
   * con desbloqueo de la sesión de audio del sistema operativo,
   * enrutamiento a altavoz principal y ganancia máxima.
   */
  static async speakText(text: string, voiceId?: string): Promise<void> {
    if (!text || text.trim().length === 0) return;

    this.stop();

    const apiKey = await this.getApiKey();
    const targetVoiceId = voiceId || (await this.getVoiceId());

    try {
      // 1. Desactivar micrófono y liberar sesión de reconocimiento en iOS y Android
      try {
        if (ExpoSpeechRecognitionModule?.setAudioSessionActiveIOS) {
          ExpoSpeechRecognitionModule.setAudioSessionActiveIOS(false, { notifyOthersOnDeactivation: true });
        }
      } catch (e) {}

      // 2. En iOS: cambiar la categoría nativa explícitamente a PLAYBACK puro
      try {
        if (ExpoSpeechRecognitionModule?.setCategoryIOS) {
          ExpoSpeechRecognitionModule.setCategoryIOS({
            category: AVAudioSessionCategory.playback,
            categoryOptions: [
              AVAudioSessionCategoryOptions.defaultToSpeaker,
              AVAudioSessionCategoryOptions.allowBluetooth,
              AVAudioSessionCategoryOptions.allowBluetoothA2DP,
              AVAudioSessionCategoryOptions.allowAirPlay,
            ],
            mode: AVAudioSessionMode.default,
          });
        }
      } catch (e) {}

      // 3. Configurar Expo Audio en modo Playback y activar el chip de audio nativo
      try {
        await setIsAudioActiveAsync(true);
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'doNotMix',
          allowsRecording: false,
          shouldRouteThroughEarpiece: false,
        });
      } catch (e) {
        console.warn('Audio mode notice:', e);
      }

      await new Promise(r => setTimeout(r, 80));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      // 4. Petición a ElevenLabs Turbo v2.5
      const isFemale = targetVoiceId === 'gJlzF5JxsCvM5hQAoRyD';
      const isEmilio = targetVoiceId === 'rou7JK9I4KSUr1I7wxW7';

      const stability = isEmilio ? 0.50 : (isFemale ? 0.42 : 0.38);
      const similarityBoost = isEmilio ? 0.85 : 0.88;
      const style = isEmilio ? 0.15 : (isFemale ? 0.20 : 0.22);

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}?output_format=mp3_44100_128`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability,
              similarity_boost: similarityBoost,
              style,
              use_speaker_boost: true,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`ElevenLabs error status ${response.status}:`, errText);
        this.fallbackSpeech(text, targetVoiceId);
        return;
      }

      const blob = await response.blob();

      // 5. Conversión binaria segura a Base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          if (res && res.includes(',')) {
            resolve(res.split(',')[1]);
          } else {
            resolve(res);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      if (!base64Data) {
        throw new Error('No base64 audio data converted');
      }

      const targetPath = `${FileSystem.cacheDirectory}xprinta_voice_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(targetPath, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 6. Reproducción asegurando volumen al 100%
      currentPlayer = createAudioPlayer(targetPath);
      if (currentPlayer) {
        currentPlayer.volume = 1.0;
        currentPlayer.play();
      }
    } catch (err) {
      console.warn('ElevenLabs playback error, using fallback:', err);
      this.fallbackSpeech(text, targetVoiceId);
    }
  }

  static fallbackSpeech(text: string, voiceId?: string): void {
    try {
      Speech.stop();
      const isFemale = voiceId === 'gJlzF5JxsCvM5hQAoRyD';
      Speech.speak(text, {
        language: 'es-ES',
        pitch: isFemale ? 1.12 : 0.95,
        rate: 1.0,
        volume: 1.0,
        useApplicationAudioSession: false,
      });
    } catch (e) {
      console.warn('Fallback speech error:', e);
    }
  }

  static stop(): void {
    try {
      Speech.stop();
      if (currentPlayer) {
        currentPlayer.pause();
        currentPlayer.remove();
        currentPlayer = null;
      }
    } catch (e) {}
  }
}

export const VoiceOutputService = ElevenLabsService;
