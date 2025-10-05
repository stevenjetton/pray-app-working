/**
 * Encounter represents a recorded audio item with rich metadata.
 * Legacy fields have been fully removed for a clean, modern start.
 */
export type Encounter = {
  id: string;
  title: string;
  tags?: string[];
  tag?: string;
  place?: string;
  favorite?: boolean;
  views?: number;

  audioUrl?: string; // Remote/cloud file location (optional)
  uri?: string;      // Local file URI (optional)
  duration?: number; // Duration of the audio in seconds

  // Persistent modern date fields
  createdDate?: string;    // Set on record/import if known (ISO string)

  type?: string;
  synced?: boolean;
  localTranscription?: string;
  cloudTranscription?: string;
  imported?: boolean;

  // Dropbox sync metadata
  dropboxFileId?: string;    // Dropbox unique file identifier, e.g., "id:abc123"
  dropboxRev?: string;       // Dropbox file revision identifier
  dropboxModified?: number;  // Dropbox server_modified/client_modified in ms (epoch)
  
  // Temporary recording flag (removed when saved)
  isTemporary?: boolean;
};
