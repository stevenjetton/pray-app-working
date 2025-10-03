import { usePlayback } from '@/context/PlaybackContext';
import EditRecordingForm from '@components/recording/EditRecordingForm';
import { useRecordings } from '@context/RecordingContext';
import { Audio as ExpoAudio } from 'expo-av';

import * as FileSystem from 'expo-file-system';

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTags } from '@/context/TagsContext';
import type { Encounter } from '@/types/Encounter';
import type { Tag } from '@/types/Tags';

// Async function to add a custom tag - replace with your actual implementation
const addCustomTag = async (label: string): Promise<Tag> => {
  return {
    id: `custom-${Date.now()}`,
    label,
    color: '#007AFF',
    icon: 'tag',
    iconFamily: 'Ionicons',
  };
};

// Wait for file to have stable size before proceeding
async function waitForFileStable(uri: string, maxWaitMs = 3000, intervalMs = 250): Promise<boolean> {
  let lastSize = -1;
  let elapsed = 0;
  while (elapsed < maxWaitMs) {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) return false;
      if (info.size === lastSize && info.size > 0) return true;
      lastSize = info.size;
    } catch {
      return false;
    }
    await new Promise((res) => setTimeout(res, intervalMs));
    elapsed += intervalMs;
  }
  return false;
}

export default function SaveRecordingScreen() {
  const router = useRouter();
  const { addRecording } = useRecordings();
  const params = useLocalSearchParams();
  const { playRecording } = usePlayback();

  const { tags: allTags, loading: tagsLoading } = useTags();

  function getParam(key: string): string {
    const val = params[key];
    if (Array.isArray(val)) return val[0] || '';
    return val || '';
  }

  const uriParam = getParam('uri');
  const initialDuration = getParam('duration');
  const imported = getParam('imported') === 'true';
  const initialTitle = getParam('filename') || '';
  const transcription = getParam('transcription');

  const [title, setTitle] = useState(initialTitle.replace(/\.[^/.]+$/, ''));
  const [place, setPlace] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileUri, setFileUri] = useState(uriParam);
  const [duration, setDuration] = useState(initialDuration ? parseInt(initialDuration, 10) : 0);
  const [checkingFile, setCheckingFile] = useState(imported);
  const [waitError, setWaitError] = useState<string | null>(null);
  const [hasImported, setHasImported] = useState(false);
  const [createdDate, setCreatedDate] = useState<string>(new Date().toISOString());

  useEffect(() => {
    setTags((prev) => prev.filter((tagId) => allTags.some((t) => t.id === tagId)));
  }, [allTags]);

  useEffect(() => {
    let cancelled = false;

    async function ensureFileReadyAndProcess() {
      if (!imported || !fileUri || !fileUri.startsWith('file://')) {
        if (!cancelled) setCheckingFile(false);
        return;
      }
      if (hasImported) {
        if (!cancelled) setCheckingFile(false);
        return;
      }
      if (!cancelled) setCheckingFile(true);

      try {
        let info = await FileSystem.getInfoAsync(fileUri);
        let waited = 0;
        while ((!info.exists || !info.size || info.size === 0) && waited < 15000) {
          await new Promise((res) => setTimeout(res, 1000));
          waited += 1000;
          info = await FileSystem.getInfoAsync(fileUri);
          if (cancelled) return;
        }
        if (cancelled) return;

        if (!info.exists) {
          setWaitError(
            "The selected audio file can't be found. Please ensure the file exists and try again.",
          );
          setCheckingFile(false);
          return;
        }

        if (!info.size || info.size === 0) {
          setWaitError(
            'The file appears to still be downloading from cloud storage. Open it in your Files app and ensure it is fully downloaded to your device, then try again.',
          );
          setCheckingFile(false);
          return;
        }

        const extMatch = fileUri.match(/\.[a-zA-Z0-9]+$/);
        const ext = extMatch ? extMatch[0] : '.m4a';
        const filename = `imported_audio_${Date.now()}${ext}`;
        const destUri = FileSystem.documentDirectory + filename;

        if (fileUri !== destUri) {
          await FileSystem.copyAsync({ from: fileUri, to: destUri });
        }
        if (!cancelled) setFileUri(destUri);

        let fileDuration = duration;
        try {
          const { sound, status } = await ExpoAudio.Sound.createAsync({ uri: destUri });
          if (status.isLoaded && typeof status.durationMillis === 'number') {
            fileDuration = Math.round((status.durationMillis ?? 0) / 1000);
            if (!cancelled) setDuration(fileDuration);
          }
          await sound.unloadAsync();
        } catch {
          // silently ignore import duration errors
        }
        if (!cancelled) setHasImported(true);
      } catch (e: any) {
        if (!cancelled) {
          setWaitError(e?.message || 'Could not read/import the file. Try again or pick a different file.');
          setCheckingFile(false);
        }
      } finally {
        if (!cancelled) setCheckingFile(false);
      }
    }

    ensureFileReadyAndProcess();

    return () => {
      cancelled = true;
    };
  }, [imported, fileUri, hasImported, duration]);

  const toggleTag = (tagId: string) => {
    setTags((prev) => (prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]));
  };

  const handleSave = async () => {
    if (!fileUri) {
      Alert.alert('Error', 'No audio file to save.');
      return;
    }
    setLoading(true);
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists || !fileInfo.size) {
        Alert.alert('File missing', 'The audio file does not exist or is empty.');
        setLoading(false);
        return;
      }

      try {
        // Test loading with expo-av
        const { sound, status } = await ExpoAudio.Sound.createAsync({ uri: fileUri });
        if (!status.isLoaded) {
          Alert.alert('Invalid audio', 'Audio file could not be loaded. Try a supported format.');
          setLoading(false);
          return;
        }
        await sound.unloadAsync();
      } catch {
        Alert.alert('Invalid audio', 'Audio file could not be played or format is unsupported.');
        setLoading(false);
        return;
      }

      const createdDateToUse = imported ? undefined : createdDate;

      // Build newRecording *without* id; addRecording will assign id internally
      const newRecordingData: Omit<Encounter, 'id'> = {
        title: title.trim() || '(untitled recording)',
        place,
        tags,
        duration,
        uri: fileUri,
        localTranscription: transcription,
        imported: !!imported,
        createdDate: createdDateToUse,
      };

      // Add recording and get new instance (with id)
      const addedRecording = await addRecording(newRecordingData);

      if (addedRecording?.uri) {
        // Wait for file size to stabilize before playing
        const stable = await waitForFileStable(addedRecording.uri);
        if (stable) {
          // Slight extra delay to be safe (can tune this)
          await new Promise((res) => setTimeout(res, 350));
          // Play the newly added recording immediately
          await playRecording(addedRecording);
        }
      }

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save recording.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // Removed playback controls by request (no play button shown)

  if (checkingFile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#222" />
        <Text style={{ marginTop: 20, textAlign: 'center' }}>
          Preparing imported file...
          {'\n'}If you just selected a large file from Google Drive or iCloud,
          it may take a moment to finish downloading before import.
        </Text>
        <TouchableOpacity
          onPress={handleCancel}
          style={{ marginTop: 30, backgroundColor: '#ddd', padding: 12, borderRadius: 8 }}
        >
          <Text style={{ color: '#333', textAlign: 'center', fontWeight: 'bold' }}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (waitError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ textAlign: 'center', color: 'red', marginBottom: 30 }}>{waitError}</Text>
        <TouchableOpacity
          onPress={handleCancel}
          style={{ backgroundColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 12 }}
        >
          <Text style={{ color: '#333', textAlign: 'center', fontWeight: 'bold' }}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setWaitError(null);
            setCheckingFile(true);
            setFileUri(uriParam);
            setHasImported(false);
          }}
          style={{ backgroundColor: '#4b94ef', padding: 12, borderRadius: 8 }}
        >
          <Text style={{ color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (tagsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#222" />
        <Text style={{ marginTop: 20, textAlign: 'center' }}>Loading tags...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 100, android: 0 })}
    >
      {/* 
        IMPORTANT:
        Make sure inside your EditRecordingForm component that any ScrollView or FlatList 
        that displays tags has the prop: keyboardShouldPersistTaps="handled"
        This allows taps on tags while keyboard is open without needing to dismiss the keyboard first.
      */}
      <EditRecordingForm
        title={title}
        setTitle={setTitle}
        place={place}
        setPlace={setPlace}
        tags={tags}
        toggleTag={toggleTag}
        defaultTags={allTags}
        onSave={handleSave}
        onCancel={handleCancel}
        loading={loading}
        addCustomTag={addCustomTag}
        createdDate={createdDate}
        setCreatedDate={setCreatedDate}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fafd',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f6fafd',
    padding: 24,
  },
});
