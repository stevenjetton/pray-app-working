import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { PlaybackBar } from '@/components/recording/PlaybackBar'; // shared playback UI component
import { usePlayback } from '@/context/PlaybackContext';
import { useRecordings } from '@/context/RecordingContext';
import { useUserContext } from '@/context/UserContext';

// Optional helper: Format duration seconds as mm:ss
function formatDuration(seconds?: number): string {
  if (seconds == null) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Helper to get the correct date string for display
function getEncounterDisplayDate(encounter: any): string | undefined {
  if (encounter.imported && encounter.dropboxModified) {
    try {
      return new Date(encounter.dropboxModified).toISOString();
    } catch {
      return undefined;
    }
  }
  return encounter.createdDate;
}

export default function PlaybackScreen() {
  const { selectedRecording } = usePlayback();
  const { deleteRecording } = useRecordings();
  const { loading } = useUserContext();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!selectedRecording) {
    return (
      <View style={styles.container}>
        <Text style={styles.noSelection}>No recording selected</Text>
      </View>
    );
  }

  const confirmDelete = () => {
    Alert.alert(
      'Delete recording',
      `Are you sure you want to delete "${selectedRecording.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteRecording(selectedRecording.id) },
      ]
    );
  };

  // Format and display date
  const dateIso = getEncounterDisplayDate(selectedRecording);
  let dateDisplay = '';
  if (dateIso) {
    try {
      dateDisplay = new Date(dateIso).toLocaleDateString();
    } catch {
      dateDisplay = dateIso;
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{selectedRecording.title}</Text>
      <Text style={styles.info}>
        {formatDuration(selectedRecording.duration)}{dateDisplay ? ` | ${dateDisplay}` : ''}
      </Text>

      {/* Shared playback UI */}
      <PlaybackBar showDelete onDelete={confirmDelete} recording={selectedRecording} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  noSelection: {
    fontSize: 18,
    color: '#888',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  info: {
    fontSize: 16,
    color: '#4d4d4d',
    marginBottom: 24,
  },
});
