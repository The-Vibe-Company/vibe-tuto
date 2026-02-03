import { createClient, DeepgramClient } from '@deepgram/sdk';

let deepgramClient: DeepgramClient | null = null;

export function getDeepgramClient(): DeepgramClient {
  if (!deepgramClient) {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPGRAM_API_KEY environment variable is not set');
    }
    deepgramClient = createClient(apiKey);
  }
  return deepgramClient;
}

export const TRANSCRIPTION_OPTIONS = {
  model: 'nova-2',
  language: 'fr',
  punctuate: true,
  utterances: true,
  smart_format: true,
} as const;
