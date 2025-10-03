import type { Encounter } from '@/types/Encounter';
import EditRecordingForm from '@components/recording/EditRecordingForm';
import { useRecordings } from '@context/RecordingContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { addCustomTag, getAllMergedTags } from '@/services/tagService'; // Use getAllMergedTags here
import type { Tag } from '@/types/Tags';

export default function EditRecordingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { recordings, updateRecording } = useRecordings();

  // Find the recording to edit
  const recording = recordings.find((rec: Encounter) => rec.id === id);

  // Local state for editing
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [createdDate, setCreatedDate] = useState('');  // <-- Added createdDate state
  const [loading, setLoading] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]); // Combined tag list

  useEffect(() => {
    if (recording) {
      setTitle(recording.title ?? '');
      setPlace(recording.place ?? '');
      setTags(recording.tags ?? []);
      // Initialize createdDate to in-app createdDate, or empty string if missing
      // Important: do NOT default to current date here, keep empty if missing
      setCreatedDate(recording.createdDate ?? '');
    }
  }, [recording]);

  // Load combined tags dynamically on mount
  useEffect(() => {
    async function loadTags() {
      try {
        const tags = await getAllMergedTags();  // Use getAllMergedTags here
        setAllTags(tags);
      } catch (e) {
        console.error('Failed to load tags:', e);
      }
    }
    loadTags();
  }, []);

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Add a new custom tag
  const handleAddCustomTag = async (label: string): Promise<Tag> => {
    try {
      const newTag = await addCustomTag({ label });
      // Reload all tags to include the new one
      const tags = await getAllMergedTags();
      setAllTags(tags);
      return newTag!;
    } catch (e) {
      Alert.alert('Error', 'Failed to add new tag. Please try again.');
      throw e;
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (!recording) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <EditRecordingForm
        title={title}
        setTitle={setTitle}
        place={place}
        setPlace={setPlace}
        tags={tags}
        toggleTag={toggleTag}
        defaultTags={allTags}
        onSave={async (newTitle, newPlace, newTags) => {
          if (!recording) return;
          setLoading(true);
          try {
            await updateRecording(recording.id, {
              title: newTitle,
              place: newPlace,
              tags: newTags,
              ...(createdDate ? { createdDate } : {}),
            });
            router.back();
          } catch (e) {
            Alert.alert('Error', 'Failed to save changes.');
          } finally {
            setLoading(false);
          }
        }}
        onCancel={handleCancel}
        loading={loading}
        createdDate={createdDate}
        setCreatedDate={setCreatedDate}
        addCustomTag={handleAddCustomTag}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6fafd',
    padding: 24,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
