// RecentEncountersWidget.tsx
import TagIcon from '@/components/ui/TagIcon';
import { usePlayback } from '@/context/PlaybackContext';
import type { Encounter } from '@/types/Encounter';
import { ALL_TAGS } from '@/types/Tags';
import { formatDateForDisplay } from '@/utils/dateHelpers';
import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  recentEncounters: Encounter[];
  recentLoading: boolean;
  onView: (encounter: Encounter) => void;
};

const TAG_COLOR = '#1976d2';

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

function getTagObj(tagId: string) {
  return ALL_TAGS.find((t) => t.id === tagId);
}

export default function RecentEncountersWidget({ recentEncounters, recentLoading, onView }: Props) {
  const { setSelectedRecording, selectedRecording } = usePlayback();

  const handlePress = (item: Encounter) => {
    setSelectedRecording(item);
    onView(item);
  };

  return (
    <View style={styles.widgetContainer}>
      <Text style={styles.widgetTitle}>Recent</Text>
      {recentLoading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : recentEncounters.length === 0 ? (
        <Text style={styles.emptyText}>No recent encounters found.</Text>
      ) : (
        <FlatList
          data={recentEncounters}
          keyExtractor={(item) => item.id}
          extraData={selectedRecording?.id} // Forces re-render when selectedRecording changes
          renderItem={({ item }) => {
            const isSelected = selectedRecording?.id === item.id;
            const tags = Array.isArray(item.tags) && item.tags.length > 0 ? item.tags : ['Untagged'];
            return (
              <TouchableOpacity
                style={[styles.itemContainer, isSelected && styles.selectedItem]}
                activeOpacity={0.8}
                onPress={() => handlePress(item)}
              >
                <Text style={styles.title} numberOfLines={1}>
                  {item.title || 'Untitled'}
                </Text>
                <View style={styles.dateTagRow}>
                  <Text style={styles.date} numberOfLines={1}>
                    {formatDateForDisplay(getEncounterDisplayDate(item))}
                  </Text>
                  <View style={styles.tagsRow}>
                    {tags.map((tagId) => {
                      const tagObj = getTagObj(tagId);
                      if (!tagObj) return null;
                      return (
                        <View key={tagId} style={[styles.tagChip, { backgroundColor: TAG_COLOR }]}>
                          <TagIcon
                            icon={tagObj.icon}
                            iconFamily={tagObj.iconFamily || 'Ionicons'}
                            size={14}
                            color="#fff"
                            style={{ marginRight: 4 }}
                            accessibilityLabel={`${tagObj.label} icon`}
                          />
                          <Text style={[styles.tagText, { color: '#fff' }]}>{tagObj.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          scrollEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  widgetContainer: {
    backgroundColor: '#f7faff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
    width: '100%',
    alignSelf: 'center',
    elevation: 1,
  },
  widgetTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
    color: '#222',
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
    marginTop: 10,
    marginBottom: 18,
  },
  itemContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ececec',
    marginBottom: 2,
  },
  selectedItem: {},
  title: {
    fontSize: 15,
    color: 'black',
    fontWeight: '600',
    marginBottom: 2,
  },
  dateTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    justifyContent: 'space-between',
    width: '100%',
  },
  date: {
    fontSize: 13,
    color: '#888',
    textAlign: 'left',
    marginRight: 10,
    flexShrink: 1,
    flexGrow: 0,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 1,
    flexGrow: 0,
    minWidth: 0,
    maxWidth: '65%',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 2,
  },
  tagText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
