import { useRecordings } from '@/context/RecordingContext';
import { formatTranscriptParagraphs } from '@/utils/formatTranscriptParagraphs';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';

export default function ReformatTranscriptsScreen() {
  const { recordings, updateRecording } = useRecordings();
  const [running, setRunning] = useState(false);

  const runFormatter = async () => {
    if (running) return;
    setRunning(true);

    try {
      let updatedCount = 0;

      for (const rec of recordings) {
        if (rec.localTranscription && rec.localTranscription.trim().length > 0) {
          const formatted = formatTranscriptParagraphs(rec.localTranscription);
          if (formatted !== rec.localTranscription) {
            await updateRecording(rec.id, { localTranscription: formatted });
            updatedCount++;
          }
        }
      }

      Alert.alert(
        'Batch Format Complete',
        updatedCount > 0
          ? `Updated ${updatedCount} transcript${updatedCount === 1 ? '' : 's'}.`
          : 'No transcripts needed updating.'
      );
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.message || 'Something went wrong while running the formatter.'
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reformat Old Transcripts</Text>
      <Text style={styles.subtitle}>
        This will scan all recordings and reapply paragraph formatting with indentation.
      </Text>
      <Button
        title={running ? 'Formatting...' : 'Run Formatter'}
        onPress={runFormatter}
        disabled={running}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: '#555',
  },
});
