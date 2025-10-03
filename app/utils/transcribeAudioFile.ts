import { formatTranscriptParagraphs } from '@/utils/formatTranscriptParagraphs';
import axios, { AxiosResponse } from 'axios';

/**
 * The expected shape of the transcription API response from your backend.
 */
interface TranscriptionResponse {
  transcript: string;
}

/**
 * Uploads an audio file to your backend, which will send it to AssemblyAI for transcription.
 *
 * @param localUri   The local file URI of the audio to transcribe.
 * @param backendUrl The backend endpoint to call. Defaults to your dev LAN IP + port 3001.
 * @param mimeType   Optional MIME type. Auto-detected from file extension if omitted.
 * @returns          The transcript string (paragraph‑formatted), or '' if transcription fails.
 */
export async function transcribeAudioFile(
  localUri: string,
  backendUrl = 'http://192.168.1.171:3001/transcribe', // Update to your backend IP/domain in prod
  mimeType?: string
): Promise<string> {
  // 1. Determine best MIME type
  const defaultMimeType = 'audio/mpeg';
  const inferredMimeType =
    mimeType ||
    (localUri.endsWith('.wav')
      ? 'audio/wav'
      : localUri.endsWith('.m4a')
      ? 'audio/m4a'
      : localUri.endsWith('.aac')
      ? 'audio/aac'
      : defaultMimeType);

  // 2. Infer filename from URI
  const filename =
    localUri.split('/').pop() ||
    `audio.${inferredMimeType.split('/')[1] || 'mp3'}`;

  // 3. Build FormData payload
  const formData = new FormData();
  formData.append(
    'file',
    {
      uri: localUri,
      name: filename,
      type: inferredMimeType,
    } as any
  );

  try {
    // 4. POST to backend using multipart/form-data
    const response: AxiosResponse<TranscriptionResponse> = await axios.post(
      backendUrl,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 10 * 60 * 1000, // 10 min timeout for large files
      }
    );

    // 5. Validate and return transcript (formatted)
    if (response.data && typeof response.data.transcript === 'string') {
      // Always format so paragraphs appear in‑app regardless of backend state
      return formatTranscriptParagraphs(response.data.transcript);
    } else {
      console.warn('Unexpected transcription response:', response.data);
      return '';
    }
  } catch (err) {
    console.error('Transcription request failed:', err);
    return '';
  }
}
