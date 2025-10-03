// /app/(tabs)/SortByTagSection.tsx
import type { Tag } from '@/types/Tags';
import React, { useCallback, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import TagIcon from '@/components/ui/TagIcon';

type SortMode = 'date' | 'title' | 'place' | null;

type Props = {
  sortTags: string[];
  setSortTags: React.Dispatch<React.SetStateAction<string[]>>;
  sortMode: SortMode;
  setSortMode: React.Dispatch<React.SetStateAction<SortMode>>;
  sortAsc: boolean;
  setSortAsc: React.Dispatch<React.SetStateAction<boolean>>;
  recordings: { tags?: string[]; title?: string; place?: string; date?: any }[];
  allTags: Tag[];
  normalizeTag: (tag: string) => string;
};

const SORT_OPTIONS: { label: string; value: SortMode }[] = [
  { label: 'Date', value: 'date' },
  { label: 'Title', value: 'title' },
  { label: 'Place', value: 'place' },
];

function SortByTagSectionComponent({
  sortTags,
  setSortTags,
  sortMode,
  setSortMode,
  sortAsc,
  setSortAsc,
  recordings,
  allTags,
}: Props) {
  // Count how many recordings match current tag filters
  const matchCount = useMemo(() => {
    if (sortTags.length === 0) return recordings.length;
    return recordings.filter(
      rec => Array.isArray(rec.tags) && rec.tags.some(tag => sortTags.includes(tag))
    ).length;
  }, [recordings, sortTags]);

  const filterActive = useMemo(
    () => sortTags.length > 0 || sortMode !== null,
    [sortTags, sortMode]
  );

  // ✅ Clear tags and reset sort settings
  const onClearTags = useCallback(() => {
    setSortTags([]);
    setSortMode(null);
    setSortAsc(true);
  }, [setSortTags, setSortMode, setSortAsc]);

  const onToggleSortMode = useCallback(
    (optValue: SortMode) => {
      setSortMode(curr => (curr === optValue ? null : optValue));
    },
    [setSortMode]
  );

  const onToggleSortAsc = useCallback(() => {
    setSortAsc(curr => !curr);
  }, [setSortAsc]);

const onToggleTag = useCallback(
  (tagId: string) => {
    console.log('[SortByTagSection] onToggleTag called with tagId:', tagId);
    
    // Safety check to ensure the tag exists in allTags
    const tagExists = allTags.some(t => t.id === tagId);
    
    if (!tagExists) {
      console.log('[SortByTagSection] Tag does not exist in allTags, not toggling:', tagId);
      return;
    }
    
    // Tag toggled: tagId
    setSortTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  },
  [setSortTags, allTags]
);


  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 22 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 4,
          paddingHorizontal: 4,
        }}
      >
        <Text style={{ fontWeight: 'bold', fontSize: 18, marginRight: 8 }}>
          Filter &amp; Sort
        </Text>
        {filterActive && (
          <View style={{ marginRight: 6 }}>
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 6,
                backgroundColor: '#db4437',
              }}
            />
          </View>
        )}
        <Text style={{ color: '#888', fontSize: 13, marginLeft: 'auto' }}>
          {matchCount} shown
        </Text>
      </View>

      {/* Sort Mode */}
      <View style={{ flexDirection: 'row', marginBottom: 10, alignItems: 'center' }}>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onToggleSortMode(opt.value)}
            style={{
              backgroundColor: sortMode === opt.value ? '#1976d2' : '#e0e0e0',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 6,
              marginRight: 8,
              marginBottom: 4,
              borderWidth: sortMode === opt.value ? 1 : 0,
              borderColor: sortMode === opt.value ? '#115293' : 'transparent',
            }}
          >
            <Text
              style={{
                color: sortMode === opt.value ? '#fff' : '#333',
                fontWeight: sortMode === opt.value ? 'bold' : '500',
                fontSize: 14,
              }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}

        {sortMode && (
          <TouchableOpacity
            onPress={onToggleSortAsc}
            style={{
              marginLeft: 4,
              paddingHorizontal: 8,
              paddingVertical: 6,
              borderRadius: 12,
              backgroundColor: '#e0e0e0',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <TagIcon
              icon={
                sortAsc
                  ? sortMode === 'date'
                    ? 'arrow-down'
                    : 'arrow-up'
                  : sortMode === 'date'
                  ? 'arrow-up'
                  : 'arrow-down'
              }
              size={18}
              color="black"
              style={{ marginRight: 2 }}
            />
            <Text style={{ fontSize: 13, color: 'black', fontWeight: 'bold' }}>
              {sortMode === 'date'
                ? sortAsc
                  ? 'Newest'
                  : 'Oldest'
                : sortAsc
                ? 'A→Z'
                : 'Z→A'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
        Tap tags to filter recordings. When multiple tags are selected, recordings are grouped by tag order.
      </Text>

      {/* ✅ Clear Tags button */}
      {sortTags.length > 0 && (
        <TouchableOpacity
          onPress={onClearTags}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#1976d2',
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 6,
            marginBottom: 8,
            alignSelf: 'flex-start',
          }}
          accessibilityLabel="Clear selected tags"
        >
          <TagIcon
            icon="close-circle"
            size={16}
            color="#fff"
            style={{ marginRight: 4 }}
          />
          <Text style={{ color: '#fff', fontSize: 14 }}>Clear Tags</Text>
        </TouchableOpacity>
      )}

      {/* Tag Chips */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {allTags.map(tag => {
          const selectedIdx = sortTags.indexOf(tag.id);
          const isSelected = selectedIdx !== -1;
          return (
            <TouchableOpacity
              key={tag.id}
              onPress={() => onToggleTag(tag.id)}
              style={{
                backgroundColor: isSelected ? tag.color || '#1976d2' : '#e0e0e0',
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 8,
                marginRight: 10,
                marginBottom: 12,
                borderWidth: isSelected ? 1 : 0,
                borderColor: isSelected ? '#115293' : 'transparent',
              }}
            >
              <Text
                style={{
                  color: isSelected ? '#fff' : '#333',
                  fontWeight: isSelected ? 'bold' : '500',
                  fontSize: 15,
                }}
              >
                {tag.label}
                {isSelected ? ` (${selectedIdx + 1})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export const SortByTagSection = React.memo(SortByTagSectionComponent);
