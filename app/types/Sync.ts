// types/Sync.ts

/** Represents the status of a sync process */
export type SyncStatus = 'idle' | 'in_progress' | 'success' | 'error';

/** Represents what is being synced */
export type SyncOperation =
  | { type: 'all' } // Sync all items
  | { type: 'single'; id: string } // Sync a single item by ID
  | { type: 'range'; from: Date; to: Date }; // Sync items in a date range

/** Represents the result/outcome of a sync operation */
export type SyncResult = {
  success: boolean;
  message?: string;
  syncedIds?: string[];
  error?: Error;
};

/** Type for a sync function */
export type SyncFunction = (operation: SyncOperation) => Promise<SyncResult>;

/** Optional: For tracking sync progress of multiple items */
export type SyncProgress = {
  total: number;
  completed: number;
  currentId?: string;
  status: SyncStatus;
};
