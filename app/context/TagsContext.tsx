// /context/TagsContext.tsx
import { getAllRecordings, updateRecording } from '@/services/localRecordingService';
import type { IconFamily, Tag } from '@/types/Tags';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  addCustomTag,
  deleteTagById,
  getAllMergedTags,
  updateTag as updateTagService,
} from '@/services/tagService';

// NewTagInput type aligned with simplified Tag type
export type NewTagInput = {
  label: string;
  color?: string;
  icon: string;           // icon name string
  iconFamily: IconFamily; // icon family literal union
};

type TagsContextType = {
  tags: Tag[];
  loading: boolean;
  addTag: (newTag: NewTagInput) => Promise<Tag | null>;
  updateTag: (tag: Tag) => Promise<Tag | null>;
  deleteTag: (id: string) => Promise<boolean>;
  refreshTags: () => Promise<void>;
};

const TagsContext = createContext<TagsContextType | undefined>(undefined);

const DEFAULT_ICON = { icon: 'pricetag-outline', iconFamily: 'Ionicons' as IconFamily };

type TagsProviderProps = {
  children: ReactNode;
};

export function TagsProvider({ children }: TagsProviderProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Load and normalize tags from service
  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const fetched = await getAllMergedTags();
      const normalized = fetched.map(tag => ({
        ...tag,
        icon: tag.icon ?? DEFAULT_ICON.icon,
        iconFamily: tag.iconFamily ?? DEFAULT_ICON.iconFamily,
        color: tag.color ?? undefined,
      }));
      setTags(normalized);
    } catch (error) {
      console.error('TagsContext: Failed to load tags:', error);
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // Add new tag
  const addTag = useCallback(
    async (newTag: NewTagInput) => {
      try {
        const label = newTag.label.trim();
        if (!label) return null;

        const created = await addCustomTag({
          label,
          color: newTag.color,
          icon: newTag.icon,
          iconFamily: newTag.iconFamily,
        });

        if (!created) return null;

        setTags(prev => {
          if (prev.find(t => t.id === created.id)) return prev;
          return [...prev, created];
        });

        return created;
      } catch (error) {
        console.error('TagsContext: Exception adding tag:', error);
        return null;
      }
    },
    []
  );

  // Update existing tag
  const updateTag = useCallback(
    async (tag: Tag) => {
      try {
        const updated = await updateTagService(tag);
        if (!updated) return null;

        setTags(prev => prev.map(t => (t.id === updated.id ? updated : t)));
        return updated;
      } catch (error) {
        console.error('TagsContext: Exception updating tag:', error);
        return null;
      }
    },
    []
  );

  // Delete tag by id
  const deleteTag = useCallback(
    async (id: string) => {
      try {
        console.log('[TagsContext] Deleting tag:', id);
        const success = await deleteTagById(id);
        if (success) {
          setTags(prev => prev.filter(t => t.id !== id));
          // Remove tag from all recordings
          try {
            const allRecordings = await getAllRecordings();
            const affected = allRecordings.filter(r => Array.isArray(r.tags) && r.tags.includes(id));
            console.log('[TagsContext] Recordings affected by tag delete:', affected.map(r => ({ id: r.id, tags: r.tags })));
            for (const rec of affected) {
              const newTags = (rec.tags || []).filter(t => t !== id);
              console.log(`[TagsContext] Updating recording ${rec.id}: removing tag ${id}, new tags:`, newTags);
              await updateRecording(rec.id, { tags: newTags });
            }
          } catch (recErr) {
            console.error('TagsContext: Failed to remove tag from recordings:', recErr);
          }
        } else {
          console.warn('[TagsContext] Tag delete failed:', id);
        }
        return success;
      } catch (error) {
        console.error('TagsContext: Exception deleting tag:', error);
        return false;
      }
    },
    []
  );

  const refreshTags = useCallback(async () => {
    await loadTags();
  }, [loadTags]);

  return (
    <TagsContext.Provider
      value={{
        tags,
        loading,
        addTag,
        updateTag,
        deleteTag,
        refreshTags,
      }}
    >
      {children}
    </TagsContext.Provider>
  );
}

// Hook to use Tags context
export function useTags(): TagsContextType {
  const context = useContext(TagsContext);
  if (!context) {
    throw new Error('useTags must be used within a TagsProvider');
  }
  return context;
}
