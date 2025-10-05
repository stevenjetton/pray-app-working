import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

Dimensions.get('window');
const FULL_DRAWER_HEIGHT = 220; // Reduced from 280
const PARTIAL_DRAWER_HEIGHT = 110; // Reduced from 140

type Props = {
  visible: boolean;
  isRecording: boolean; // New prop to differentiate states
  recordingNumber: number;
  duration: number; // in seconds
  onStart: () => void; // New prop for starting recording
  onStop: () => void;
  onCancel: () => void;
};

export function RecordingDrawer({ visible, isRecording, recordingNumber, duration, onStart, onStop, onCancel }: Props) {
  const getDrawerHeight = () => isRecording ? FULL_DRAWER_HEIGHT : PARTIAL_DRAWER_HEIGHT;
  
  // Initialize slideAnim to 0 if visible is true (for always-visible drawer)
  const slideAnim = useRef(new Animated.Value(visible ? 0 : FULL_DRAWER_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Voice visualization animation
  const [voiceAnimVals] = useState<Animated.Value[]>(
    Array.from({ length: 20 }, () => new Animated.Value(0.2))
  );
  
  // Track animation timeouts and states for cleanup
  const animationTimeouts = useRef<NodeJS.Timeout[]>([]);
  const animationCallbacks = useRef<(() => void)[]>([]);
  const isAnimating = useRef(false);

  // Gesture handling for manual sliding
  const [, setIsMinimized] = useState(false);
  const gestureTranslateY = useRef(new Animated.Value(0)).current;

  // Cleanup function for animations
  const stopAllAnimations = () => {
    isAnimating.current = false;
    
    // Clear all timeouts
    animationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    animationTimeouts.current = [];
    
    // Stop all animated values
    voiceAnimVals.forEach(val => {
      val.stopAnimation();
      val.setValue(0.2);
    });
    
    // Clear animation callbacks
    animationCallbacks.current = [];
  };

  // Handle pan gesture for manual sliding
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: gestureTranslateY } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;
      const currentHeight = getDrawerHeight();
      
      // Determine if should minimize or restore based on gesture
      const shouldMinimize = translationY > currentHeight * 0.3 || velocityY > 500;
      
      if (shouldMinimize && !isRecording) {
        // Minimize drawer (but keep a small portion visible)
        setIsMinimized(true);
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: currentHeight - 60, // Show just the handle and part of button
            useNativeDriver: false,
            tension: 100,
            friction: 8,
          }),
          Animated.spring(gestureTranslateY, {
            toValue: 0,
            useNativeDriver: false,
          }),
        ]).start();
      } else {
        // Restore to full view
        setIsMinimized(false);
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: false,
            tension: 100,
            friction: 8,
          }),
          Animated.spring(gestureTranslateY, {
            toValue: 0,
            useNativeDriver: false,
          }),
        ]).start();
      }
    }
  };

  useEffect(() => {
    if (visible) {
      // Always ensure drawer is visible with smooth animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();

      // Start voice animation only when recording
      if (isRecording && !isAnimating.current) {
        isAnimating.current = true;
        
        voiceAnimVals.forEach((val, i) => {
          const animateBar = () => {
            if (!isAnimating.current || !visible || !isRecording) return;
            
            const animation = Animated.sequence([
              Animated.timing(val, {
                toValue: Math.random() * 0.8 + 0.2,
                duration: 150 + Math.random() * 200,
                useNativeDriver: true,
              }),
              Animated.timing(val, {
                toValue: 0.1 + Math.random() * 0.3,
                duration: 150 + Math.random() * 200,
                useNativeDriver: true,
              }),
            ]);
            
            animationCallbacks.current.push(() => animateBar());
            animation.start((finished) => {
              if (finished && isAnimating.current && visible && isRecording) {
                animateBar();
              }
            });
          };
          
          const timeout = setTimeout(animateBar, i * 50);
          animationTimeouts.current.push(timeout);
        });
      }
    } else {
      // Slide down animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: getDrawerHeight(),
          useNativeDriver: false,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Stop voice animation
      stopAllAnimations();
    }

    // Stop animations when not recording
    if (!isRecording) {
      stopAllAnimations();
    }
  }, [visible, isRecording, slideAnim, backdropOpacity, voiceAnimVals, getDrawerHeight]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllAnimations();
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onStop();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel();
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Backdrop - only show when recording */}
      {isRecording && (
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity }
          ]}
        />
      )}

      {/* Drawer */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        enabled={!isRecording} // Only allow gesture when not recording
      >
        <Animated.View
          style={[
            styles.drawer,
            {
              height: getDrawerHeight(),
              transform: [
                { translateY: slideAnim },
                { translateY: gestureTranslateY }
              ]
            }
          ]}
        >
            {/* Handle */}
            <View style={styles.handle} />

            {!isRecording ? (
              // Pre-recording state: Just show record button
              <View style={styles.preRecordingContainer}>
                <TouchableOpacity
                  style={styles.startRecordButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onStart();
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.recordDot} />
                </TouchableOpacity>
              </View>
            ) : (
            // Recording state: Show full interface
            <>
              {/* Title */}
              <Text style={styles.title}>New Recording #{recordingNumber}</Text>

              {/* Duration */}
              <Text style={styles.duration}>{formatDuration(duration)}</Text>

              {/* Voice Visualization */}
              <View style={styles.voiceContainer}>
                {voiceAnimVals.map((val, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.voiceBar,
                      {
                        transform: [{ scaleY: val }]
                      }
                    ]}
                  />
                ))}
              </View>

              {/* Controls */}
              <View style={styles.controlsContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#666" />
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.stopButton}
                  onPress={handleStop}
                  activeOpacity={0.8}
                >
                  <View style={styles.stopIcon} />
                  <Text style={styles.stopText}>Stop</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000, // Above content but below modals
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -1000, // Cover entire screen above drawer
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    backgroundColor: '#f8f9fa', // Slightly off-white
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 34, // Safe area bottom
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 8,
  },
  duration: {
    fontSize: 32,
    fontWeight: '300',
    textAlign: 'center',
    color: '#e53935',
    fontVariant: ['tabular-nums'],
    marginBottom: 24,
  },
  voiceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 60,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  voiceBar: {
    width: 4,
    height: 50,
    backgroundColor: '#e53935',
    marginHorizontal: 1,
    borderRadius: 2,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  stopButton: {
    backgroundColor: '#e53935',
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stopIcon: {
    width: 20,
    height: 20,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  stopText: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
    fontWeight: '500',
  },
  preRecordingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 20, // Equal spacing above and below
  },
  readyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  startRecordButton: {
    width: 40, // Half the original size (was 80)
    height: 40, // Half the original size (was 80)
    borderRadius: 20, // Half the original radius (was 40)
    backgroundColor: '#e53935',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e53935',
    shadowOffset: { width: 0, height: 2 }, // Reduced shadow offset
    shadowOpacity: 0.3,
    shadowRadius: 4, // Reduced shadow radius
    elevation: 4, // Reduced elevation
  },
  recordDot: {
    width: 16, // Slightly larger to accommodate border
    height: 16, // Slightly larger to accommodate border
    borderRadius: 8, // Half of width/height
    backgroundColor: 'transparent', // No fill
    borderWidth: 2, // White border
    borderColor: '#fff',
  },
  preRecordCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});