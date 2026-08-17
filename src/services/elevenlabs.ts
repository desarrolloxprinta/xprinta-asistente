import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer } from 'expo-audio';

const STORAGE_KEY_ELEVENLABS = '@xprinta_elevenlabs_key';
const DEFAULT_KEY = 'YOUR_ELEVENLABS_API_KEY';
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

let currentPlayer: any = null;

export class ElevenLabsService {
  static async getApiKey(): Promise<string> {
    const key = await AsyncStorage.getItem(STORAGE_KEY_ELEVENLABS);
    return key || DEFAULT_KEY;
  }

  static async setApiKey(key: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_ELEVENLABS, key);
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const g: any = typeof window !== 'undefined' ? window : {};
    return g.btoa ? g.btoa(binary) : binary;
  }

  static async speakText(text: string, voiceId: string = DEFAULT_VOICE_ID): Promise<void> {
    const apiKey = await this.getApiKey();
    if (!apiKey) return;

    try {
      if (currentPlayer) {
        try {
          currentPlayer.pause();
          currentPlayer.remove();
        } catch (e) {}
      }

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_22050_32`,
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
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.1,
            }
          }),
        }
      );

      if (!response.ok) {
        console.warn(`ElevenLabs API status ${response.status}`);
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = this.arrayBufferToBase64(arrayBuffer);
      const dataUri = `data:audio/mp3;base64,${base64}`;

      currentPlayer = createAudioPlayer({
        uri: dataUri,
      });
      currentPlayer.play();
    } catch (error) {
      console.warn('ElevenLabs playback notice:', error);
    }
  }
}
