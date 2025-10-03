import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePlayback } from './context/PlaybackContext';
import { useUserContext } from './context/UserContext';

function normalizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/\(s\)/g, '')
    .replace(/[\(\)]/g, '')
    .replace(/s\b/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function RecordingsScreen() {
  const { recordings, selectedRecording, playRecording, pausePlayback, isPlaying } = usePlayback();
  const { loading } = useUserContext();
  const params = useLocalSearchParams<{ tag?: string | string[] }>();
  // Defensive: handle tag as string or array
  const tagParam = Array.isArray(params.tag) ? params.tag[0] : params.tag;
  const [sortTag, setSortTag] = useState<string | undefined>(tagParam);

  useEffect(() => {
    setSortTag(tagParam);
  }, [tagParam]);

  // Tag-priority sorting: tag matches first, then the rest (all visible)
  const sortedRecordings = React.useMemo(() => {
    if (!sortTag) return recordings;
    const hasTag = (rec: any) => {
      if (Array.isArray(rec.tags)) {
        return rec.tags.some((t: string) => normalizeTag(t) === normalizeTag(sortTag));
      }
      if (rec.tag) {
        return normalizeTag(rec.tag) === normalizeTag(sortTag);
      }
      return false;
    };
    const withTag = recordings.filter(hasTag);
    const withoutTag = recordings.filter(rec => !hasTag(rec));
    return [...withTag, ...withoutTag];
  }, [recordings, sortTag]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My God-Encounters</Text>
      {sortTag && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Showing <Text style={{ fontWeight: 'bold' }}>{sortTag}</Text> encounters first
          </Text>
        </View>
      )}
      {sortedRecordings.length === 0 ? (
        <Text>No recordings yet.</Text>
      ) : (
        sortedRecordings.map((rec) => {
          const isCurrent = selectedRecording?.id === rec.id;
          return (
            <View key={rec.id} style={styles.recordingItem}>
              <Text style={styles.title}>{rec.title || 'Untitled'}</Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => (isCurrent && isPlaying ? pausePlayback() : playRecording(rec))}
                  style={styles.playButton}
                >
                  <Text style={{ color: 'black' }}>
                    {isCurrent && isPlaying ? 'Pause' : 'Play'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  banner: {
    backgroundColor: '#e6e6fa',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  bannerText: {
    color: '#4B0082',
    fontSize: 15,
  },
  recordingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  playButton: { justifyContent: 'center', marginRight: 16 },
});
