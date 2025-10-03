import * as LocalService from "@/services/localRecordingService";
import type { Encounter } from '@/types/Encounter';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export type RecordingContextType = {
  recordings: Encounter[];
  setRecordings: React.Dispatch<React.SetStateAction<Encounter[]>>;
  toggleFavorite: (id: string) => Promise<void>;
  updateRecording: (id: string, updates: Partial<Encounter>) => Promise<void>;
addRecording: (rec: Omit<Encounter, "id">) => Promise<Encounter | null>; 
  deleteRecording: (id: string) => Promise<void>;
  refreshRecordings: () => Promise<void>;
};

const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

export const RecordingProvider = ({ children }: { children: ReactNode }) => {
  const [recordings, setRecordings] = useState<Encounter[]>([]);

  // Load recordings once on mount
  useEffect(() => {
    refreshRecordings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh recordings list from local storage
  const refreshRecordings = async () => {
    try {
      const all = await LocalService.getAllRecordings();
      setRecordings(all);
    } catch (e) {
      console.error("Failed to load recordings:", e);
    }
  };

const addRecording = async (rec: Omit<Encounter, "id">): Promise<Encounter | null> => {
  try {
    const newRec: Encounter = { ...rec, id: Date.now().toString() };
    await LocalService.addRecording(newRec);
    await refreshRecordings();
    return newRec; // return newly created recording immediately
  } catch (e) {
    console.error("Failed to add recording:", e);
    return null;
  }
};

const updateRecording = async (id: string, updates: Partial<Encounter>) => {
  // Save previous state snapshot for rollback in case of failure
  let prevRecordings: Encounter[] = [];
  setRecordings((prev) => {
    prevRecordings = prev;
    // Optimistically update local state
    return prev.map(rec =>
      rec.id === id ? { ...rec, ...updates } : rec
    );
  });

  try {
    // Attempt backend/local storage update
    await LocalService.updateRecording(id, updates);
    // Refresh recordings to sync with backend precisely
    await refreshRecordings();
  } catch (e) {
    console.error(`Failed to update recording ${id}:`, e);
    // Rollback state to previous if update fails
    setRecordings(prevRecordings);
    // Optionally notify user here (e.g., toast or alert)
  }
};


  // Delete a recording by id
  const deleteRecording = async (id: string) => {
    try {
      await LocalService.deleteRecording(id);
      await refreshRecordings();
    } catch (e) {
      console.error(`Failed to delete recording ${id}:`, e);
    }
  };

  // Toggle favorite status for a recording
  const toggleFavorite = async (id: string) => {
    const rec = recordings.find((r) => r.id === id);
    if (!rec) return;
    await updateRecording(id, { favorite: !rec.favorite });
  };

const contextValue = useMemo(() => ({
  recordings,
  setRecordings,
  toggleFavorite,
  updateRecording,
  addRecording,  
  deleteRecording,
  refreshRecordings,
}), [recordings]);


  return (
    <RecordingContext.Provider value={contextValue}>
      {children}
    </RecordingContext.Provider>
  );
};

export function useRecordings() {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error("useRecordings must be used within a RecordingProvider");
  return ctx;
}
