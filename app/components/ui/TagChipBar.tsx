import React, { useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Popover, { PopoverPlacement } from 'react-native-popover-view';
import { Tag } from '../../types/Tags';
import TagIcon from './TagIcon';

export interface TagChipBarProps {
  tags: Tag[];
  selectedTagIds: string[];
  onSelect: (tagId: string) => void;
  tagCounts: Record<string, number>;
}

const TagChipBar: React.FC<TagChipBarProps> = ({ tags, selectedTagIds, onSelect, tagCounts }) => {
  const [tooltipTagId, setTooltipTagId] = useState<string | null>(null);
  // Use AUTO placement for best-fit
  const [tooltipPlacement] = useState<PopoverPlacement>(PopoverPlacement.AUTO);
  const chipRefs = useRef<Record<string, any>>({});

	  console.log('[TagChipBar] tags prop:', tags.map(t => ({ id: t.id, label: t.label })));

const selectedTags = selectedTagIds
  .map(id => tags.find(t => t.id === id))
  .filter((t): t is Tag => Boolean(t));

// Separate tags with count > 0 and count === 0
const unselectedTags = tags.filter(t => !selectedTagIds.includes(t.id));
const usedTags = unselectedTags.filter(t => (tagCounts[t.id] || 0) > 0);
const unusedTags = unselectedTags.filter(t => (tagCounts[t.id] || 0) === 0);
const displayTags = [...selectedTags, ...usedTags, ...unusedTags];

console.log('[TagChipBar] displayTags:', displayTags.map(t => ({ id: t.id, label: t.label })));

  return (
    <View style={styles.container}>
      <FlatList
        data={displayTags}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item: Tag) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }: { item: Tag }) => {
					
					console.log('[TagChipBar] renderItem:', { id: item.id, label: item.label, count: tagCounts[item.id] || 0 });

          const selected = selectedTagIds.includes(item.id);
          const count = tagCounts[item.id] || 0;
          const disabled = count === 0;
          const orderIndex = selected ? selectedTagIds.indexOf(item.id) + 1 : null;

          const chip = (
            <TouchableOpacity
              ref={ref => { if (ref) chipRefs.current[item.id] = ref; }}
              style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled]}
              onPress={() => {
                if (!disabled) {
                  onSelect(item.id);
                } else {
                  setTooltipTagId(item.id);
                }
              }}
              activeOpacity={disabled ? 1 : 0.7}
							>	
              {selected && (
                <View style={styles.orderCircle}>
                  <Text style={styles.orderText}>{orderIndex}</Text>
                </View>
              )}
              <TagIcon icon={item.icon} size={18} color={selected ? '#fff' : item.color || '#444'} style={{ marginRight: 6, opacity: disabled ? 0.4 : 1 }} />
              <Text style={[styles.chipLabel, selected && styles.chipLabelSelected, disabled && styles.chipLabelDisabled]}>{item.label}</Text>
              <Text style={styles.chipCount}> {count}</Text>
            </TouchableOpacity>
          );

					if (!disabled) return chip;

return (
  <Popover
    isVisible={tooltipTagId === item.id}
    from={(
      <TouchableOpacity
        style={[styles.chip, styles.chipDisabled]}
        onPress={() => setTooltipTagId(item.id)}
        activeOpacity={1}
      >
        <TagIcon icon={item.icon} size={18} color={item.color || '#444'} style={{ marginRight: 6, opacity: 0.4 }} />
        <Text style={[styles.chipLabel, styles.chipLabelDisabled]}>{item.label}</Text>
        <Text style={styles.chipCount}> {count}</Text>
      </TouchableOpacity>
    )}
    onRequestClose={() => setTooltipTagId(null)}
		placement={tooltipPlacement}
    backgroundStyle={{ backgroundColor: 'transparent' }}
    popoverStyle={{
      backgroundColor: '#222',
      borderRadius: 8,
      padding: 10,
      maxWidth: 220,
    }}
  >
    <Text style={{ color: '#fff', fontSize: 14 }}>
      No recordings are tagged with "{item.label}"
    </Text>
  </Popover>
);
        
        }}
				initialNumToRender={displayTags.length} // Ensures all chips render
  			removeClippedSubviews={false} // Prevents chips from being clipped
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
		paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: '#fff',
    position: 'relative',
  },
  listContent: {
    paddingHorizontal: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#4B0082',
  },
  chipDisabled: {
    opacity: 0.5,
  },
  orderCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4B0082',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  orderText: {
    color: '#4B0082',
    fontWeight: 'bold',
    fontSize: 11,
    textAlign: 'center',
  },
  chipLabel: {
    color: '#444',
    fontWeight: '500',
    fontSize: 10,
  },
  chipLabelSelected: {
    color: '#fff',
  },
  chipLabelDisabled: {
    color: '#888',
  },
  chipCount: {
    color: '#888',
    fontSize: 13,
    marginLeft: 4,
    alignSelf: 'center',
    fontWeight: '400',
  },
});

export default TagChipBar;