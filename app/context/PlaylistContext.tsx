import type { Playlist, PlaylistContextType } from '@/types/Playlist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

const PLAYLISTS_STORAGE_KEY = '@playlists';

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load playlists from storage on mount
  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem(PLAYLISTS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPlaylists(parsed);
      }
    } catch (error) {
      console.error('[PlaylistContext] Error loading playlists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePlaylists = async (newPlaylists: Playlist[]) => {
    try {
      await AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(newPlaylists));
      setPlaylists(newPlaylists);
    } catch (error) {
      console.error('[PlaylistContext] Error saving playlists:', error);
      throw error;
    }
  };

  const createPlaylist = async (
    name: string, 
    description?: string, 
    recordingIds: string[] = []
  ): Promise<Playlist> => {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description?.trim(),
      recordingIds,
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
    };

    const updatedPlaylists = [...playlists, newPlaylist];
    await savePlaylists(updatedPlaylists);
    return newPlaylist;
  };

  const addToPlaylist = async (playlistId: string, recordingIds: string[]) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Add only new recordings (avoid duplicates)
    const newRecordingIds = recordingIds.filter(id => !playlist.recordingIds.includes(id));
    if (newRecordingIds.length === 0) {
      return; // Nothing to add
    }

    const updatedPlaylist: Playlist = {
      ...playlist,
      recordingIds: [...playlist.recordingIds, ...newRecordingIds],
      modifiedDate: new Date().toISOString(),
    };

    const updatedPlaylists = playlists.map(p => 
      p.id === playlistId ? updatedPlaylist : p
    );

    await savePlaylists(updatedPlaylists);
  };

  const removeFromPlaylist = async (playlistId: string, recordingIds: string[]) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    const updatedPlaylist: Playlist = {
      ...playlist,
      recordingIds: playlist.recordingIds.filter(id => !recordingIds.includes(id)),
      modifiedDate: new Date().toISOString(),
    };

    const updatedPlaylists = playlists.map(p => 
      p.id === playlistId ? updatedPlaylist : p
    );

    await savePlaylists(updatedPlaylists);
  };

  const deletePlaylist = async (playlistId: string) => {
    const updatedPlaylists = playlists.filter(p => p.id !== playlistId);
    await savePlaylists(updatedPlaylists);
  };

  const getPlaylistsForRecording = (recordingId: string): Playlist[] => {
    return playlists.filter(playlist => playlist.recordingIds.includes(recordingId));
  };

  const refreshPlaylists = async () => {
    await loadPlaylists();
  };

  const value: PlaylistContextType = {
    playlists,
    isLoading,
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    deletePlaylist,
    getPlaylistsForRecording,
    refreshPlaylists,
  };

  return (
    <PlaylistContext.Provider value={value}>
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylists() {
  const context = useContext(PlaylistContext);
  if (context === undefined) {
    throw new Error('usePlaylists must be used within a PlaylistProvider');
  }
  return context;
}