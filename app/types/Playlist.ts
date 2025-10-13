export interface Playlist {
  id: string;
  name: string;
  description?: string;
  recordingIds: string[]; // Ordered list of recording IDs
  createdDate: string;
  modifiedDate: string;
  color?: string; // Optional theme color for future use
}

export interface PlaylistContextType {
  playlists: Playlist[];
  isLoading: boolean;
  createPlaylist: (name: string, description?: string, recordingIds?: string[]) => Promise<Playlist>;
  addToPlaylist: (playlistId: string, recordingIds: string[]) => Promise<void>;
  removeFromPlaylist: (playlistId: string, recordingIds: string[]) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  getPlaylistsForRecording: (recordingId: string) => Playlist[];
  refreshPlaylists: () => Promise<void>;
}