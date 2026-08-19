import AsyncStorage from '@react-native-async-storage/async-storage';
import { Paths, File } from 'expo-file-system';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const STORAGE_KEY_ELEVENLABS = '@xprinta_elevenlabs_key';
const STORAGE_KEY_ELEVENLABS_VOICE = '@xprinta_elevenlabs_voice_id';

const DEFAULT_KEY = 'sk_9bfb86dc60bd91b3977a997168a8b6c5453672a860872bce';

// Voz personalizada y humana en español de Sergio (t8NIKqytDP52LZhxHPhn)
export const DEFAULT_VOICE_ID = 't8NIKqytDP52LZhxHPhn';

let currentPlayer: any = null;

export class ElevenLabsService {
  static async getApiKey(): Promise<string> {
    const key = await AsyncStorage.getItem(STORAGE_KEY_ELEVENLABS);
    return key || DEFAULT_KEY;
  }

  static async setApiKey(key: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_ELEVENLABS, key);
  }

  static async getVoiceId(): Promise<string> {
    const vId = await AsyncStorage.getItem(STORAGE_KEY_ELEVENLABS_VOICE);
    return vId || DEFAULT_VOICE_ID;
  }

  static async setVoiceId(vId: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_ELEVENLABS_VOICE, vId);
  }

  /**
   * Genera locución hiper-humana y conversacional usando ElevenLabs Turbo v2.5
   * con modulación expresiva y natural.
   */
  static async speakText(text: string, voiceId?: string): Promise<void> {
    if (!text || text.trim().length === 0) return;

    this.stop();

    const apiKey = await this.getApiKey();
    const targetVoiceId = voiceId || (await this.getVoiceId());

    try {
      // 1. Configurar la sesión de audio móvil para altavoz principal
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // 2. Llamada directa a ElevenLabs Turbo v2.5 con la voz de Sergio
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
              stability: 0.38,           // Expresión viva y cálida
              similarity_boost: 0.88,    // Calidad y fidelidad idéntica a la voz de Sergio
              style: 0.30,               // Cadencia conversacional natural
              use_speaker_boost: true,
            }
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`ElevenLabs error status ${response.status}:`, errText);
        return;
      }

      const blob = await response.blob();
      const file = new File(Paths.cache, `assistant_voice_${Date.now()}.mp3`);
      
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
      console.warn('ElevenLabs playback error:', err);
    }
  }

  static stop(): void {
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
