import { PlaybackProgressRow } from '@/components/playback/PlaybackProgressRow';
import TagIcon from '@/components/ui/TagIcon';
import { usePlayback } from '@/context/PlaybackContext';
import { Encounter } from '@/types/Encounter';

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface PlaybackBarProps {
  recording: Encounter;
  onView?: () => void;
  onMenu?: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  onTogglePlayPause?: () => void | Promise<void>;
}

export const PlaybackBar: React.FC<PlaybackBarProps> = ({
  recording,
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
  } = usePlayback();

  const [fileDuration, setFileDuration] = useState<number | null>(
    typeof recording.duration === 'number' && recording.duration > 0
      ? recording.duration
      : null
  );
  const [durationLoading, setDurationLoading] = useState(false);
  const [durationError, setDurationError] = useState<string | null>(null);

  const [isBusy, setIsBusy] = useState(false);
  const tapCount = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function getDuration() {
      setDurationError(null);
      if (
        !recording.uri ||
        (typeof ctxDuration === 'number' && ctxDuration > 0) ||
        (typeof fileDuration === 'number' && fileDuration > 0)
      ) {
  // [PlaybackBar] Skipping duration fetch: Already set or no URI
        return;
      }
      try {
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
  }, [recording.uri, ctxDuration]);

  if (!selectedRecording || selectedRecording.id !== recording.id) {
  // [PlaybackBar] Not the selected recording - UI hidden
    return null;
  }

  const durationToDisplay =
    typeof ctxDuration === 'number' && ctxDuration > 0
      ? ctxDuration
      : typeof fileDuration === 'number' && fileDuration > 0
      ? fileDuration
      : null;

  const positionToDisplay =
    typeof position === 'number' && durationToDisplay ? position : 0;

  // ...removed manual slider state and pan responder...

  const handlePlayPause = async () => {
    tapCount.current++;
  // [PlaybackBar] PlayPause Button Pressed

    if (isBusy) {
  // [PlaybackBar] Ignoring play/pause: busy
      return;
    }

    if (!recording.uri) {
  // [PlaybackBar] Ignoring play/pause: Missing recording URI
      return;
    }

    setIsBusy(true);
    try {
      if (onTogglePlayPause) {
        // [PlaybackBar] Using external onTogglePlayPause
        await Promise.resolve(onTogglePlayPause());
      } else {
        if (selectedRecording?.id === recording.id) {
          if (isPlaying) {
            // [PlaybackBar] pausePlayback called
            await pausePlayback();
          } else {
            // [PlaybackBar] playRecording called (resume)
            await playRecording(recording);
          }
        } else {
          // [PlaybackBar] playRecording called (new recording)
          await playRecording(recording);
        }
      }
    } catch (err) {
      // [PlaybackBar] Error in play/pause
      // Optional: handle error silently or surface to user as needed
    } finally {
      setIsBusy(false);
      // [PlaybackBar] PlayPause Button Handler Complete
    }
  };

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
          onPress={handlePlayPause}
          disabled={isBusy}
          accessibilityLabel={isPlaying ? 'Pause playback' : 'Play recording'}
          accessibilityRole="button"
        >
          <TagIcon
            icon={isPlaying ? 'pause-circle' : 'play-circle'}
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
