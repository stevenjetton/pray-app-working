import * as FileSystem from 'expo-file-system';

// Exported utility for writing a transcription file
export async function writeTranscriptionFile(recordingId: string, transcription: string): Promise<string> {
  const filename = `${recordingId}-transcription.json`;
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  const content = JSON.stringify({
    transcription,
    updatedAt: new Date().toISOString(),
  });
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  return uri;
}
// useDropbox.ts

import { useCallback } from 'react';
import ReactNativeBlobUtil from 'react-native-blob-util';

export interface DropboxEntry {
  id: string;
  name: string;
  path_lower: string;
  rev: string;
  server_modified: string;
  client_modified: string;
  ['.tag']: 'file' | 'folder';
}

/**
 * Hook to interact with Dropbox API using externally managed OAuth tokens.
 * @param accessToken Current Dropbox OAuth access token (from context/provider)
 * @param refreshAccessToken Function to refresh token and return new access token
 */
export function useDropbox({
  accessToken,
  refreshAccessToken,
}: {
  accessToken: string | null;
  refreshAccessToken: () => Promise<string>;
}) {
  // Internal helper to run API calls, retrying on token expiry
  const withValidToken = useCallback(
    async <T>(apiCall: (token: string) => Promise<T>): Promise<T> => {
      if (!accessToken) throw new Error('No access token available');
      try {
        return await apiCall(accessToken);
      } catch (error: any) {
        if (
          error?.status === 401 ||
          (typeof error?.message === 'string' &&
            error.message.toLowerCase().includes('invalid_access_token'))
        ) {
          const newToken = await refreshAccessToken();
          return await apiCall(newToken);
        }
        throw error;
      }
    },
    [accessToken, refreshAccessToken]
  );

  const sanitizePath = useCallback((path: string): string => {
    const lastSlash = path.lastIndexOf('/');
    let dir = '';
    let filename = path;
    if (lastSlash >= 0) {
      dir = path.substring(0, lastSlash);
      filename = path.substring(lastSlash + 1);
    }
    const decodedFileName = decodeURIComponent(filename);
    const cleanFileName = decodedFileName.trim().replace(/\s+/g, '_');
    let cleanPath = `${dir}/${cleanFileName}`;
    if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
    return cleanPath;
  }, []);

  // List contents of a Dropbox folder
  const listFiles = useCallback(
    (folderPath: string): Promise<DropboxEntry[]> =>
      withValidToken(async (token) => {
        const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: folderPath }),
        });

        const data = await res.json();
        if ('error_summary' in data) {
          throw new Error(data.error_summary);
        }
        return data.entries as DropboxEntry[];
      }),
    [withValidToken]
  );

  // Get temporary download link for a file
  const downloadFile = useCallback(
    (filePath: string): Promise<string> =>
      withValidToken(async (token) => {
        const res = await fetch('https://api.dropboxapi.com/2/files/get_temporary_link', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: filePath }),
        });
        const data = await res.json();
        if (!data.link) throw new Error('Failed to get temporary download link');
        return data.link;
      }),
    [withValidToken]
  );

  // Upload a local file to Dropbox
  const uploadFile = useCallback(
    async (
      localFilePath: string,
      dropboxDestPath: string,
      clientModifiedDate?: Date
    ): Promise<any> => {
      return withValidToken(async (token) => {
        const modified = clientModifiedDate || new Date();
        const cleanedPath = sanitizePath(dropboxDestPath);

        const apiArg = {
          path: cleanedPath,
          mode: 'overwrite',
          autorename: true,
          mute: false,
          strict_conflict: false,
          client_modified: modified.toISOString().replace(/\.\d{3}Z$/, 'Z'),
        };

        // Use the top-level imported ReactNativeBlobUtil here (no require)
        const res = await ReactNativeBlobUtil.fetch(
          'POST',
          'https://content.dropboxapi.com/2/files/upload',
          {
            Authorization: `Bearer ${token}`,
            'Dropbox-API-Arg': JSON.stringify(apiArg),
            'Content-Type': 'application/octet-stream',
          },
          ReactNativeBlobUtil.wrap(localFilePath.replace(/^file:\/\//, ''))
        );

        if (res.info().status !== 200) {
          let errorMessage = 'Unknown error during upload';
          try {
            const json = res.json();
            if (json.error_summary) errorMessage = json.error_summary;
          } catch {}
          throw new Error(`Upload failed: ${errorMessage}`);
        }

        return res.json();
      });
    },
    [sanitizePath, withValidToken]
  );

  // Upload multiple files one after another
  const uploadMultipleFiles = useCallback(
    async (
      files: Array<{ localPath: string; modifiedDate?: Date }>,
      dropboxBasePath: string
    ) => {
      if (!accessToken) throw new Error('No access token');
      const results = [];
      for (const file of files) {
        try {
          const fileName = file.localPath.split('/').pop() || '';
          const response = await uploadFile(
            file.localPath,
            `${dropboxBasePath}/${fileName}`,
            file.modifiedDate
          );
          results.push(response);
        } catch (error) {
          results.push({ error });
        }
      }
      return results;
    },
    [accessToken, uploadFile]
  );

  // Upload recording’s audio file and transcription JSON file
  const uploadRecordingFiles = useCallback(
    async (
      recording: { id: string; audioPath: string; audioModifiedDate?: Date; transcriptionText: string },
      dropboxBasePath: string
    ) => {
      if (!accessToken) throw new Error('No access token');

      const transcriptionUri = await writeTranscriptionFile(recording.id, recording.transcriptionText);
      const filesToUpload = [
        { localPath: recording.audioPath, modifiedDate: recording.audioModifiedDate },
        { localPath: transcriptionUri },
      ];
      return uploadMultipleFiles(filesToUpload, dropboxBasePath);
    },
    [accessToken, uploadMultipleFiles]
  );

  return {
    listFiles,
    downloadFile,
    uploadFile,
    uploadMultipleFiles,
    uploadRecordingFiles,
  };
}
