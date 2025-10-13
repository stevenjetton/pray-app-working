import { Encounter } from '@/types/Encounter';
import { useRecordings } from '@context/RecordingContext';
import { Audio, AVPlaybackStatus, InterruptionModeIOS } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type PlaybackContextType = {
  recordings: Encounter[];
  selectedRecording: Encounter | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  playRecording: (recording: Encounter) => Promise<void>;
  playPlaylist: (recordings: Encounter[], playlistId?: string) => Promise<void>;
  pausePlayback: () => Promise<void>;
  skipBy: (seconds: number) => Promise<void>;
  setSelectedRecording: (recording: Encounter | null) => void;
  stopPlayback: () => Promise<void>;
  playlistQueue: Encounter[];
  playlistIndex: number;
  isPlaylistPlaying: boolean;
  activePlaylistId: string | null;
};

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  console.log('[PlaybackContext] PlaybackProvider mounted');
  const { recordings, updateRecording } = useRecordings();
  const [selectedRecording, setSelectedRecording] = useState<Encounter | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const isPlayInProgressRef = useRef(false);
  // Playlist queue state
  const [playlistQueue, setPlaylistQueue] = useState<Encounter[]>([]);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [isPlaylistPlaying, setIsPlaylistPlaying] = useState(false);
  // Play all recordings in a playlist, starting from the first
  const playRecordingRef = useRef<((r: Encounter) => Promise<void>) | null>(null);
  // Track which playlist initiated playback
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  // Wrap \`setSelectedRecording\` with logging
  const setSelectedRecordingWithLog = (recording: Encounter | null) => {
  // [PlaybackContext] setSelectedRecording called: recording?.id
    setSelectedRecording(recording);
  };

  const stopPlayback = useCallback(async () => {
  // [PlaybackContext] stopPlayback called
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current.setOnPlaybackStatusUpdate(null);
      } catch (e) {
        console.warn('[PlaybackContext] stopPlayback error:', e);
      }
      soundRef.current = null;
    }
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    // Do NOT clear selectedRecording here to keep UI stable and avoid flicker
  }, []);

  const waitForFileStability = useCallback(
    async (uri: string, maxWaitMs = 2000, intervalMs = 200) => {
  // [PlaybackContext] waitForFileStability check start: uri
      let lastSize = -1;
      let elapsed = 0;
      while (elapsed < maxWaitMs) {
        try {
          const info = await FileSystem.getInfoAsync(uri);
          if (!info.exists) {
            // [PlaybackContext] File does not exist: uri
            return false;
          }
          if (info.size === lastSize && info.size > 0) {
            // [PlaybackContext] File size stable: info.size
            return true; // stable size detected
          }
          lastSize = info.size;
          await new Promise((res) => setTimeout(res, intervalMs));
          elapsed += intervalMs;
        } catch (e) {
          console.warn('[PlaybackContext] waitForFileStability error:', e);
          return false;
        }
      }
  // [PlaybackContext] File stability timeout exceeded
      return false;
    },
    []
  );

  // Keep a ref to selectedRecording to avoid stale closure issues in playRecording
  const selectedRecordingRef = useRef<Encounter | null>(null);
  useEffect(() => {
    selectedRecordingRef.current = selectedRecording;
  }, [selectedRecording]);

  // Modified playRecording to support playlist auto-advance
  const playRecording = useCallback(
    async (recording: Encounter) => {
      // Avoid logging full transcript in debug
      const { id, title, uri, views } = recording;
      console.log('[PlaybackContext] playRecording:', { id, title, uri, views });
      if (isPlayInProgressRef.current) {
        // [PlaybackContext] playRecording ignored: already in progress
        return;
      }
      isPlayInProgressRef.current = true;

      let playbackFinished = false;
      try {
        if (!recording.uri) {
          console.warn('[PlaybackContext] playRecording: No URI found for recording:', recording.id);
          isPlayInProgressRef.current = false;
          return;
        }

        if (soundRef.current) {
          try {
            const status = await soundRef.current.getStatusAsync();
            if (status.isLoaded && status.uri === recording.uri) {
              // Same audio loaded, resume playback if needed
              if (!status.isPlaying) {
                await soundRef.current.playAsync();
              }
              setIsPlaying(true);
              isPlayInProgressRef.current = false;
              return;
            } else {
              await stopPlayback();
            }
          } catch (err) {
            console.warn('[PlaybackContext] Error checking current sound status:', err);
          }
        }

        // [PlaybackContext] Stopping playback to load new recording: recording.id
        await stopPlayback();

        await new Promise((resolve) => setTimeout(resolve, 100)); // 100 ms delay
        // [PlaybackContext] Setting selected recording: recording.id
        setSelectedRecordingWithLog(recording);

        try {
          const fileInfo = await FileSystem.getInfoAsync(recording.uri);
          if (!fileInfo.exists || fileInfo.size === 0) {
            console.warn('[PlaybackContext] Invalid file info:', fileInfo);
            setIsPlaying(false);
            isPlayInProgressRef.current = false;
            return;
          }
        } catch (err) {
          console.warn('[PlaybackContext] Error fetching file info:', err);
          setIsPlaying(false);
          isPlayInProgressRef.current = false;
          return;
        }

        const stable = await waitForFileStability(recording.uri);
        if (!stable) {
          console.warn('[PlaybackContext] File not stable yet:', recording.uri);
          setIsPlaying(false);
          isPlayInProgressRef.current = false;
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 400)); // Wait a bit

        // Ensure audio mode is properly configured for playback
        try {
          console.log('[PlaybackContext] Configuring audio mode for playback');
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: false,
            playThroughEarpieceAndroid: false,
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          });
        } catch (audioModeError) {
          console.warn('[PlaybackContext] Error setting audio mode for playback:', audioModeError);
        }

        // [PlaybackContext] Starting playback for recording: recording.id
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: recording.uri },
            {
              shouldPlay: true,
              volume: 1.0,
              rate: 1.0,
              shouldCorrectPitch: false,
            }
          );
          soundRef.current = sound;
          setIsPlaying(true);
          // Ensure volume is set to maximum
          await soundRef.current.setVolumeAsync(1.0);

          sound.setOnPlaybackStatusUpdate(async (status: AVPlaybackStatus) => {
            // DEBUG: Always log status updates (no transcript)
            console.log('[PlaybackContext] onPlaybackStatusUpdate', {
              status,
              isPlaylistPlaying,
              playlistQueue: playlistQueue.map(r => ({ id: r.id, title: r.title })),
              playlistIndex,
              selectedRecording: selectedRecording ? { id: selectedRecording.id, title: selectedRecording.title } : null,
            });
            if (!status.isLoaded) {
              setIsPlaying(false);
              return;
            }
            setPosition(status.positionMillis / 1000);
            setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
            setIsPlaying((prev) => (prev !== status.isPlaying ? status.isPlaying : prev));

            // If playback finished, always increment views
            if (status.didJustFinish && !playbackFinished) {
              playbackFinished = true;
              const newViews = typeof recording.views === 'number' ? recording.views + 1 : 1;
              await updateRecording(recording.id, { views: newViews });
              setIsPlaying(false);
              setPosition(0);
              sound.unloadAsync().catch(() => {});
              soundRef.current = null;
              // Auto-advance if in playlist mode
              console.log('[PlaybackContext] didJustFinish', {
                isPlaylistPlaying,
                playlistQueue,
                playlistIndex,
              });
              if (isPlaylistPlaying && playlistQueue.length > 0) {
                const nextIndex = playlistIndex + 1;
                if (nextIndex < playlistQueue.length) {
                  // There are more recordings: advance to next
                  console.log('[PlaybackContext] setPlaylistIndex', { nextIndex, playlistQueue });
                  setPlaylistIndex(nextIndex);
                  // Playback of next recording will be triggered by useEffect below
                } else {
                  // End of playlist: robustly reset all playlist state
                  setPlaylistIndex(0);
                  setSelectedRecordingWithLog(null);
                  setIsPlaylistPlaying(false);
                  setPlaylistQueue([]);
                  setActivePlaylistId(null);
                }
              }
            }
          });
        } catch (err) {
          console.warn('[PlaybackContext] Error starting playback:', err);
          setIsPlaying(false);
        }
      } finally {
        isPlayInProgressRef.current = false;
      }
    },
    [stopPlayback, waitForFileStability, setSelectedRecordingWithLog]
  );

  // Keep playRecording ref up to date (fix: move outside callback)
  React.useEffect(() => {
    playRecordingRef.current = playRecording;
  }, [playRecording]);

  const pausePlayback = useCallback(async () => {
    if (soundRef.current) {
      try {
        // [PlaybackContext] pausePlayback called
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } catch (e) {
        console.warn('[PlaybackContext] pausePlayback error:', e);
      }
    } else {
      // [PlaybackContext] pausePlayback called but soundRef is null
    }
  }, []);

  const skipBy = useCallback(async (seconds: number) => {
    if (soundRef.current) {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          let newPosition = status.positionMillis + seconds * 1000;
          newPosition = Math.max(0, Math.min(newPosition, status.durationMillis ?? 0));
          await soundRef.current.setPositionAsync(newPosition);
          setPosition(newPosition / 1000);
          console.log('[PlaybackContext] Skipped to position (s):', newPosition / 1000);
        }
      } catch (e) {
        console.warn('[PlaybackContext] skipBy error:', e);
      }
    }
  }, []);

  // Define playPlaylist after playRecording is defined
  const playPlaylist = useCallback(
    async (queue: Encounter[], playlistId?: string) => {
      console.log('[PlaybackContext] playPlaylist called', { queue, playlistId });
      if (!queue || queue.length === 0) return;
      // Robustly reset all playlist state before starting
      setPlaylistQueue([]);
      setPlaylistIndex(0);
      setIsPlaylistPlaying(false);
      setActivePlaylistId(null);
      // Now set up new playlist
      setTimeout(() => {
        setPlaylistQueue(queue);
        setPlaylistIndex(0);
        setIsPlaylistPlaying(true);
        if (playlistId) setActivePlaylistId(playlistId);
        else setActivePlaylistId(null);
        if (playRecordingRef.current) {
          playRecordingRef.current(queue[0]);
        }
      }, 0);
    },
    []
  );

  // Auto-advance playlist: when playlistIndex changes, play the next recording
  useEffect(() => {
    console.log('[PlaybackContext] useEffect playlistIndex:', {
      isPlaylistPlaying,
      playlistQueueLength: playlistQueue.length,
      playlistIndex,
      playlistQueue: playlistQueue.map(r => ({ id: r.id, title: r.title })),
      selectedRecording: selectedRecording ? { id: selectedRecording.id, title: selectedRecording.title } : null,
      activePlaylistId,
    });
    if (isPlaylistPlaying && playlistQueue.length > 0 && playlistIndex < playlistQueue.length) {
      if (playlistIndex !== 0) { // skip initial trigger
        console.log('[PlaybackContext] Auto-advance: playing next recording', playlistQueue[playlistIndex]);
        // Ensure activePlaylistId is preserved for auto-advance
        setActivePlaylistId((prev) => prev); // no-op, but ensures closure
        playRecording(playlistQueue[playlistIndex]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistIndex]);

  useEffect(() => {
    async function configureAudioMode() {
      try {
        console.log('[PlaybackContext] Configuring audio mode for playback');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        });
      } catch (e) {
        console.warn('[PlaybackContext] Error configuring audio mode:', e);
      }
    }
    configureAudioMode();
  }, []);

  useEffect(() => {
    return () => {
      console.log('[PlaybackContext] PlaybackProvider unmounted: stopping playback and resetting state');
      stopPlayback();
    };
  }, [stopPlayback]);

  return (
    <PlaybackContext.Provider
      value={{
        recordings,
        selectedRecording,
        isPlaying,
        position,
        duration,
        playRecording,
        playPlaylist,
        pausePlayback,
        skipBy,
        setSelectedRecording: setSelectedRecordingWithLog,
        stopPlayback,
        playlistQueue,
        playlistIndex,
        isPlaylistPlaying,
        activePlaylistId,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
}
