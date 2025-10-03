// /app/(tabs)/screens/TagScreen.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import TagIcon from '@/components/ui/TagIcon';
import { useEncounterContext } from '@/context/EncounterContext';
import { useTags } from '@/context/TagsContext'; // To access global tags with icons
import { auth } from '@/services/firebase';

// Robust date formatter for Firestore Timestamp, Date, or string
function formatDate(date: any) {
  if (!date) return '';
  if (typeof date === 'string') {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  if (date instanceof Date) {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  if (typeof date === 'object' && 'seconds' in date) {
    if (typeof date.toDate === 'function') {
      return date
        .toDate()
        .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return new Date(date.seconds * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  return '';
}

// Helper to pick the correct date to display per your app logic
function getEncounterDisplayDate(encounter: any) {
  // Use dropboxModified if imported and dropboxModified is set
  if (encounter.imported && encounter.dropboxModified) {
    // Dropbox modified time is from milliseconds epoch to ISO string
    try {
      return new Date(encounter.dropboxModified).toISOString();
    } catch {
      return '';
    }
  }
  // Use createdDate if present
  if (encounter.createdDate) return encounter.createdDate;
  // No fallback to modifiedDate
  return '';
}

export default function TagScreen() {
  const router = useRouter();
  const { tag } = useLocalSearchParams<{ tag: string }>();

  const user = auth.currentUser;

  const { recentEncounters } = useEncounterContext();
  const { tags: allTags } = useTags(); // Global tags with icon info

  const [search, setSearch] = useState('');
  const [sortBy] = useState<'date' | 'title'>('date');

  // Find the global Tag object by id (assuming tag param is tag ID)
  const currentTag = useMemo(() => {
    if (!tag) return null;
    return allTags.find((t) => t.id === tag);
  }, [allTags, tag]);

  // Filter encounters by selected tag ID
  const filteredByTag = useMemo(() => {
    if (!tag) return [];
    if (!recentEncounters) return [];

    return recentEncounters.filter((enc) => {
      if (!enc.tags || !Array.isArray(enc.tags)) return false;
      return enc.tags.includes(tag);
    });
  }, [recentEncounters, tag]);

  // Search & sort within filtered encounters
  const filteredEncounters = useMemo(() => {
    let filtered = filteredByTag;

    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter((e) => {
        return Object.values(e).some((val) => {
          if (typeof val === 'string') {
            return val.toLowerCase().includes(lowerSearch);
          }
          if (Array.isArray(val)) {
            return val.some((item) => typeof item === 'string' && item.toLowerCase().includes(lowerSearch));
          }
          return false;
        });
      });
    }

    if (sortBy === 'title') {
      filtered = [...filtered].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else {
      // Sort by the chosen display date's timestamp
      const getTimestamp = (val: any) => {
        if (!val) return 0;
        if (typeof val === 'object' && 'seconds' in val) return val.seconds;
        if (val instanceof Date) return Math.floor(val.getTime() / 1000);
        if (typeof val === 'string') return Math.floor(new Date(val).getTime() / 1000);
        return 0;
      };
      filtered = [...filtered].sort((a, b) => {
        const aTime = getTimestamp(getEncounterDisplayDate(a));
        const bTime = getTimestamp(getEncounterDisplayDate(b));
        return bTime - aTime; // descending (newest first)
      });
    }

    return filtered;
  }, [filteredByTag, search, sortBy]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Please login to view your encounters.</Text>
      </View>
    );
  }

  if (!tag) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>No tag selected</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.headerRow}>
          {currentTag?.icon && (
            <TagIcon
              icon={currentTag.icon}
              size={26}
              color="#1976d2"
              style={styles.headerIcon}
              accessibilityLabel={`${currentTag.label} icon`}
            />
          )}
          <Text style={styles.header}>{currentTag?.label ?? 'Tag'} Encounters</Text>
        </View>
        <View style={styles.listContainer}>
          {filteredEncounters.length === 0 ? (
            <Text style={styles.emptyText}>No encounters found for this tag.</Text>
          ) : (
            <FlatList
              data={filteredEncounters}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => router.push(`/encounter/${item.id}`)}
                >
                  <Text style={styles.title}>{item.title || 'Untitled'}</Text>
                  <Text style={styles.date}>{formatDate(getEncounterDisplayDate(item))}</Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      </View>
      <View style={styles.bottomBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search any text..."
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel="Search encounters"
        />
        {/* Optional: Add a sort picker if desired */}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    marginRight: 8,
  },
  header: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  listContainer: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'column',
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    marginLeft: -20,
    marginRight: -20,
    paddingLeft: 20,
    paddingRight: 20,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  emptyText: { color: '#888', fontStyle: 'italic', marginTop: 20 },
  item: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 2,
  },
  title: { fontSize: 16, fontWeight: '600', color: 'black' },
  date: { fontSize: 13, color: '#4d4d4d', marginTop: 2 },
});
