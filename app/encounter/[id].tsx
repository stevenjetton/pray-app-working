import { usePlayback } from '@/context/PlaybackContext';
import { useRecordings } from '@/context/RecordingContext';
import * as LocalService from '@/services/localRecordingService';
import type { Encounter } from '@/types/Encounter';
import { formatDateForDisplay } from '@/utils/dateHelpers';
import { transcribeAudioFile } from '@/utils/transcribeAudioFile';
import { PlaybackDrawer as RawPlaybackDrawer } from '@components/recording/PlaybackDrawer';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Read Meter constants
const READ_TIME_THRESHOLD = 10; // seconds
const SCROLL_THRESHOLD = 0.5; // 50%

import { ScriptureTaggedText } from '@/components/ui/ScriptureTaggedText';
import { useTags } from '@/context/TagsContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

export default function EncounterDetailScreen() {



  // All hooks and state declarations at the top

  // All hooks and state declarations at the very top
  const { tags } = useTags();
  const PlaybackDrawer = React.memo(RawPlaybackDrawer);
  const router = useRouter();
  const navigation = useNavigation();
  const { recordings, updateRecording, deleteRecording } = useRecordings();
  const {
    selectedRecording,
    setSelectedRecording,
    pausePlayback,
    isPlaying,
    playRecording,
  } = usePlayback();

  const [recording, setRecording] = useState<Encounter | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTranscription, setEditingTranscription] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const isPlayPauseInProgressRef = useRef(false);
  const params = useLocalSearchParams<{ id?: string; search?: string }>();
  const id = params.id ?? '';
  const search = params.search ?? '';
  // Header: show only back arrow, no title or back label
  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerTitle: () => null,
      headerBackTitleVisible: false,
    });
  }, [navigation]);


  // Read Meter state
  const [readTime, setReadTime] = useState(0);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [viewCounted, setViewCounted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useFocusEffect(
    useCallback(() => {
      return () => {
        pausePlayback();
      };
    }, [pausePlayback])
  );

  useEffect(() => {
    setLoading(true);
    let cancelled = false;
    let hasSetSelectedRecording = false;
    async function fetchRecording() {
      let rec = recordings.find(r => r.id === id);
      if (!rec) {
        rec = await LocalService.getRecordingById(String(id));
      }
      if (cancelled) return;
      if (rec) {
        setRecording(rec);
        setTranscriptionText(rec.localTranscription || '');
        if (
          !hasSetSelectedRecording &&
          (!selectedRecording || selectedRecording.id !== rec.id)
        ) {
          setSelectedRecording?.(rec);
          hasSetSelectedRecording = true;
        }
      } else {
        setRecording(null);
      }
      setLoading(false);
    }
    if (id) fetchRecording();
    return () => {
      cancelled = true;
    };
  }, [id, recordings, selectedRecording, setSelectedRecording]);

  // Read Meter timer
  useEffect(() => {
    if (viewCounted || loading) return;
    timerRef.current = setInterval(() => {
      setReadTime(t => t + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [viewCounted, loading]);

  // When either threshold is met, count as viewed
  useEffect(() => {
    if (!viewCounted && recording && updateRecording) {
      if (readTime >= READ_TIME_THRESHOLD || scrollPercent >= SCROLL_THRESHOLD) {
        setViewCounted(true);
        const newViews = typeof recording.views === 'number' ? recording.views + 1 : 1;
        updateRecording(recording.id, { views: newViews });
      }
    }
  }, [readTime, scrollPercent, viewCounted, recording, updateRecording]);

  // Handle scroll event for scroll-based read meter
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const visibleHeight = layoutMeasurement.height;
    const totalHeight = contentSize.height;
    const yOffset = contentOffset.y;
    const percent = totalHeight > 0 ? Math.min(1, (yOffset + visibleHeight) / totalHeight) : 0;
    setScrollPercent(percent);
  };

  const clearSearch = () => {
  router.replace({ pathname: `/encounter/${id}` });
  };

  function startEditTranscription() {
    setTranscriptionText(recording?.localTranscription || '');
    setEditingTranscription(true);
  }

  async function saveTranscription() {
    if (recording) {
      await updateRecording(recording.id, { localTranscription: transcriptionText });
      setEditingTranscription(false);
      setRecording({ ...recording, localTranscription: transcriptionText });
    }
  }

  async function handleTranscribe() {
    if (!recording?.uri) {
      Alert.alert('Error', 'No local audio file found for this recording.');
      return;
    }
    try {
      setTranscribing(true);
      const transcript = await transcribeAudioFile(recording.uri);
      if (transcript) {
        await updateRecording(recording.id, { localTranscription: transcript });
        setRecording({ ...recording, localTranscription: transcript });
        setTranscriptionText(transcript);
      } else {
        Alert.alert('Transcription Failed', 'No transcript was returned.');
      }
    } catch (err: any) {
      Alert.alert('Transcription Error', err?.message || 'Failed to transcribe audio.');
    } finally {
      setTranscribing(false);
    }
  }

  const togglePlayPause = useCallback(async () => {
    if (isPlayPauseInProgressRef.current) return;
    isPlayPauseInProgressRef.current = true;
    try {
      if (!recording) return;
      if (selectedRecording?.id === recording.id) {
        if (isPlaying) {
          await pausePlayback();
        } else {
          await playRecording(recording);
        }
      } else {
        await playRecording(recording);
      }
    } finally {
      setTimeout(() => {
        isPlayPauseInProgressRef.current = false;
      }, 500);
    }
  }, [isPlaying, pausePlayback, playRecording, recording, selectedRecording]);

  // Loader/null checks must be after all declarations
  if (loading) {
    return <ActivityIndicator style={{ flex: 1, marginTop: 40 }} />;
  }

  if (!recording) {
    return <Text style={{ padding: 20 }}>Encounter not found.</Text>;
  }

  if (loading) {
    return <ActivityIndicator style={{ flex: 1, marginTop: 40 }} />;
  }

  if (!recording) {
    return <Text style={{ padding: 20 }}>Encounter not found.</Text>;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Clear Search Button - only shows if search is active */}
        {search && search.trim() !== '' && (
          <View style={styles.clearSearchContainer}>
            <TouchableOpacity
              onPress={clearSearch}
              style={styles.clearSearchButton}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <Text style={styles.clearSearchText}>Clear Search ✕</Text>
            </TouchableOpacity>
          </View>
        )}

  <Text style={styles.title}>{recording!.title}</Text>
        <View style={styles.centeredTopSection}>
          <Text style={styles.date}>
            {formatDateForDisplay(
              recording!.createdDate ?? 'Manually Enter Date in this audio recroding in Edit > Date Picker.'
            )}
          </Text>
          {Array.isArray(recording!.tags) && recording!.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {recording!.tags.map(tagId => {
                const tagObj = tags.find(t => t.id === tagId);
                return (
                  <View key={tagId} style={[styles.tagChip, tagObj?.color ? { backgroundColor: tagObj.color } : {}]}>
                    <Text style={styles.tagText}>
                      {tagObj ? tagObj.label : 'Deleted Tag'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          <Text style={styles.place}>{recording!.place || ''}</Text>
        </View>

        {/* Playback Area */}
        <View style={styles.audioPlayerContainer}>
          <PlaybackDrawer
            recording={recording!}
            open={true}
            showToggle={false}
            onDelete={() => deleteRecording(recording!.id)}
            showTranscription={false}
            onTogglePlayPause={togglePlayPause}
          />
        </View>

        {/* Transcription Section */}
        <View style={{ width: '100%', marginTop: 32 }}>
          {editingTranscription ? (
            <>
              <TextInput
                style={styles.textInput}
                multiline
                value={transcriptionText}
                onChangeText={setTranscriptionText}
                placeholder="Type or paste transcription here..."
                autoFocus
                textAlignVertical="top"
                scrollEnabled
              />
              <View style={styles.transcriptionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setEditingTranscription(false)}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={saveTranscription}
                >
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.transcriptionText}>
                {recording!.localTranscription ? (
                  <ScriptureTaggedText
                    text={recording!.localTranscription}
                    highlightWords={search ? [search.trim()] : []}
                    highlightStyle={{ backgroundColor: 'yellow' }}
                  />
                ) : (
                  <Text style={styles.placeholderText}>No transcription yet.</Text>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={startEditTranscription}
                  accessibilityLabel="Edit transcription"
                >
                  <MaterialIcons name="edit" size={18} color="#888" />
                </TouchableOpacity>
                {(!recording!.localTranscription || !recording!.localTranscription.trim()) && (
                  <TouchableOpacity
                    style={styles.transcribeButton}
                    onPress={handleTranscribe}
                    disabled={transcribing}
                  >
                    {transcribing ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.transcribeButtonText}>Transcribe</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  readMeterBarContainer: {
    height: 6,
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  readMeterBar: {
    height: 6,
    borderRadius: 3,
  },
  container: { padding: 20, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  centeredTopSection: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  date: {
    fontSize: 14,
    color: 'black',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    marginTop: 0,
    width: '100%',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 2,
    backgroundColor: '#1976d2',
  },
  tagText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  place: { fontSize: 15, color: '#4d4d4d', marginBottom: 18 },
  audioPlayerContainer: {
    width: '100%',
    maxWidth: '100%',
    borderRadius: 12,
    padding: 0,
    marginTop: 0,
    elevation: 2,
  },
  textInput: {
    minHeight: 100,
    borderColor: '#bbb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  transcriptionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#bbb',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  cancelText: { color: '#222', fontWeight: 'bold', fontSize: 14 },
  saveButton: {
    backgroundColor: 'black',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  transcriptionText: { minHeight: 40, width: '100%' },
  placeholderText: { color: '#aaa' },
  editButton: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  transcribeButton: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  transcribeButtonText: { color: '#fff', fontWeight: 'bold' },
  clearSearchContainer: {
    alignItems: 'flex-end',
    marginVertical: 8,
    marginRight: 10,
  },
  clearSearchButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#e0f0ff',
  },
  clearSearchText: {
    color: '#007aff',
    fontWeight: '600',
    fontSize: 14,
  },
});
