import { PlaybackBar } from '@/components/recording/PlaybackBar';
import { usePlayback } from '@/context/PlaybackContext';
import { usePlaylists } from '@/context/PlaylistContext';
import { useRecordings } from '@/context/RecordingContext';
import type { Playlist } from '@/types/Playlist';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PlaylistsScreen() {
  const { playlists, deletePlaylist, refreshPlaylists, createPlaylist } = usePlaylists();
  const { recordings } = useRecordings();
  const { selectedRecording, activePlaylistId, playPlaylist, isPlaying, pausePlayback } = usePlayback();
  const [playLoading, setPlayLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state for creating playlist
  const [modalVisible, setModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [selectedRecordingIds, setSelectedRecordingIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPlaylists();
    setRefreshing(false);
  };

  const handleDeletePlaylist = (playlist: Playlist) => {
    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${playlist.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlaylist(playlist.id);
            } catch (error) {
              console.error('Error deleting playlist:', error);
              Alert.alert('Error', 'Failed to delete playlist');
            }
          },
        },
      ]
    );
  };

  const getRecordingTitle = (recordingId: string) => {
    const recording = recordings.find(r => r.id === recordingId);
    return recording?.title || 'Untitled';
  };

  const toggleSelectRecording = (id: string) => {
    setSelectedRecordingIds(prev =>
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim() || selectedRecordingIds.length === 0) return;
    setCreating(true);
    try {
      await createPlaylist(newPlaylistName, newPlaylistDescription, selectedRecordingIds);
      setModalVisible(false);
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setSelectedRecordingIds([]);
      await refreshPlaylists();
    } catch (e) {
      Alert.alert('Error', 'Failed to create playlist');
    } finally {
      setCreating(false);
    }
  };

  const renderPlaylistItem = ({ item: playlist }: { item: Playlist }) => {
    const recordingCount = playlist.recordingIds.length;
    const firstFewRecordings = playlist.recordingIds.slice(0, 3);
    const playlistRecordings = playlist.recordingIds
      .map(id => recordings.find(r => r.id === id))
      .filter((r): r is typeof recordings[number] => !!r && !!r.uri);
    // If a recording from this playlist is selected, use it; otherwise, use the first recording
    const playbackBarRecording = (selectedRecording && playlist.recordingIds.includes(selectedRecording.id))
      ? selectedRecording
      : (playlistRecordings.length > 0 ? playlistRecordings[0] : null);
    // Is this playlist currently playing? (now based on activePlaylistId)
    const isThisPlaylistPlaying = activePlaylistId === playlist.id;

    // Custom play/pause handler for this playlist
    const handlePlayPause = async () => {
      if (isThisPlaylistPlaying) {
        if (isPlaying) {
          await pausePlayback();
        } else {
          // Always use playPlaylist to ensure playlist context is set
          if (playlistRecordings.length > 0) {
            await playPlaylist(playlistRecordings, playlist.id);
          }
        }
      } else {
        if (playlistRecordings.length > 0) {
          await playPlaylist(playlistRecordings, playlist.id);
        }
      }
    };

    return (
      <View style={[
        styles.playlistCard,
        isThisPlaylistPlaying && styles.activePlaylistCard
      ]}>
        <View style={styles.playlistHeader}>
          <View style={styles.playlistInfo}>
            <Text style={styles.playlistName}>{playlist.name}</Text>
            <Text style={styles.playlistCount}>
              {recordingCount} recording{recordingCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeletePlaylist(playlist)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color="#e53935" />
          </TouchableOpacity>
        </View>

        {playlist.description ? (
          <Text style={styles.playlistDescription}>{playlist.description}</Text>
        ) : null}

        {firstFewRecordings.length > 0 ? (
          <View style={styles.recordingPreview}>
            {firstFewRecordings.map((recordingId, idx) => {
              const isPlaying = isThisPlaylistPlaying && selectedRecording && recordingId === selectedRecording.id;
              return (
                <Text
                  key={recordingId}
                  style={[
                    styles.recordingTitle,
                    isPlaying && { color: '#1976d2', fontWeight: 'bold' }
                  ]}
                >
                  {idx + 1}. {getRecordingTitle(recordingId)}
                  {isPlaying && <Ionicons name="volume-high" size={16} color="#1976d2" style={{ marginLeft: 4 }} />}
                </Text>
              );
            })}
            {recordingCount > 3 ? (
              <Text style={styles.moreRecordings}>
                +{recordingCount - 3} more...
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.playlistFooter}>
          <Text style={styles.createdDate}>
            Created {new Date(playlist.createdDate).toLocaleDateString()}
          </Text>
        </View>

        {/* Only the active playlist's PlaybackBar should show as playing */}
        <PlaybackBar
          recording={playbackBarRecording}
          playlistRecordings={playlistRecordings}
          isThisPlaylistPlaying={isThisPlaylistPlaying}
          onTogglePlayPause={handlePlayPause}
        />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="musical-notes" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No Playlists Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create playlists by adding recordings using the swipe actions
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerStats}>
          <Text style={styles.statsText}>
            {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={{ padding: 8, backgroundColor: '#1976d2', borderRadius: 8 }}
          onPress={() => setModalVisible(true)}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ New Playlist</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={playlists}
        renderItem={({ item }) => renderPlaylistItem({ item })}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          playlists.length === 0 && styles.emptyContainer,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal for creating playlist */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '90%', backgroundColor: '#fff', borderRadius: 12, padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Create Playlist</Text>
            <TextInput
              placeholder="Playlist Name"
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              style={{ borderBottomWidth: 1, borderColor: '#ccc', marginBottom: 12, fontSize: 16, padding: 4 }}
              editable={!creating}
            />
            <TextInput
              placeholder="Description (optional)"
              value={newPlaylistDescription}
              onChangeText={setNewPlaylistDescription}
              style={{ borderBottomWidth: 1, borderColor: '#ccc', marginBottom: 16, fontSize: 16, padding: 4 }}
              editable={!creating}
            />
            <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Select Recordings:</Text>
            <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
              {recordings.length === 0 ? (
                <Text style={{ color: '#888', fontStyle: 'italic' }}>No recordings available</Text>
              ) : (
                recordings.map(rec => (
                  <Pressable
                    key={rec.id}
                    onPress={() => toggleSelectRecording(rec.id)}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}
                    disabled={creating}
                  >
                    <Ionicons
                      name={selectedRecordingIds.includes(rec.id) ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={selectedRecordingIds.includes(rec.id) ? '#1976d2' : '#888'}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={{ fontSize: 16 }}>{rec.title || 'Untitled'}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{ padding: 10, borderRadius: 6, backgroundColor: '#eee', marginRight: 8 }}
                disabled={creating}
              >
                <Text style={{ color: '#333' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreatePlaylist}
                style={{ padding: 10, borderRadius: 6, backgroundColor: '#1976d2' }}
                disabled={creating || !newPlaylistName.trim() || selectedRecordingIds.length === 0}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{creating ? 'Creating...' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerStats: {
    alignItems: 'flex-end',
  },
  statsText: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  playlistCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    // Default no shadow
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  activePlaylistCard: {
    // Subtle black shadow for active playlist
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
    borderColor: '#e0e0e0',
    borderWidth: 1,
  },
  playlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  playlistCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  playlistDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  recordingPreview: {
    marginBottom: 12,
  },
  recordingTitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  moreRecordings: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  playlistFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  createdDate: {
    fontSize: 12,
    color: '#999',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  playButtonText: {
    fontSize: 14,
    color: '#1976d2',
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
});