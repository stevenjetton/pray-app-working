// /app/components/ui/TagCountsWidget.tsx
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import TagIcon from '@/components/ui/TagIcon'; // use TagIcon instead of direct vector imports
import { useTags } from '@context/TagsContext'; // import your tags context

type Props = {
  byTag: { [tag: string]: number };
};

export default function TagCountsWidget({ byTag }: Props) {
  const router = useRouter();
  const { tags } = useTags(); // get dynamic tags list from context

  // Helper to render the icon dynamically from context tags given a tag label or id
  function renderTagIcon(tagKey: string) {
    // Find the tag object by id or label in context tags
    const tagObj = tags.find(t => t.id === tagKey) || tags.find(t => t.label === tagKey);

    // Use tagObj data or fallback defaults
    const iconFamily = tagObj?.iconFamily || 'Ionicons';
    const iconName = tagObj?.icon || 'help-circle-outline';
    const iconSize = 22;

    return (
      <TagIcon
        icon={iconName}
        iconFamily={iconFamily}
        size={iconSize}
        color="#5b5b5b"
        accessibilityLabel={tagObj ? `${tagObj.label} icon` : 'Unknown tag icon'}
      />
    );
  }

  return (
    <View>
      <Text style={styles.subtitle}>By Tag</Text>
      <View style={styles.tagsRow}>
        {Object.entries(byTag).map(([tag, count]) => (
          <TouchableOpacity
            key={tag}
            style={styles.tagCard}
            onPress={() => {
              // Resolve tag label for routing param (fallback to tag id/string)
              const resolvedLabel = tags.find(t => t.id === tag)?.label || tag;
              router.push({ pathname: '/voiceRecorder', params: { tag: resolvedLabel } });
            }}
            activeOpacity={0.7}
          >
            {renderTagIcon(tag)}
            <Text style={styles.tagCount}>{count}</Text>
            <Text style={styles.tagLabel} numberOfLines={1}>
              {tags.find(t => t.id === tag)?.label || tag}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginTop: 16,
    marginBottom: 4,
    alignSelf: 'flex-start',
    letterSpacing: 0.3,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
    width: '100%',
    justifyContent: 'flex-start',
  },
  tagCard: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    flexDirection: 'column',
    marginRight: 8,
    marginBottom: 10,
    minWidth: 64,
    maxWidth: 90,
  elevation: 1,
  },
  tagCount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4B0082',
    marginVertical: 2,
  },
  tagLabel: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    marginTop: 1,
    maxWidth: 70,
  },
});
