import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { Paths, File } from 'expo-file-system';
import { createAudioPlayer } from 'expo-audio';

const STORAGE_KEY_ELEVENLABS = '@xprinta_elevenlabs_key';
const DEFAULT_KEY = 'sk_9bfb86dc60bd91b3977a997168a8b6c5453672a860872bce';

// Voz ultra-humana en español de ElevenLabs ("Daniel" / "Rachel")
const DEFAULT_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9';

let currentPlayer: any = null;

export class ElevenLabsService {
  static async getApiKey(): Promise<string> {
    const key = await AsyncStorage.getItem(STORAGE_KEY_ELEVENLABS);
    return key || DEFAULT_KEY;
  }

  static async setApiKey(key: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_ELEVENLABS, key);
  }

  /**
   * Genera locución hiper-humana con ElevenLabs y la reproduce con calidad de estudio.
   * Si falla la red o hay timeout, utiliza la voz nativa del dispositivo como respaldo inmediato.
   */
  static async speakText(text: string, voiceId: string = DEFAULT_VOICE_ID): Promise<void> {
    if (!text || text.trim().length === 0) return;

    this.stop();

    const apiKey = await this.getApiKey();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.55,
              similarity_boost: 0.85,
              style: 0.25,
              use_speaker_boost: true,
            }
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const blob = await response.blob();
      const file = new File(Paths.cache, `assistant_voice_${Date.now()}.mp3`);
      
      // Escribir el audio descargado
      const arrayBuf = await blob.arrayBuffer();
      const stream = file.writableStream();
      const writer = stream.getWriter();
      await writer.write(new Uint8Array(arrayBuf));
      await writer.close();

      currentPlayer = createAudioPlayer({
        uri: file.uri,
      });
      currentPlayer.play();
    } catch (err) {
      console.warn('ElevenLabs unavailable or error, falling back to native speech:', err);
      try {
        Speech.speak(text, {
          language: 'es-ES',
          pitch: 1.0,
          rate: 0.95,
        });
      } catch (e) {
        console.warn('Native speech error:', e);
      }
    }
  }

  static stop(): void {
    try {
      Speech.stop();
    } catch (e) {}
    try {
      if (currentPlayer) {
        currentPlayer.pause();
        currentPlayer.remove();
        currentPlayer = null;
      }
    } catch (e) {}
  }
}

export const VoiceOutputService = ElevenLabsService;
