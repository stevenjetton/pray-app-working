import * as FileSystem from 'expo-file-system';

export type LocalRecordingMetadata = {
  filename: string;
  lastModified: number; // Numeric timestamp in milliseconds (approximate)
};

export type DropboxFileMetadata = {
  path_lower: string;
  client_modified: string; // ISO 8601 string representing last modified date on client side (Dropbox preserve)
  [key: string]: any; // Allow additional fields
};

/**
 * Get local recording metadata: filename and approximate last modified timestamp.
 * Expo FileSystem does NOT provide file modified timestamp; fallback to current time.
 * You might consider external metadata tracking to improve accuracy.
 *
 * @param uri - local file URI
 * @returns Promise resolving to filename and lastModified timestamp in ms (approximate)
 */
export async function getLocalRecordingMetadata(
  uri: string
): Promise<LocalRecordingMetadata> {
  try {
    const filename = uri.split('/').pop() || `local_${Date.now()}.m4a`;
    const lastModified = Date.now(); // Approximate due to Expo constraints
    return { filename, lastModified };
  } catch {
    return {
      filename: uri.split('/').pop() || `local_${Date.now()}.m4a`,
      lastModified: 0,
    };
  }
}

/**
 * Download file from a remote URL and save it locally under FileSystem.documentDirectory.
 * Deletes any existing file with the same name before download.
 *
 * @param url - Remote file URL (e.g. from Dropbox temporary link)
 * @param filename - Desired filename to save locally
 * @returns Local file URI after successful download
 * @throws Error if download fails
 */
export async function downloadUrlToLocalFile(
  url: string,
  filename: string
): Promise<string> {
  try {
    const fileUri = FileSystem.documentDirectory + filename;
    const existing = await FileSystem.getInfoAsync(fileUri);
    if (existing.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
    const result = await FileSystem.downloadAsync(url, fileUri);
    return result.uri;
  } catch (error: any) {
    throw new Error(`Failed to download file ${filename}: ${error.message || error}`);
  }
}

/**
 * Takes Dropbox file metadata and updates the local recording object with the dropboxModified field,
 * set as numeric milliseconds since epoch from Dropbox's client_modified ISO string.
 *
 * Must be used during sync to update local metadata timestamps from Dropbox.
 *
 * @param dropboxFile - Dropbox file metadata object, requires client_modified string
 * @param localRecording - Existing local recording object to be updated
 * @returns Updated local recording object with dropboxModified set if valid
 */
export function applyDropboxClientModifiedToRecording<T extends { dropboxModified?: number }>(
  dropboxFile: DropboxFileMetadata,
  localRecording: T
): T {
  if (!dropboxFile || !dropboxFile.client_modified) {
    return localRecording;
  }

  const dropboxDate = new Date(dropboxFile.client_modified);
  if (isNaN(dropboxDate.getTime())) {
    return localRecording;
  }

  return {
    ...localRecording,
    dropboxModified: dropboxDate.getTime(),
  };
}

/**
 * Converts local recording metadata's numeric lastModified timestamp into an ISO 8601 string
 * suitable for use as a recording's createdDate.
 *
 * If invalid or missing, returns current timestamp ISO string.
 *
 * @param localMeta - LocalRecordingMetadata with numeric lastModified field
 * @returns ISO 8601 string representing createdDate
 */
export function convertLocalMetadataToEncounterCreatedDate(
  localMeta: LocalRecordingMetadata
): string {
  if (localMeta.lastModified && !isNaN(localMeta.lastModified)) {
    return new Date(localMeta.lastModified).toISOString();
  }
  return new Date().toISOString();
}
