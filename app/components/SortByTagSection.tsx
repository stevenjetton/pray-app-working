// /app/(tabs)/SortByTagSection.tsx
import type { Tag } from '@/types/Tags';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Modal, Text, TouchableOpacity, View } from 'react-native';

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
const AnimatedTagChip = React.memo(({ 
  tag, 
  isSelected, 
  selectedIdx, 
  recordingCount, 
  onPress,
  isUsed = true,
  listIndex 
}: {
  tag: Tag;
  isSelected: boolean;
  selectedIdx: number;
  recordingCount: number;
  onPress: () => void;
  isUsed?: boolean;
  listIndex: number;
}) => {
  const animatedScale = React.useRef(new Animated.Value(1)).current;
  const animatedY = React.useRef(new Animated.Value(0)).current;
  const previousIndex = React.useRef(listIndex);
  
  React.useEffect(() => {
    // Smooth scale animation when selection changes
    try {
      Animated.spring(animatedScale, {
        toValue: isSelected ? 1.02 : 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    } catch (error) {
      console.log('[AnimatedTagChip] Scale animation error:', error);
    }
  }, [isSelected]);
  
  React.useEffect(() => {
    // Calculate position change for smooth list reordering
    const indexDiff = listIndex - previousIndex.current;
    
    if (Math.abs(indexDiff) > 0 && Math.abs(indexDiff) < 10) { // Only animate reasonable moves
      // Start from the old position
      animatedY.setValue(indexDiff * -48); // Slightly reduced height
      
      // Animate to the new position (0)
      Animated.spring(animatedY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 120, // Reduced tension for smoother animation
        friction: 8,  // Reduced friction
      }).start();
    } else {
      // For large jumps, don't animate to avoid janky movements
      animatedY.setValue(0);
    }
    
    previousIndex.current = listIndex;
  }, [listIndex]);

  return (
    <Animated.View 
      style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 8,
        transform: [
          { scale: animatedScale },
          { translateY: animatedY }
        ]
      }}
    >
      {/* Order number for selected tags */}
      {isSelected && (
        <Animated.View style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: tag.color || '#1976d2',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 6,
        }}>
          <Text style={{
            color: '#fff',
            fontSize: 10,
            fontWeight: 'bold',
          }}>
            {selectedIdx + 1}
          </Text>
        </Animated.View>
      )}
      
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{
          backgroundColor: isSelected ? tag.color || '#1976d2' : '#e0e0e0',
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 6,
          alignSelf: 'flex-start',
          borderWidth: isSelected ? 1 : 0,
          borderColor: isSelected ? '#115293' : 'transparent',
          ...(isUsed ? {} : { opacity: 0.6 }),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text
            style={{
              color: isSelected ? '#fff' : '#333',
              fontWeight: isSelected ? 'bold' : '500',
              fontSize: 14,
            }}
          >
            {tag.label}
          </Text>
          <Text
            style={{
              color: isSelected ? 'rgba(255,255,255,0.7)' : '#666',
              fontSize: 11,
              marginLeft: 6,
            }}
          >
            {recordingCount}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

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

  // Calculate which tags are actually used on recordings
  const usedTagIds = useMemo(() => {
    const used = new Set<string>();
    recordings.forEach(recording => {
      if (Array.isArray(recording.tags)) {
        recording.tags.forEach(tagId => used.add(tagId));
      }
    });
    return used;
  }, [recordings]);

  // Calculate recording count per tag
  const tagRecordingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    recordings.forEach(recording => {
      if (Array.isArray(recording.tags)) {
        recording.tags.forEach(tagId => {
          counts.set(tagId, (counts.get(tagId) || 0) + 1);
        });
      }
    });
    return counts;
  }, [recordings]);

  const filterActive = useMemo(
    () => sortTags.length > 0 || sortMode !== null,
    [sortTags, sortMode]
  );

  // Popup state for unused tag message
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  // Auto-hide popup after 2 seconds
  useEffect(() => {
    if (showPopup) {
      const timer = setTimeout(() => {
        setShowPopup(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showPopup]);

  // ✅ Clear tags and reset sort settings
  const onClearTags = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSortTags([]);
    setSortMode(null);
    setSortAsc(true);
  }, [setSortTags, setSortMode, setSortAsc]);

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

const onToggleTag = useCallback(
  (tagId: string) => {
    console.log('[SortByTagSection] onToggleTag called with tagId:', tagId);
    
    // Safety check to ensure the tag exists in allTags
    const tagExists = allTags.some(t => t.id === tagId);
    
    if (!tagExists) {
      console.log('[SortByTagSection] Tag does not exist in allTags, not toggling:', tagId);
      return;
    }
    
    // Check if this is an unused tag
    const isUnusedTag = !usedTagIds.has(tagId);
    const tag = allTags.find(t => t.id === tagId);
    
    if (isUnusedTag && tag) {
      // Haptic feedback for unused tag
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      // Show popup for unused tag
      setPopupMessage(`No recordings tagged with "${tag.label}"`);
      setShowPopup(true);
      return;
    }
    
    // Haptic feedback for successful tag toggle
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Tag toggled: tagId
    setSortTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  },
  [setSortTags, allTags, usedTagIds, setPopupMessage, setShowPopup]
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

      <Text style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
        Tap tags to filter recordings. When multiple tags are selected, recordings are grouped by tag tap order.
      </Text>

      {/* ✅ Clear Tags button */}
      <TouchableOpacity
        onPress={sortTags.length > 0 ? onClearTags : undefined}
        activeOpacity={sortTags.length > 0 ? 0.7 : 1}
        disabled={sortTags.length === 0}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: sortTags.length > 0 ? '#1976d2' : '#ccc',
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 6,
          marginBottom: 12,
          alignSelf: 'flex-start',
          opacity: sortTags.length > 0 ? 1 : 0.5,
        }}
        accessibilityLabel="Clear selected tags"
      >
        <TagIcon
          icon="close-circle"
          size={16}
          color={sortTags.length > 0 ? "#fff" : "#888"}
          style={{ marginRight: 4 }}
        />
        <Text style={{ color: sortTags.length > 0 ? '#fff' : '#888', fontSize: 14 }}>Clear Tags</Text>
      </TouchableOpacity>

            {/* Used tags section */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 8 }}>
          <View style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#1976d2',
            marginRight: 6,
          }} />
          <Text style={{ fontSize: 14, color: '#333', fontWeight: '600' }}>Used Tags</Text>
        </View>
        
        {allTags
          .filter(tag => usedTagIds.has(tag.id))
          .slice()
          .sort((a, b) => {
            const aSelectedIdx = sortTags.indexOf(a.id);
            const bSelectedIdx = sortTags.indexOf(b.id);
            const aIsSelected = aSelectedIdx !== -1;
            const bIsSelected = bSelectedIdx !== -1;
            
            // If both are selected, sort by selection order
            if (aIsSelected && bIsSelected) {
              return aSelectedIdx - bSelectedIdx;
            }
            
            // Selected tags come first
            if (aIsSelected && !bIsSelected) return -1;
            if (!aIsSelected && bIsSelected) return 1;
            
            // Both unselected, maintain original order
            return 0;
          })
          .map((tag, index) => {
            const selectedIdx = sortTags.indexOf(tag.id);
            const isSelected = selectedIdx !== -1;
            const recordingCount = tagRecordingCounts.get(tag.id) || 0;
            
            return (
              <AnimatedTagChip
                key={tag.id}
                tag={tag}
                isSelected={isSelected}
                selectedIdx={selectedIdx}
                recordingCount={recordingCount}
                onPress={() => onToggleTag(tag.id)}
                isUsed={true}
                listIndex={index}
              />
            );
          })}
      </View>

      {/* Unused tags section */}
      {allTags.filter(tag => !usedTagIds.has(tag.id)).length > 0 && (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 8 }}>
            <View style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#999',
              marginRight: 6,
              opacity: 0.5,
            }} />
            <Text style={{ fontSize: 14, color: '#333', fontWeight: '600' }}>Unused Tags</Text>
          </View>
          
          {allTags
            .filter(tag => !usedTagIds.has(tag.id))
            .map((tag, index) => {
              return (
                <AnimatedTagChip
                  key={tag.id}
                  tag={tag}
                  isSelected={false}
                  selectedIdx={-1}
                  recordingCount={0}
                  onPress={() => onToggleTag(tag.id)}
                  isUsed={false}
                  listIndex={index}
                />
              );
            })}
        </View>
      )}

      {/* Popup message for unused tags */}
      <Modal
        visible={showPopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPopup(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.3)',
        }}>
          <View style={{
            backgroundColor: '#333',
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 12,
            maxWidth: 280,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 2 },
            elevation: 5,
          }}>
            <Text style={{
              color: '#fff',
              fontSize: 14,
              textAlign: 'center',
              fontWeight: '500',
            }}>
              {popupMessage}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export const SortByTagSection = React.memo(SortByTagSectionComponent);
