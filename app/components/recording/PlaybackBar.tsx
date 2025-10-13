import { PlaybackProgressRow } from '@/components/playback/PlaybackProgressRow';
import TagIcon from '@/components/ui/TagIcon';
import { usePlayback } from '@/context/PlaybackContext';
import { Encounter } from '@/types/Encounter';

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface PlaybackBarProps {
  recording: Encounter | null;
  playlistRecordings?: Encounter[];
  isThisPlaylistPlaying?: boolean;
  onView?: () => void;
  onMenu?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  onTogglePlayPause?: () => void | Promise<void>;
}

export const PlaybackBar: React.FC<PlaybackBarProps> = ({
  recording,
  playlistRecordings,
  isThisPlaylistPlaying,
  onView,
  onMenu,
  onDelete,
  showDelete = false,
  onTogglePlayPause,
}) => {
  const {
    selectedRecording,
    isPlaying,
    playRecording,
    pausePlayback,
    skipBy,
    duration: ctxDuration,
    position,
    // @ts-ignore
    setActivePlaylistId,
  } = usePlayback();

  // Debug: log props and context on every render
  React.useEffect(() => {
    console.log('[PlaybackBar] Render', {
      recording,
      playlistRecordings,
      selectedRecording,
      isPlaying,
      isThisPlaylistPlaying,
    });
  });

  const [fileDuration, setFileDuration] = useState<number | null>(
    recording && typeof recording.duration === 'number' && recording.duration > 0
      ? recording.duration
      : null
  );
  const [durationLoading, setDurationLoading] = useState(false);
  const [durationError, setDurationError] = useState<string | null>(null);

  const [isBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function getDuration() {
      setDurationError(null);
      if (
        !recording ||
        !recording.uri ||
        (typeof ctxDuration === 'number' && ctxDuration > 0) ||
        (typeof fileDuration === 'number' && fileDuration > 0)
      ) {
        // [PlaybackBar] Skipping duration fetch: Already set or no URI
        return;
      }
      try {
        if (!recording) return;
        const info = await FileSystem.getInfoAsync(recording.uri);
  // [PlaybackBar] File info: info
        if (!info.exists) {
          setDurationError('Audio file not found');
          // [PlaybackBar] Audio file not found: recording.uri
          return;
        }
        setDurationLoading(true);
        try {
          const { sound, status } = await Audio.Sound.createAsync(
            { uri: recording.uri },
            { shouldPlay: false }
          );
          // [PlaybackBar] Sound fetched, status: status
          if (
            !cancelled &&
            status.isLoaded &&
            typeof status.durationMillis === 'number'
          ) {
            setFileDuration(status.durationMillis / 1000);
            // [PlaybackBar] File duration set: status.durationMillis / 1000
          } else if (!cancelled) {
            setDurationError('Duration unavailable');
            // [PlaybackBar] Duration unavailable - not loaded
          }
          await sound.unloadAsync();
        } catch (err) {
          if (!cancelled) {
            setDurationError('Duration unavailable');
            // [PlaybackBar] Duration unavailable - sound error
          }
        }
      } catch (err) {
        setDurationError('Duration unavailable');
  // [PlaybackBar] Duration fetch failed
      } finally {
        if (!cancelled) setDurationLoading(false);
      }
    }
    getDuration();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line
  }, [recording && recording.uri, ctxDuration]);

  if (!recording) {
    // No recording available, show nothing
    return null;
  }

  // If isThisPlaylistPlaying is undefined, treat as always active (for encounter/playback screens)
  const active = isThisPlaylistPlaying === undefined ? true : isThisPlaylistPlaying;
  const durationToDisplay = active
    ? (typeof ctxDuration === 'number' && ctxDuration > 0
        ? ctxDuration
        : typeof fileDuration === 'number' && fileDuration > 0
        ? fileDuration
        : null)
    : (typeof fileDuration === 'number' && fileDuration > 0 ? fileDuration : null);

  const positionToDisplay = active
    ? (typeof position === 'number' && durationToDisplay ? position : 0)
    : 0;

  // ...removed manual slider state and pan responder...


  const handleSkip = async (seconds: number) => {
  // [PlaybackBar] Skip button pressed, seconds: seconds
    try {
      await skipBy(seconds);
    } catch (err) {
      // [PlaybackBar] Skip error
    }
  };

  return (
  <View style={styles.wrapper}> 
      {/* Only the interactive PlaybackProgressRow will be shown below */}
      {isThisPlaylistPlaying && (
        <Text style={{ color: '#1976d2', fontWeight: 'bold', marginBottom: 2 }}>Now Playing</Text>
      )}
      <PlaybackProgressRow
        position={positionToDisplay}
        duration={durationToDisplay ?? undefined}
        loading={durationLoading}
        error={!!durationError}
        onSeek={async (seconds) => {
          if (typeof seconds === 'number' && !isNaN(seconds)) {
            try {
              await skipBy(seconds - positionToDisplay);
            } catch {}
          }
        }}
      />

      <View style={styles.controlsRow}>
        {onView && (
          <TouchableOpacity onPress={onView}>
            <TagIcon icon="eye" size={24} color="#000" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => {
            handleSkip(-15);
          }}
          style={styles.circleButton}
        >
          <View style={styles.circleInner}>
            <TagIcon
              icon="reload"
              size={38}
              color="#000"
              style={{ transform: [{ scaleX: -1 }] }}
            />
            <Text style={styles.circleText}>15</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onTogglePlayPause || (async () => {
            if (isBusy) return;
            if (!recording || !recording.uri) return;
            // Only clear activePlaylistId if not in a playlist context
            if (setActivePlaylistId && isThisPlaylistPlaying === undefined) setActivePlaylistId(null);
            if (isPlaying) {
              await pausePlayback();
            } else {
              await playRecording(recording);
            }
          })}
          disabled={isBusy}
          accessibilityLabel={active && isPlaying ? 'Pause playback' : 'Play recording'}
          accessibilityRole="button"
        >
          <TagIcon
            icon={active && isPlaying ? 'pause-circle' : 'play-circle'}
            size={48}
            color={isBusy ? '#888' : '#000'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            handleSkip(15);
          }}
          style={styles.circleButton}
        >
          <View style={styles.circleInner}>
            <TagIcon icon="reload" size={38} color="#000" />
            <Text style={styles.circleText}>15</Text>
          </View>
        </TouchableOpacity>

        {onMenu && (
          <TouchableOpacity onPress={onMenu}>
            <TagIcon
              icon="more-vert"
              iconFamily="MaterialIcons"
              size={24}
              color="#444"
            />
          </TouchableOpacity>
        )}

        {showDelete && onDelete && (
          <TouchableOpacity onPress={onDelete}>
            <TagIcon icon="trash" size={28} color="#e74c3c" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    padding: 16,
    // backgroundColor: '#fff',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  circleButton: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInner: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circleText: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -7 }, { translateY: -7 }],
    color: '#000',
    fontWeight: 'bold',
    fontSize: 10,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
