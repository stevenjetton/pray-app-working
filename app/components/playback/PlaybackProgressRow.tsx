import React from 'react';
import { StyleSheet, Text, View, type DimensionValue } from 'react-native';



interface PlaybackProgressRowProps {
  /** Current position in seconds */
  position: number;
  /** Total duration in seconds (if known) */
  duration?: number | null;
  /** If true, show ... instead of times while loading */
  loading?: boolean;
  /** If true, show --:-- if duration unavailable */
  error?: boolean;
  /** Called when user seeks (in seconds) */
  onSeek?: (seconds: number) => void | Promise<void>;
}

function formatDuration(seconds?: number | null): string {
  if (seconds == null || isNaN(seconds)) return '--:--';
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export const PlaybackProgressRow: React.FC<PlaybackProgressRowProps> = ({
  position = 0,
  duration = null,
  loading = false,
  error = false,
}) => {
  // Format display strings
  let leftText = formatDuration(position);
  let rightText = '--:--';

  if (loading) {
    leftText = rightText = '...';
  } else if (typeof duration === 'number' && duration > 0) {
    rightText = `-${formatDuration(Math.max(0, duration - position))}`;
  } else if (error) {
    rightText = '--:--';
  }

  // Calculate progress percent and cast for TS style
  const progressPercent =
    typeof duration === 'number' && duration > 0 ? (position / duration) * 100 : 0;
  const widthValue: DimensionValue = `${progressPercent}%`;

  return (
    <View accessible accessibilityLabel="Playback progress bar" style={styles.container}>
      <View style={styles.barContainer}>
        <View style={[styles.barFill, { width: widthValue }]} />
      </View>
      <View style={styles.timesRow}>
        <Text style={styles.time}>{leftText}</Text>
        <Text style={styles.time}>{rightText}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  barContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 3,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  barFill: {
    height: 4,
    backgroundColor: 'black',
    borderRadius: 3,
  },
  timesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  time: {
    fontSize: 13,
    color: '#555',
    fontVariant: ['tabular-nums'],
    minWidth: 50,
    textAlign: 'center',
  },
});
