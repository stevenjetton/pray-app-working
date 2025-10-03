import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  recording: boolean;
  loading: boolean;
  onStart: () => void;
  onStop: () => void;
  totalRecordings: number;
  duration: number; // in seconds
};

export function RecordingControls({
  recording,
  loading,
  onStart,
  onStop,
  totalRecordings,
  duration,
}: Props) {
  // Animation for background shift
  const shiftAnim = useRef(new Animated.Value(0)).current;

  // Animate shift up when recording starts
  useEffect(() => {
    Animated.timing(shiftAnim, {
      toValue: recording ? -24 : 0,
      duration: 400,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [recording, shiftAnim]);

  // Voice bar animation
  const [voiceAnimVals] = useState<Animated.Value[]>(
    Array.from({ length: 12 }, () => new Animated.Value(1))
  );
  useEffect(() => {
    if (recording) {
      voiceAnimVals.forEach((val, i) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(val, {
              toValue: Math.random() * 2 + 1,
              duration: 300 + i * 40,
              useNativeDriver: true,
            }),
            Animated.timing(val, {
              toValue: 1,
              duration: 300 + i * 40,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    } else {
      voiceAnimVals.forEach(val => val.setValue(1));
    }
  }, [recording, voiceAnimVals]);

  // Format duration as hh:mm:ss
  const formatDuration = (d: number) => {
    const hours = Math.floor(d / 3600);
    const minutes = Math.floor((d % 3600) / 60);
    const seconds = d % 60;
    const hStr = hours < 10 ? `0${hours}` : `${hours}`;
    const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const sStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `${hStr}:${mStr}:${sStr}`;
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.recordingStatusContainer,
          { transform: [{ translateY: shiftAnim }] },
        ]}
        pointerEvents="none"
      >
        {recording && (
          <>
            <View style={styles.statusBar}>
              <Text style={styles.statusText}>
                New Encounter #{totalRecordings + 1}
              </Text>
              <Text style={styles.durationText}>{formatDuration(duration)}</Text>
            </View>
            <View style={styles.voiceBarContainer}>
              {voiceAnimVals.map((val, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.voiceBar,
                    { transform: [{ scaleY: val }] },
                  ]}
                />
              ))}
            </View>
          </>
        )}
      </Animated.View>

      {/* Record button */}
      <View style={styles.recordButtonContainer}>
        <TouchableOpacity
          style={[
            styles.recordButton,
            recording && styles.recordButtonActive,
          ]}
          onPress={recording ? onStop : onStart}
          disabled={loading}
          activeOpacity={0.8}
        >
          {!recording ? (
            <View style={styles.innerCircle} />
          ) : (
            <View style={styles.stopSquare} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  recordingStatusContainer: {
    alignItems: 'center',
    marginBottom: 0,
    width: '100%',
    minHeight: 0,
    justifyContent: 'flex-end',
  },
  statusBar: {
    backgroundColor: '#f4f4f6',
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 8,
    marginBottom: 2,
    alignItems: 'center',
    shadowColor: '#888',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#333',
    marginBottom: 2,
  },
  durationText: {
    fontSize: 16,
    color: '#e53935',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  voiceBarContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 32,
    marginBottom: 2,
    marginTop: 2,
  },
  voiceBar: {
    width: 5,
    height: 22,
    borderRadius: 4,
    backgroundColor: 'black',
    marginHorizontal: 2,
  },
  recordButtonContainer: {
    alignItems: 'center',
    marginTop: 0,
  },
  recordButton: {
    width: 55,
    height: 55,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#b0b0b0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#888',
    shadowOpacity: 0.18,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    marginBottom: 6,
    elevation: 5,
  },
  recordButtonActive: {
    borderColor: '#e53935',
    backgroundColor: '#fff3f0',
  },
  innerCircle: {
    width: 46,
    height: 46,
    borderRadius: 50,
    backgroundColor: '#e53935',
  },
  stopSquare: {
    width: 36,
    height: 36,
    borderRadius: 2,
    backgroundColor: '#e53935',
  },
});
