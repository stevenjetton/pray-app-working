// /app/(tabs)/SortByTagSection.tsx
import type { Tag } from '@/types/Tags';
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
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

// Animated Tag Component for smooth transitions

function SortByTagSectionComponent({
  setSortTags,
  sortMode,
  setSortMode,
  sortAsc,
  setSortAsc,
}: Props) {
  // ✅ Clear tags and reset sort settings

  const onToggleSortMode = useCallback(
    (optValue: SortMode) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSortMode(curr => (curr === optValue ? null : optValue));
    },
    [setSortMode]
  );

  const onToggleSortAsc = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSortAsc(curr => !curr);
  }, [setSortAsc]);

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
         Sort
        </Text>
        <Text style={{ color: '#888', fontSize: 13, marginLeft: 'auto' }}>
          {/* Optionally show count or status here */}
        </Text>
      </View>

      {/* Sort Mode */}
      <View style={{ flexDirection: 'row', marginBottom: 10, alignItems: 'center' }}>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onToggleSortMode(opt.value)}
            activeOpacity={0.7}
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
            activeOpacity={0.7}
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

    </View>
  );
}

export const SortByTagSection = React.memo(SortByTagSectionComponent);
