import type { Tag } from '@/types/Tags';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Props = {
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  place: string;
  setPlace: React.Dispatch<React.SetStateAction<string>>;
  tags: string[]; // selected tag IDs
  toggleTag: (tagId: string) => void;
  defaultTags: Tag[]; // all valid tags in system
  onSave: (title: string, place: string, tags: string[]) => void; // updated onSave signature
  onCancel: () => void;
  loading: boolean;
  addCustomTag?: (label: string) => Promise<Tag>;
  createdDate: string;
  setCreatedDate: React.Dispatch<React.SetStateAction<string>>;
  dropboxModified?: string; // Optional prop for Dropbox modified date
};

const EditRecordingForm = ({
  title,
  place,
  tags,
  defaultTags,
  onSave,
  onCancel,
  loading,
  createdDate,
  setCreatedDate,
  dropboxModified,
}: Props) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Local controlled state to hold edits
  const [localTitle, setLocalTitle] = useState(title || '');
  const [localPlace, setLocalPlace] = useState(place || '');
  const [localTags, setLocalTags] = useState(tags || []);

  // Sync prop changes into local state (e.g., when a different recording is loaded for editing)
  useEffect(() => {
    setLocalTitle(title || '');
    setLocalPlace(place || '');
    setLocalTags(tags || []);
  }, [title, place, tags]);

  // Refs for input focus
  const titleInputRef = useRef<TextInput>(null);
  const placeInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, []);

  // Helper to parse ISO dates safely
  const parseISODate = (iso: string | undefined) => {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  };

  const inAppCreated = parseISODate(createdDate);
  const dropboxDate = parseISODate(dropboxModified);
  const showManualDatePicker = !inAppCreated && !dropboxDate;
  const pickerDate = inAppCreated || new Date();

  const onChangeDate = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setCreatedDate(selectedDate.toISOString());
    }
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return 'No Date';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Toggle tag in localTags (immutable update)
  const toggleLocalTag = (tagId: string) => {
    if (!localTags) {
      setLocalTags([tagId]);
      return;
    }
    
    if (localTags.includes(tagId)) {
      setLocalTags(localTags.filter(t => t !== tagId));
    } else {
      setLocalTags([...localTags, tagId]);
    }
  };

  // Save handler using local state with logging
  const onSavePress = () => {
    onSave(localTitle || '', localPlace || '', localTags || []);
  };

  return (
    <View style={styles.container}>
      {/* Title input with clear button */}
      <Text style={styles.label}>Title</Text>
      <View style={styles.inputWithClear}>
        <TextInput
          ref={titleInputRef}
          style={styles.inputFlex}
          value={localTitle || ''}
          onChangeText={setLocalTitle}
          placeholder="Recording title"
          editable={!loading}
        />
        {localTitle && localTitle.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setLocalTitle('');
              setTimeout(() => titleInputRef.current?.focus(), 0);
            }}
            accessibilityLabel="Clear title"
            accessibilityRole="button"
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={22} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Place input with clear button */}
      <Text style={styles.label}>Place</Text>
      <View style={styles.inputWithClear}>
        <TextInput
          ref={placeInputRef}
          style={styles.inputFlex}
          value={localPlace || ''}
          onChangeText={setLocalPlace}
          placeholder="Place"
          editable={!loading}
        />
        {localPlace && localPlace.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setLocalPlace('');
              setTimeout(() => placeInputRef.current?.focus(), 0);
            }}
            accessibilityLabel="Clear place"
            accessibilityRole="button"
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={22} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tags */}
      <Text style={styles.label}>Tags</Text>
      <FlatList
        horizontal
        data={defaultTags}
        keyExtractor={(tag) => tag.id}
        contentContainerStyle={{ paddingVertical: 8 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: tag }) => {
          const selected = localTags && localTags.includes(tag.id);
          return (
            <TouchableOpacity
              style={[styles.tagChip, selected && styles.tagChipSelected]}
              onPress={() => toggleLocalTag(tag.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: !!selected }}
            >
              <Text style={[styles.tagText, selected && styles.tagTextSelected]}>
                {tag.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Dropbox Sync Date */}
      {dropboxDate && inAppCreated && (
        <>
          <Text style={styles.label}>Dropbox Sync Date</Text>
          <Text style={styles.readonlyDateText}>{formatDisplayDate(dropboxDate)}</Text>
        </>
      )}

      {/* Manual Date Picker */}
      {showManualDatePicker && (
        <>
          <TouchableOpacity
            onPress={() => !loading && setShowDatePicker(true)}
            style={styles.dateButton}
            accessibilityRole="button"
            accessibilityLabel="Edit creation date"
          >
            <Text style={styles.dateButtonText}>{formatDisplayDate(pickerDate)}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display="default"
              onChange={onChangeDate}
              maximumDate={new Date()}
            />
          )}
        </>
      )}

      {/* Buttons */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          onPress={onCancel}
          style={[styles.button, styles.cancelButton]}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSavePress}
          style={[styles.button, styles.saveButton]}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default EditRecordingForm;

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingHorizontal: 10,
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  inputWithClear: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  inputFlex: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#999',
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  tagChipSelected: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  tagText: {
    fontSize: 14,
    color: '#444',
  },
  tagTextSelected: {
    color: '#fff',
  },
  dateButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    marginBottom: 12,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#222',
  },
  readonlyDateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f7f7f7',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: '#eee',
  },
  cancelButtonText: {
    color: '#2b2b2b',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#1976d2',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
