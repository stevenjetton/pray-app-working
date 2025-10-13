import { usePlaylists } from '@/context/PlaylistContext';
import type { Playlist } from '@/types/Playlist';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface PlaylistSelectorProps {
  visible: boolean;
  onClose: () => void;
  recordingIds: string[];
  recordingTitle?: string; // For display in modal
}

export default function PlaylistSelector({
  visible,
  onClose,
  recordingIds,
  recordingTitle,
}: PlaylistSelectorProps) {
  const { playlists, createPlaylist, addToPlaylist } = usePlaylists();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddToPlaylist = async (playlist: Playlist) => {
    try {
      setIsLoading(true);
      await addToPlaylist(playlist.id, recordingIds);
      Alert.alert(
        'Added to Playlist',
        `Recording${recordingIds.length > 1 ? 's' : ''} added to "${playlist.name}"`
      );
      onClose();
    } catch (error) {
      console.error('Error adding to playlist:', error);
      Alert.alert('Error', 'Failed to add to playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }

    try {
      setIsLoading(true);
      const newPlaylist = await createPlaylist(newPlaylistName.trim(), undefined, recordingIds);
      Alert.alert(
        'Playlist Created',
        `"${newPlaylist.name}" created with ${recordingIds.length} recording${recordingIds.length > 1 ? 's' : ''}`
      );
      setNewPlaylistName('');
      setShowCreateForm(false);
      onClose();
    } catch (error) {
      console.error('Error creating playlist:', error);
      Alert.alert('Error', 'Failed to create playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setNewPlaylistName('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>Add to Playlist</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Recording info */}
        {recordingTitle && (
          <View style={styles.recordingInfo}>
            <Text style={styles.recordingTitle}>
              {recordingIds.length > 1 
                ? `${recordingIds.length} recordings selected`
                : recordingTitle
              }
            </Text>
          </View>
        )}

        <ScrollView style={styles.content}>
          {/* Create new playlist button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateForm(true)}
            disabled={isLoading}
          >
            <Ionicons name="add-circle" size={24} color="#1976d2" />
            <Text style={styles.createButtonText}>Create New Playlist</Text>
          </TouchableOpacity>

          {/* Create form */}
          {showCreateForm && (
            <View style={styles.createForm}>
              <TextInput
                style={styles.textInput}
                placeholder="Playlist name"
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                autoFocus
              />
              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setShowCreateForm(false)}
                  disabled={isLoading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.createButtonAction]}
                  onPress={handleCreatePlaylist}
                  disabled={isLoading || !newPlaylistName.trim()}
                >
                  <Text style={styles.createButtonActionText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Existing playlists */}
          {playlists.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add to Existing Playlist</Text>
              {playlists.map((playlist) => (
                <TouchableOpacity
                  key={playlist.id}
                  style={styles.playlistItem}
                  onPress={() => handleAddToPlaylist(playlist)}
                  disabled={isLoading}
                >
                  <View style={styles.playlistInfo}>
                    <Text style={styles.playlistName}>{playlist.name}</Text>
                    <Text style={styles.playlistCount}>
                      {playlist.recordingIds.length} recording{playlist.recordingIds.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {playlists.length === 0 && !showCreateForm && (
            <View style={styles.emptyState}>
              <Ionicons name="musical-notes" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No playlists yet</Text>
              <Text style={styles.emptySubtext}>Create your first playlist above</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  recordingInfo: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  recordingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  createButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '500',
  },
  createForm: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  createButtonAction: {
    backgroundColor: '#1976d2',
  },
  createButtonActionText: {
    color: '#fff',
    fontWeight: '500',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  playlistCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
});