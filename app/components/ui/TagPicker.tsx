// /app/components/ui/TagPicker.tsx

import { Tag } from '@/types/Tags';
import React, { useState } from 'react';

import {
  Alert,
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
import { useTags } from '@/context/TagsContext';

type TagPickerProps = {
  selectedTagIds: string[];            // Array of selected tag IDs
  onChangeSelected: (ids: string[]) => void; // Callback when selection changes
};

// Tag pill UI component remains unchanged except icon replacement
function TagPill({
  tag,
  selected,
  onToggle,
}: {
  tag: Tag;
  selected: boolean;
  onToggle: (tagId: string) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tagPill, selected && styles.tagPillSelected]}
      onPress={() => onToggle(tag.id)}
      activeOpacity={0.7}
    >
      <TagIcon
        icon={tag.icon}
        size={18}
        color={selected ? '#fff' : tag.color || '#444'}
        style={{ marginRight: 6 }}
        accessibilityLabel={`${tag.label} icon`}
      />
      <Text style={[styles.tagLabel, selected && styles.tagLabelSelected]}>
        {tag.label}
      </Text>
    </TouchableOpacity>
  );
}

export default function TagPicker({ selectedTagIds, onChangeSelected }: TagPickerProps) {
  const { tags: allTags, addTag, loading } = useTags();

  const [addingTag, setAddingTag] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState('');

  // Toggle selection of a tag id
  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChangeSelected(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChangeSelected([...selectedTagIds, tagId]);
    }
  };

  // Add a new custom tag input submit handler
  const handleAddCustomTag = async () => {
    const label = newTagLabel.trim();
    if (!label) {
      Alert.alert('Empty tag', 'Tag name cannot be empty.');
      return;
    }
    const duplicate = allTags.find(t => t.label.toLowerCase() === label.toLowerCase());
    if (duplicate) {
      Alert.alert('Duplicate tag', `"${label}" tag already exists.`);
      return;
    }
    try {
      // Provide required icon and iconFamily properties per NewTagInput type
      const newTag = await addTag({ label, icon: 'tag', iconFamily: 'Ionicons' });
      if (newTag) {
        onChangeSelected([...selectedTagIds, newTag.id]); // auto-select new tag
        setNewTagLabel('');
        setAddingTag(false);
      } else {
        Alert.alert('Error', 'Failed to add new tag. Try again.');
      }
    } catch {
      Alert.alert('Error', 'An error occurred while adding the tag.');
    }
  };

  const cancelAddTag = () => {
    setNewTagLabel('');
    setAddingTag(false);
  };

  // Render each tag in the FlatList
  const renderTagItem = ({ item }: { item: Tag }) => (
    <TagPill
      tag={item}
      selected={selectedTagIds.includes(item.id)}
      onToggle={toggleTag}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading tags...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <FlatList
          data={allTags}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id}
          renderItem={renderTagItem}
          contentContainerStyle={styles.listContent}
        />

        {addingTag ? (
          <View style={styles.addTagContainer}>
            <TextInput
              autoFocus
              placeholder="New tag name"
              value={newTagLabel}
              onChangeText={setNewTagLabel}
              style={styles.textInput}
              onSubmitEditing={handleAddCustomTag}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={handleAddCustomTag} style={styles.addButton}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={cancelAddTag} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addTagToggle}
            onPress={() => setAddingTag(true)}
            activeOpacity={0.7}
          >
            <TagIcon icon="add-circle-outline" size={24} color="#0061ff" />
            <Text style={styles.addTagText}>Add Tag</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  listContent: {
    paddingHorizontal: 8,
  },
  tagPill: {
    backgroundColor: '#eee',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tagPillSelected: {
    backgroundColor: '#0061ff',
    borderColor: '#0051cc',
  },
  tagLabel: {
    fontSize: 14,
    color: '#444',
  },
  tagLabelSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  addTagToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  addTagText: {
    marginLeft: 6,
    color: '#0061ff',
    fontSize: 16,
    fontWeight: '600',
  },
  addTagContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  textInput: {
    flex: 1,
    borderColor: '#aaa',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 16,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#0061ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: '#2b2b2b',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
});
