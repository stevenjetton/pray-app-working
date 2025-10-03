// /context/EncounterContext.tsx
import { useRecordings } from '@/context/RecordingContext';
import { Encounter } from '@/types/Encounter';
import { dateToSortableString } from '@/utils/dateHelpers';
import React, { createContext, useCallback, useContext, useMemo } from 'react';

// Helper to select the proper date string for sorting/display
function getEncounterDisplayDate(encounter: Encounter): string {
  if (encounter.imported && encounter.dropboxModified) {
    try {
      return new Date(encounter.dropboxModified).toISOString();
    } catch {
      return '';
    }
  }
  return encounter.createdDate ?? '';
}

type EncounterContextType = {
  recentEncounters: Encounter[];
  favorites: Encounter[];
  mostViewed: Encounter[];
  refreshAll?: () => Promise<void>;
  clearAll?: () => void;
};

const EncounterContext = createContext<EncounterContextType | undefined>(undefined);

export const EncounterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { recordings, refreshRecordings } = useRecordings();

  // Convert date string to sortable ISO, fallback to empty string
  const getEncounterDateString = (encounter: Encounter): string =>
    dateToSortableString(getEncounterDisplayDate(encounter));

  // Derive recent encounters sorted by date descending
  const recentEncounters = useMemo(
    () =>
      [...recordings]
        .sort((a, b) => getEncounterDateString(b).localeCompare(getEncounterDateString(a)))
        .slice(0, 5),
    [recordings]
  );

  // Derive favorites sorted by date descending
  const favorites = useMemo(
    () =>
      recordings
        .filter(r => r.favorite)
        .sort((a, b) => getEncounterDateString(b).localeCompare(getEncounterDateString(a)))
        .slice(0, 5),
    [recordings]
  );

  // Derive most viewed (no change, sorts by views)
  const mostViewed = useMemo(
    () =>
      [...recordings]
        .filter(r => typeof r.views === 'number')
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
        .slice(0, 5),
    [recordings]
  );

  const refreshAll = useCallback(async () => {
    await refreshRecordings();
  }, [refreshRecordings]);

  const clearAll = useCallback(() => {
    // Add logic to clear cloud/local caches if needed
  }, []);

  return (
    <EncounterContext.Provider
      value={{
        recentEncounters,
        favorites,
        mostViewed,
        refreshAll,
        clearAll,
      }}
    >
      {children}
    </EncounterContext.Provider>
  );
};

export const useEncounterContext = () => {
  const ctx = useContext(EncounterContext);
  if (!ctx) throw new Error('useEncounterContext must be used within EncounterProvider');
  return ctx;
};
