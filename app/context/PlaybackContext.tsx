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
  pausePlayback: () => Promise<void>;
  skipBy: (seconds: number) => Promise<void>;
  setSelectedRecording: (recording: Encounter | null) => void;
  stopPlayback: () => Promise<void>;
};

const PlaybackContext = createContext<PlaybackContextType | undefined>(undefined);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const { recordings, updateRecording } = useRecordings();
  const [selectedRecording, setSelectedRecording] = useState<Encounter | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const isPlayInProgressRef = useRef(false);

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

  const playRecording = useCallback(
    async (recording: Encounter) => {
  // [PlaybackContext] playRecording called: recording.id

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

  // [PlaybackContext] Starting playback for recording: recording.id
        try {
          const { sound } = await Audio.Sound.createAsync({ uri: recording.uri }, { shouldPlay: true });
          soundRef.current = sound;
          setIsPlaying(true);
          await soundRef.current.setVolumeAsync(1.0);

          sound.setOnPlaybackStatusUpdate(async (status: AVPlaybackStatus) => {
            if (!status.isLoaded) {
              setIsPlaying(false);
              return;
            }
            setPosition(status.positionMillis / 1000);
            setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
            setIsPlaying((prev) => (prev !== status.isPlaying ? status.isPlaying : prev));

            // Track playback duration (optional, can be removed if not needed)
            if (status.durationMillis) {
            }
            // If playback finished, always increment views
            if (status.didJustFinish && !playbackFinished) {
              playbackFinished = true;
              const newViews = typeof recording.views === 'number' ? recording.views + 1 : 1;
              await updateRecording(recording.id, { views: newViews });
              setIsPlaying(false);
              setPosition(0);
              sound.unloadAsync().catch(() => {});
              soundRef.current = null;
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

  useEffect(() => {
    async function configureAudioMode() {
      try {
        console.log('[PlaybackContext] Configuring audio mode for playback');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        });
      } catch (e) {
        console.warn('[PlaybackContext] Error configuring audio mode:', e);
      }
    }
    configureAudioMode();
  }, []);

  useEffect(() => {
    return () => {
      console.log('[PlaybackContext] Component unmount cleanup: stopping playback');
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
        pausePlayback,
        skipBy,
        setSelectedRecording: setSelectedRecordingWithLog,
        stopPlayback,
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
