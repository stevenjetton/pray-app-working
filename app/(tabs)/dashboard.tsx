// Dashboard.tsx
import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import TagIcon from '@/components/ui/TagIcon';
import { useRecordings } from '@/context/RecordingContext';
import { useTags } from '@/context/TagsContext';
import { useUserContext } from '@/context/UserContext';
import type { Encounter } from '@/types/Encounter';
import RecentEncountersWidget from '@components/widgets/RecentEncountersWidget';
import { useRouter } from 'expo-router';

// --- Date helpers that accept all possible date types ---
export type AnyDate =
  | string
  | Date
  | { seconds: number; nanoseconds: number; toDate?: (() => Date) | undefined }
  | undefined;

export function dateToSortableString(date: AnyDate): string {
  if (!date) return '';
  if (typeof date === 'string') {
    const d = new Date(date);
    return isNaN(d.getTime()) ? date : d.toISOString();
  }
  if (date instanceof Date) return date.toISOString();
  if (typeof date === 'object' && date !== null) {
    if (typeof date.toDate === 'function') return date.toDate().toISOString();
    if ('seconds' in date && 'nanoseconds' in date) {
      const ms = date.seconds * 1000 + Math.floor(date.nanoseconds / 1e6);
      return new Date(ms).toISOString();
    }
  }
  return '';
}

export function formatDateForDisplay(date: AnyDate): string {
  const s = dateToSortableString(date);
  if (!s) return '';
  try {
    const d = new Date(s);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return s;
  }
}

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

// --- Tag helpers ---
function getTagObjFromContext(tags: ReturnType<typeof useTags>['tags'], tag: string) {
  return tags.find(t => t.id === tag) || tags.find(t => t.label === tag);
}


// --- Most Viewed Widget ---
type MostViewedWidgetProps = { onView: (item: Encounter) => void };

function MostViewedWidget({ onView }: MostViewedWidgetProps) {
  const { recordings } = useRecordings();

  const mostViewed = [...recordings]
    .filter(r => typeof r.views === 'number')
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 5);

  return (
    <View style={styles.widgetContainer}>
      <Text style={styles.widgetTitle}>Most Viewed</Text>
      {mostViewed.length === 0 ? (
        <Text style={styles.widgetEmpty}>No viewed recordings yet.</Text>
      ) : (
        mostViewed.map(item => (
          <Text
            key={item.id}
            style={styles.widgetItem}
            onPress={() => onView(item)}
            numberOfLines={1}
          >
            {item.title || 'Untitled'}{' '}
            <Text style={{ color: '#888', fontSize: 13 }}>({item.views ?? 0})</Text>
          </Text>
        ))
      )}
    </View>
  );
}

// --- TagCountsWidget ---
type TagCountsWidgetProps = {
  byTag: { [tag: string]: number };
  onTagPress: (tag: string) => void;
  tags: ReturnType<typeof useTags>['tags'];
};

function TagCountsWidget({ byTag, onTagPress, tags }: TagCountsWidgetProps) {
  const sortedTags = Object.keys(byTag).sort((a, b) => byTag[b] - byTag[a]);
  if (!sortedTags.length) return null;

  return (
    <View style={{ width: '100%', marginBottom: 18 }}>
      <Text style={styles.widgetTitle}>By Tag</Text>
      <View style={styles.tagsRow}>
        {sortedTags.map(tag => {
          const tagObj = getTagObjFromContext(tags, tag);
          return (
            <TouchableOpacity
              key={tag}
              style={styles.tagCard}
              onPress={() => onTagPress(tag)}
              activeOpacity={0.7}
            >
              <TagIcon
                icon={tagObj?.icon || 'pricetag-outline'}
                iconFamily={tagObj?.iconFamily || 'Ionicons'}
                size={22}
                color="black"
                style={{ marginBottom: 2 }}
              />
              <Text style={styles.tagCount}>{byTag[tag]}</Text>
              <Text style={styles.tagLabel}>{tagObj?.label || tag}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// --- Dashboard Header ---
type DashboardHeaderProps = {
  total: number;
  lastEncounter: string;
  byTag: { [tag: string]: number };
  mostViewedHandler: (item: Encounter) => void;
  recentEncounters: Encounter[];
  recentLoading: boolean;
  onViewRecent: (item: Encounter) => void;
  onTagPress: (tag: string) => void;
  tags: ReturnType<typeof useTags>['tags'];
  onMainListPress: () => void; // 👈 added prop for main list nav
};

function DashboardHeader({
  total,
  lastEncounter,
  byTag,
  mostViewedHandler,
  recentEncounters,
  recentLoading,
  onViewRecent,
  onTagPress,
  tags,
}: DashboardHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <TagIcon icon="bookmarks-outline" size={24} color="#4B0082" style={{ marginBottom: 2 }} />
          <Text style={styles.statNumber}>{total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <TagIcon icon="calendar-outline" size={22} color="#4B0082" style={{ marginBottom: 2 }} />
          <Text style={styles.statNumber}>{lastEncounter}</Text>
          <Text style={styles.statLabel}>Last</Text>
        </View>
      </View>

      <TagCountsWidget byTag={byTag} onTagPress={onTagPress} tags={tags} />
      <MostViewedWidget onView={mostViewedHandler} />
      <RecentEncountersWidget
        recentEncounters={recentEncounters}
        recentLoading={recentLoading}
        onView={onViewRecent}
      />
    </View>
  );
}

export default function Dashboard() {
  const { recordings, updateRecording } = useRecordings();
  const { loading } = useUserContext();
  const router = useRouter();
  const { tags } = useTags();

  const total = recordings.length;
  const byTag: { [tag: string]: number } = {};
  let lastEncounter = '—';

  if (recordings.length) {
    const sorted = [...recordings].sort((a, b) =>
      dateToSortableString(getEncounterDisplayDate(b)).localeCompare(
        dateToSortableString(getEncounterDisplayDate(a))
      )
    );

    const lastDate = getEncounterDisplayDate(sorted[0]);
    lastEncounter = lastDate ? formatDateForDisplay(lastDate) : '—';

    sorted.forEach(e => {
      const tagsArray = Array.isArray(e.tags)
        ? e.tags.length > 0
          ? e.tags
          : ['Untagged']
        : e.tag
        ? [e.tag]
        : ['Untagged'];
      tagsArray.forEach((tag: string) => {
        // Always resolve to tag ID for byTag key
        const tagObj = tags.find(t => t.id === tag || t.label === tag);
        const tagId = tagObj ? tagObj.id : tag;
        if (tagObj) {
          byTag[tagId] = (byTag[tagId] || 0) + 1;
        }
      });
    });
  }

  const recentEncounters: Encounter[] = [...recordings]
    .sort((a, b) =>
      dateToSortableString(getEncounterDisplayDate(b)).localeCompare(
        dateToSortableString(getEncounterDisplayDate(a))
      )
    )
    .slice(0, 3);

  const handleViewRecording = (item: Encounter) => {
    updateRecording(item.id, { views: (item.views ?? 0) + 1 });
    router.push(`/encounter/${item.id}`);
  };

  const handleTagPress = (tag: string) => {
  const tagObj = tags.find(t => t.id === tag || t.label === tag);
  const tagId = tagObj?.id || tag;
  console.log('[Dashboard] handleTagPress:', { tag, tagId, tags: tags.map(t => ({ id: t.id, label: t.label })) });
  // Add a dummy 'force' param to guarantee remount
  router.push({ pathname: '/voiceRecorder', params: { tag: tagId, force: Date.now().toString() } });
  };

  const handleMainListPress = () => {
    router.push('/voiceRecorder'); // 🚀 no tag param
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={[]}
      renderItem={null}
      keyExtractor={() => 'dashboard'}
      ListHeaderComponent={
        <DashboardHeader
          total={total}
          lastEncounter={lastEncounter}
          byTag={byTag}
          mostViewedHandler={handleViewRecording}
          recentEncounters={recentEncounters}
          recentLoading={false}
          onViewRecent={handleViewRecording}
          onTagPress={handleTagPress}
          tags={tags}
          onMainListPress={handleMainListPress}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 20,
    paddingTop: 36,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    color: '#222',
    letterSpacing: 0.5,
    marginTop: 30,
    alignSelf: 'flex-start',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
    marginTop: 6,
  },
  statCard: {
    backgroundColor: '#f4f4fa',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    elevation: 1,
    minWidth: 90,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4B0082',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
    width: '100%',
    justifyContent: 'flex-start',
  },
  tagCard: {
    backgroundColor: '#f8f8fc',
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
    shadowColor: '#ccc',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  tagCount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'black',
    marginVertical: 2,
  },
  tagLabel: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
    marginTop: 1,
    maxWidth: 70,
  },
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
  widgetItem: {
    fontSize: 15,
    color: 'black',
    marginBottom: 2,
    marginLeft: 2,
  },
  widgetEmpty: {
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 8,
    alignSelf: 'flex-start',
    width: '100%',
  },
});
