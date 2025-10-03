// MostViewedWidget.tsx
import { usePlayback } from '@/context/PlaybackContext';
import type { Encounter } from '@/types/Encounter';
import { useRecordings } from '@context/RecordingContext';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function MostViewedWidget() {
  const { recordings } = useRecordings();
  const router = useRouter();
  const { playRecording } = usePlayback();

  // Sort and pick top 5 most viewed from local recordings
  const mostViewed = [...recordings]
    .filter(r => typeof r.views === 'number' && r.views > 0)
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5);

  if (!mostViewed.length) {
    return <Text style={styles.widgetEmpty}>No viewed recordings yet.</Text>;
  }

  const handlePress = async (item: Encounter) => {
    try {
      await playRecording(item); // Play recording on tap
    } catch (error) {
      console.warn('[MostViewedWidget] Playback error:', error);
    }
    router.push(`/encounter/${item.id}`);
  };

  return (
    <View style={styles.widgetContainer}>
      <Text style={styles.widgetTitle}>Most Viewed</Text>
      {mostViewed.map(item => (
        <TouchableOpacity
          key={item.id}
          style={styles.rowContainer}
          onPress={() => handlePress(item)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={`Play and view details for ${item.title || 'Untitled'}`}
          testID={`most-viewed-${item.id}`}
        >
          <Text style={styles.title} numberOfLines={1}>
            {item.title || 'Untitled'} <Text style={styles.views}>({item.views})</Text>
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  widgetContainer: {
    backgroundColor: '#f7faff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
    width: '100%',
    alignSelf: 'center',
    elevation: 1,
  },
  widgetTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
    color: '#222',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ececec',
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    color: 'black',
    fontWeight: '600',
    minWidth: 0,
  },
  views: {
    fontSize: 13,
    color: '#888',
    fontWeight: 'normal',
  },
  widgetEmpty: {
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 8,
    alignSelf: 'flex-start',
    width: '100%',
  },
});
