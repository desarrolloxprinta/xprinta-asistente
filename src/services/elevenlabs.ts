import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system/legacy';
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

const STORAGE_KEY_ELEVENLABS = '@xprinta_elevenlabs_key';
const STORAGE_KEY_ELEVENLABS_VOICE = '@xprinta_elevenlabs_voice_id';

const DEFAULT_KEY = 'sk_9bfb86dc60bd91b3977a997168a8b6c5453672a860872bce';

// Catálogo de Voces Oficiales Hiper-Humanas en Español
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
   * con normalización de audio, salida forzada a altavoz multimedia a máximo volumen
   * y fallback automático a Expo Speech.
   */
  static async speakText(text: string, voiceId?: string): Promise<void> {
    if (!text || text.trim().length === 0) return;

    this.stop();

    const apiKey = await this.getApiKey();
    const targetVoiceId = voiceId || (await this.getVoiceId());

    try {
      // 1. Liberar cualquier sesión de grabación previa (micrófono) en iOS y Android
      // Esto es crucial: si el micrófono sigue activo en el sistema operativo,
      // el audio se enruta por el auricular de llamadas (receiver) en vez del altavoz multimedia principal.
      try {
        if (ExpoSpeechRecognitionModule?.setAudioSessionActiveIOS) {
          ExpoSpeechRecognitionModule.setAudioSessionActiveIOS(false, { notifyOthersOnDeactivation: true });
        }
      } catch (e) {}

      // 2. Configurar modo de audio en modo 'playback' y forzar salida por altavoz principal a máximo nivel
      try {
        await setIsAudioActiveAsync(true);
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'duckOthers',
          allowsRecording: false,
          shouldRouteThroughEarpiece: false, // Forzar Altavoz Multimedia Principal (Loudspeaker)
        });
      } catch (e) {
        console.warn('Audio mode notice:', e);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      // 3. Petición a ElevenLabs Turbo v2.5 con configuración de ganancia (speaker_boost activado y mayor presencia)
      const isFemale = targetVoiceId === 'gJlzF5JxsCvM5hQAoRyD';
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
              stability: isFemale ? 0.42 : 0.38,
              similarity_boost: 0.88,
              style: isFemale ? 0.20 : 0.22,
              use_speaker_boost: true, // Aumenta claridad y volumen de salida en altavoces de teléfono
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

      // 4. Conversión binaria segura a Base64
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

      // 5. Instanciar reproductor y asegurar volumen 1.0 (100% ganancia nativa)
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
