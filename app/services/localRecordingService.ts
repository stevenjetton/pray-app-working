// services/localRecordingService.ts
import type { Encounter } from '@/types/Encounter'; // <-- Use your canonical type
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'recordings';

// Get all recordings
export async function getAllRecordings(): Promise<Encounter[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load recordings:', e);
    return [];
  }
}

// Get a single recording by ID
export async function getRecordingById(id: string): Promise<Encounter | undefined> {
  const recordings = await getAllRecordings();
  return recordings.find(r => r.id === id);
}

// Add a new recording
export async function addRecording(recording: Omit<Encounter, 'id'> & { id?: string }): Promise<Encounter[]> {
  const recordings = await getAllRecordings();
  const newRecording: Encounter = {
    ...recording,
    id: recording.id ?? Date.now().toString(),
  };
  const newRecordings = [newRecording, ...recordings];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newRecordings));
  return newRecordings;
}

// Update an existing recording
export async function updateRecording(id: string, updates: Partial<Encounter>): Promise<Encounter[]> {
  console.log('[LocalService] updateRecording called with:', { id, updates });
  const recordings = await getAllRecordings();
  const existingRecording = recordings.find(r => r.id === id);
  console.log('[LocalService] Existing recording before update:', existingRecording);
  
  const newRecordings = recordings.map(r => r.id === id ? { ...r, ...updates } : r);
  const updatedRecording = newRecordings.find(r => r.id === id);
  console.log('[LocalService] Recording after update:', updatedRecording);
  
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newRecordings));
  console.log('[LocalService] Data saved to AsyncStorage successfully');
  return newRecordings;
}

// Delete a recording
export async function deleteRecording(id: string): Promise<Encounter[]> {
  const recordings = await getAllRecordings();
  const newRecordings = recordings.filter(r => r.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newRecordings));
  return newRecordings;
}

/**
 * Cleans up all recordings in local storage by removing 'Transcribing…' and empty localTranscription values.
 * If a recording has 'Transcribing…' or empty localTranscription, it will be set to ''.
 * Call this once to ensure only real transcriptions are persisted.
 */
export async function cleanUpTranscriptions() {
  const PLACEHOLDER_VALUES = [
    'Transcribing…',
    'transcribing…',
    'Transcribing...',
    'transcribing...',
    'Transcribing',
    'transcribing',
    '',
    null,
    undefined
  ];
  const all = await getAllRecordings();
  const cleanedIds: string[] = [];
  for (const rec of all) {
    let val = rec.localTranscription;
    if (typeof val === 'string') val = val.trim();
    // Remove if placeholder, empty, or not a real transcription
    if (val === '' || PLACEHOLDER_VALUES.includes(val) || (typeof val === 'string' && val.toLowerCase().startsWith('transcrib'))) {
      // Remove the property entirely for future-proofing
      await updateRecording(rec.id, { localTranscription: undefined });
      cleanedIds.push(rec.id);
    }
  }
  if (cleanedIds.length > 0) {
    console.log(`[CLEANUP] Cleaned up transcriptions for recordings: ${cleanedIds.join(', ')}`);
  } else {
    console.log('[CLEANUP] No transcriptions needed cleaning.');
  }
}
