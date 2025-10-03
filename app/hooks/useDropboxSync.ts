import { Audio as ExpoAudio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useCallback, useState } from 'react';
import { writeTranscriptionFile } from './useDropbox';
type LocalEncounter = import('@/types/Encounter').Encounter;

// Extends DropboxEntry with an optional _parentFolder property for tagging
type DropboxEntryWithParent = import('./useDropbox').DropboxEntry & { _parentFolder?: string | null };

import { useDropboxAuth } from '@/context/DropboxAuthContext';
import { useRecordings } from '@/context/RecordingContext';
import { useTags } from '@/context/TagsContext';
import type { DropboxEntry } from '@/hooks/useDropbox';

import { useDropbox } from '@/hooks/useDropbox';
import { getAllRecordings } from '@/services/localRecordingService';
import { getAllMergedTags } from '@/services/tagService';
import { downloadUrlToLocalFile } from '@/utils/dropboxSyncUtils';
import { formatTranscriptParagraphs } from '@/utils/formatTranscriptParagraphs';
import { transcribeAudioFile } from '@/utils/transcribeAudioFile';


export function useDropboxSync(basePath = '/Recordings', onMissingTag?: (label: string) => Promise<string | null>) {
  // Helper: get a tag by label (case-insensitive) -- app is source of truth
  // If not found, call onMissingTag callback (for UI prompt)
  const getTagIdByLabel = async (label: string): Promise<string | null> => {
    const allTags: import('@/types/Tags').Tag[] = await getAllMergedTags();
    const found = allTags.find((t: import('@/types/Tags').Tag) => t.label.trim().toLowerCase() === label.trim().toLowerCase());
    if (found) return found.id;
    if (onMissingTag) {
      // Optionally prompt user to create a new tag
      return await onMissingTag(label);
    }
    return null;
  };
  const { recordings, addRecording, updateRecording, refreshRecordings } = useRecordings();
  const { refreshTags } = useTags();

  const { accessToken, refreshAccessToken } = useDropboxAuth();

  const { listFiles, downloadFile, uploadFile } = useDropbox({
    accessToken,
    refreshAccessToken,
  });

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState({ completed: 0, total: 0 });

  const listDropboxEntries = useCallback(
    async (folder: string): Promise<DropboxEntry[]> => {
      if (!accessToken) return [];
      try {
        const files = await listFiles(folder);
        return files.filter(file => !file.name.toLowerCase().endsWith('transcription.json'));
      } catch {
        return [];
      }
    },
    [accessToken, listFiles]
  );

  const safeIso = useCallback((str?: string) => {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }, []);

  const getAudioDuration = useCallback(async (uri: string): Promise<number> => {
    try {
      const { sound, status } = await ExpoAudio.Sound.createAsync({ uri });
      if (status.isLoaded && typeof status.durationMillis === 'number') {
        const durationSec = Math.round(status.durationMillis / 1000);
        await sound.unloadAsync();
        return durationSec;
      }
      await sound.unloadAsync();
    } catch {
      // silently ignore
    }
    return 0;
  }, []);


  const twoWaySync = useCallback(async () => {
    console.log('[SYNC] twoWaySync called');
    setSyncError(null);
    setSyncing(true);

    try {
      // 1. List all subfolders under /Recordings (one level deep)
      const folderEntries = await listDropboxEntries(basePath);
      const subfolders = folderEntries.filter(f => f['.tag'] === 'folder');
      // Map: folder name (lowercase) => tag id (only if tag exists in app)
      const folderTagMap: Record<string, string> = {};
      for (const folder of subfolders) {
        const tagId = await getTagIdByLabel(folder.name);
        if (tagId) folderTagMap[folder.name.trim().toLowerCase()] = tagId;
        // If tagId is null, optionally collect for user prompt (see below)
      }

      // 2. List all files in all subfolders (one level deep)
      let remoteFiles: DropboxEntryWithParent[] = [];
      for (const folder of subfolders) {
        const files = await listDropboxEntries(folder.path_lower);
        // Attach folder name to each file for tagging
        remoteFiles.push(...files.filter(f => f['.tag'] === 'file').map(f => ({ ...f, _parentFolder: folder.name } as DropboxEntryWithParent)));
      }
      // Also include any files directly in /Recordings (no tag)
      remoteFiles.push(...folderEntries.filter(f => f['.tag'] === 'file').map(f => ({ ...f, _parentFolder: null } as DropboxEntryWithParent)));

      // 3. Build lookup maps for sync logic
      const remoteById = new Map<string, DropboxEntry>();
      const remoteByName = new Map<string, DropboxEntry>();
      remoteFiles.forEach(file => {
        if (file.id) remoteById.set(file.id, file);
        remoteByName.set(file.name, file);
      });

      const recordingsArr = recordings as LocalEncounter[];
      const localById = new Map<string, LocalEncounter>();
      const localByName = new Map<string, LocalEncounter>();
      recordingsArr.forEach(r => {
        if (r.dropboxFileId) localById.set(r.dropboxFileId, r);
        else if (r.uri) {
          const filename = r.uri.split('/').pop() ?? '';
          localByName.set(filename, r);
        }
      });

      let totalOps = 0;
      let completedOps = 0;

      const downloadTasks: Promise<void>[] = [];
      const uploadTasks: Promise<void>[] = [];

      // --- DOWNLOAD / ADD NEW REMOTE or REDOWNLOAD missing local files ---
      for (const remote of remoteFiles) {
        if (!remote.id) continue;
        // Determine tag(s) for this file based on parent folder
        let tags: string[] = [];
        if (remote._parentFolder) {
          const tagId = folderTagMap[remote._parentFolder.trim().toLowerCase()];
          if (tagId) {
            tags = [tagId];
          } else {
            // Optionally: prompt user to create a new tag for this folder
            // For now, skip tag assignment if not found
            // You can later pass a callback to getTagIdByLabel to prompt the user
          }
        }

        const remoteModIso = safeIso(remote.client_modified) ?? safeIso(remote.server_modified) ?? '';
        const remoteModTime = remoteModIso ? new Date(remoteModIso).getTime() : 0;

        const local = localById.get(remote.id) as any;
        console.log('[SYNC] remote:', remote.name, remote.id, 'local:', local);
        const rev = remote.rev || '';

        // Check if local audio file is missing for existing recording metadata
        const missingLocalFile = local && local.uri
          ? !(await FileSystem.getInfoAsync(local.uri)).exists
          : true;

        if (!local) {
          // ...existing code for new download...
          totalOps++;
          downloadTasks.push((async () => {
            // ...existing code...
            try {
              const url = await downloadFile(remote.path_lower);
              const localUri = await downloadUrlToLocalFile(url, remote.name);
              const duration = await getAudioDuration(localUri);
              const created = remote.client_modified ?? new Date().toISOString();

              // Only transcribe if no transcription exists or it is empty
              let transcription = '';
              if (!local || !local.localTranscription || !local.localTranscription.trim()) {
                // Transcribe & format
                const transcriptionRaw = await transcribeAudioFile(localUri);
                transcription = formatTranscriptParagraphs(transcriptionRaw || '');
              }

              await addRecording({
                title: remote.name.replace(/\.[^/.]+$/, ''),
                uri: localUri,
                dropboxFileId: remote.id,
                dropboxRev: rev,
                dropboxModified: new Date(created).getTime(),
                createdDate: created,
                imported: true,
                duration,
                localTranscription: transcription,
                tags,
              });
            } catch (err) {
              console.error('[SYNC] Download task error for remote:', remote.name, remote.id, err);
            }
            completedOps++;
            setSyncProgress({ completed: completedOps, total: totalOps });
          })());
        } else {
          // Only update the local recording's tags from Dropbox
          const localTags = Array.isArray(local.tags) ? local.tags : [];
          const tagsChanged = tags.length > 0 && (localTags.length !== tags.length || !tags.every(t => localTags.includes(t)));
          if (tagsChanged) {
            totalOps++;
            downloadTasks.push((async () => {
              try {
                await updateRecording(local.id, { tags });
                console.log('[SYNC] Updated tags for local recording:', local.title, tags);
              } catch (err) {
                console.error('[SYNC] Error updating tags for local recording:', local.title, err);
              }
              completedOps++;
              setSyncProgress({ completed: completedOps, total: totalOps });
            })());
          }
          // ...existing code for missingLocalFile or revision update...
          if (missingLocalFile || (!local.dropboxRev || local.dropboxRev !== rev)) {
            // ...existing code for redownload/update...
            const localMod = local.dropboxModified ?? 0;
            if (missingLocalFile || remoteModTime > localMod) {
              totalOps++;
              downloadTasks.push((async () => {
                try {
                  const url = await downloadFile(remote.path_lower);
                  const localUri = await downloadUrlToLocalFile(url, remote.name);
                  const duration = await getAudioDuration(localUri);
                  const created = local.createdDate ?? remote.client_modified ?? new Date().toISOString();

                  // Only transcribe if no transcription exists or it is empty
                  let transcription = '';
                  let shouldTranscribe = !local.localTranscription || !local.localTranscription.trim();
                  if (shouldTranscribe) {
                    const transcriptionRaw = await transcribeAudioFile(localUri);
                    transcription = formatTranscriptParagraphs(transcriptionRaw || '');
                  }

                  await updateRecording(local.id, {
                    uri: localUri,
                    dropboxRev: rev,
                    dropboxModified: new Date(created).getTime(),
                    createdDate: created,
                    duration,
                    // Only overwrite transcription if none exists locally
                    localTranscription: shouldTranscribe ? transcription : local.localTranscription,
                  });
                  if (shouldTranscribe) {
                    console.log('[SYNC] updateRecording with transcription:', transcription);
                  }
                } catch (err) {
                  console.error('[SYNC] Download task error for update/redownload:', remote.name, remote.id, err);
                }
                completedOps++;
                setSyncProgress({ completed: completedOps, total: totalOps });
              })());
            }
          }
        }
      }

      // --- UPLOAD LOCAL TO REMOTE ---
      for (const localRec of recordings) {
        if (!localRec.uri) {
          console.log('[SYNC] Skipping localRec with no uri:', localRec);
          continue;
        }
        console.log('[SYNC] Scheduling upload task for local:', localRec.title, localRec.id);
        const filename = localRec.uri.split('/').pop() ?? '';
        if (filename.toLowerCase().endsWith('transcription.json')) continue;

        const remote = localRec.dropboxFileId
          ? remoteById.get(localRec.dropboxFileId)
          : remoteByName.get(filename);
        const localModTime = localRec.dropboxModified ?? 0;

        const uploadRecording = async () => {
          const srcPath = localRec.uri!;
          const modDate = localRec.createdDate ? new Date(localRec.createdDate) : undefined;
          const destPath = `${basePath}/${filename}`;

          const audioUpload = await uploadFile(srcPath, destPath, modDate);

          const transcriptionUri = await writeTranscriptionFile(
            localRec.id,
            formatTranscriptParagraphs(localRec.localTranscription ?? '')
          );
          const transcriptionFilename =
            filename.replace(/\.[^/.]+$/, '') + '-transcription.json';
          const transcriptionDest = `${basePath}/${transcriptionFilename}`;

          const transcriptionUpload = await uploadFile(transcriptionUri, transcriptionDest);

          return { audioUpload, transcriptionUpload };
        };

        if (!remote) {
          totalOps++;
          uploadTasks.push((async () => {
            console.log('[SYNC] >>> Upload task function entered for local:', localRec.title, localRec.id);
            console.log('[SYNC] Upload task started for local:', localRec.title, localRec.id);
            try {
              const { audioUpload } = await uploadRecording();
              if (audioUpload?.id && audioUpload?.rev && audioUpload?.server_modified) {
                await updateRecording(localRec.id, {
                  dropboxFileId: audioUpload.id,
                  dropboxRev: audioUpload.rev,
                  dropboxModified: new Date(audioUpload.server_modified).getTime(),
                });
              }
            } catch (err) {
              console.error('[SYNC] Upload task error for local:', localRec.title, localRec.id, err);
            }
            completedOps++;
            setSyncProgress({ completed: completedOps, total: totalOps });
          })());
        } else {
          const rev = remote.rev ?? '';
          const remoteModTime = remote.client_modified
            ? new Date(remote.client_modified).getTime()
            : remote.server_modified
            ? new Date(remote.server_modified).getTime()
            : 0;

          if (localModTime > remoteModTime && (!localRec.dropboxRev || localRec.dropboxRev !== rev)) {
            totalOps++;
            uploadTasks.push((async () => {
              console.log('[SYNC] >>> Upload task function entered for local (update):', localRec.title, localRec.id);
              console.log('[SYNC] Upload task started for local (update):', localRec.title, localRec.id);
              try {
                const { audioUpload } = await uploadRecording();
                if (audioUpload?.id && audioUpload?.rev && audioUpload?.server_modified) {
                  await updateRecording(localRec.id, {
                    dropboxFileId: audioUpload.id,
                    dropboxRev: audioUpload.rev,
                    dropboxModified: new Date(audioUpload.server_modified).getTime(),
                  });
                }
              } catch (err) {
                console.error('[SYNC] Upload task error for local (update):', localRec.title, localRec.id, err);
              }
              completedOps++;
              setSyncProgress({ completed: completedOps, total: totalOps });
            })());
          }
        }
      }

      console.log('[SYNC] Awaiting downloadTasks, count:', downloadTasks.length);
      await Promise.all(downloadTasks);
      console.log('[SYNC] All download tasks complete');
      console.log('[SYNC] Awaiting uploadTasks, count:', uploadTasks.length);
      await Promise.all(uploadTasks);
      console.log('[SYNC] All upload tasks complete');
      await refreshRecordings();
      await refreshTags();

      // --- FUTURE-PROOF: Transcribe any local recording with missing/empty transcription ---
      const allRecordings = await getAllRecordings();
      for (const rec of allRecordings) {
        // Only transcribe if no real transcription exists and audio file exists
        const transcription = rec.localTranscription;
        const needsTranscription = !transcription || (typeof transcription === 'string' && !transcription.trim());
        console.log('[SYNC][DEBUG] Checking recording:', {
          id: rec.id,
          title: rec.title,
          uri: rec.uri,
          localTranscription: rec.localTranscription,
          needsTranscription,
        });
        if (needsTranscription && rec.uri) {
          try {
            const info = await FileSystem.getInfoAsync(rec.uri);
            console.log('[SYNC][DEBUG] File info for', rec.title || rec.id, ':', info);
            if (info.exists) {
              const transcriptRaw = await transcribeAudioFile(rec.uri);
              console.log('[SYNC][DEBUG] Transcript raw for', rec.title || rec.id, ':', transcriptRaw);
              const transcript = formatTranscriptParagraphs(transcriptRaw || '');
              if (transcript) {
                await updateRecording(rec.id, { localTranscription: transcript });
                console.log(`[SYNC] Transcribed and saved for recording: ${rec.title || rec.id}`);
              } else {
                console.log(`[SYNC][DEBUG] No transcript returned for: ${rec.title || rec.id}`);
              }
            } else {
              console.log(`[SYNC][DEBUG] Audio file does not exist for: ${rec.title || rec.id}`);
            }
          } catch (err) {
            console.error('[SYNC] Error transcribing local recording:', rec.title || rec.id, err);
          }
        } else {
          if (!needsTranscription) {
            console.log(`[SYNC][DEBUG] Skipping: already has transcription for ${rec.title || rec.id}`);
          } else if (!rec.uri) {
            console.log(`[SYNC][DEBUG] Skipping: no audio URI for ${rec.title || rec.id}`);
          }
        }
      }

    } catch (error) {
      setSyncError(error instanceof Error ? error.message : String(error));
    } finally {
      setSyncing(false);
      setSyncProgress({ completed: 0, total: 0 });
    }
  }, [
    basePath,
    listDropboxEntries,
    downloadFile,
    uploadFile,
    recordings,
    addRecording,
    updateRecording,
    refreshRecordings,
    refreshTags,
    safeIso,
    getAudioDuration,
  ]);

  return { syncing, syncError, syncProgress, twoWaySync };
}
