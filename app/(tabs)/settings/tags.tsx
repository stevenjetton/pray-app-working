// /app/(tabs)/settings/tags.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTags } from '@/context/TagsContext'; // global tags context
import type { IconFamily, Tag } from '@/types/Tags';
import { getTagIcon } from '@/utils/tagIcons'; // returns { iconFamily: IconFamily; iconName: string }
import { useRecordings } from '@context/RecordingContext';
import { useRouter } from 'expo-router';

import TagIcon from '@/components/ui/TagIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_ICON_ICON = 'pricetag-outline';
const DEFAULT_ICON_FAMILY: IconFamily = 'Ionicons';

export default function TagsScreen() {
  // Expo Router for navigation
  const router = useRouter();
  const { setRecordings } = useRecordings();
  const { tags, loading, addTag, updateTag, deleteTag } = useTags();

  const [newTagInput, setNewTagInput] = useState<string>('');
  const [addingTag, setAddingTag] = useState(false);

  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagLabel, setEditingTagLabel] = useState<string>('');
  const editingInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (editingTagId !== null && editingInputRef.current) {
      editingInputRef.current.focus();
    }
  }, [editingTagId]);

  // Add new tag handler
  async function handleAddTag() {
    const label = newTagInput.trim();
    if (!label) return;

    if (tags.some(t => t.label.toLowerCase() === label.toLowerCase())) {
      Alert.alert('Duplicate Tag', 'A tag with this name already exists.');
      return;
    }

    const iconData = getTagIcon(label);

    setAddingTag(true);
    try {
      const created = await addTag({
        label,
        icon: iconData.iconName,
        iconFamily: iconData.iconFamily,
      });

      if (created) {
        setNewTagInput('');
        Keyboard.dismiss();
      } else {
        Alert.alert('Error', 'Failed to add tag (duplicate or invalid).');
      }
    } catch (error) {
      console.error('[TagsScreen] Exception adding tag:', error);
      Alert.alert('Error', 'Failed to add tag.');
    } finally {
      setAddingTag(false);
    }
  }

  // Start editing a tag
  function startEditing(tag: Tag) {
    setEditingTagId(tag.id);
    setEditingTagLabel(tag.label);
  }

  // Cancel editing
  function cancelEditing() {
    setEditingTagId(null);
    setEditingTagLabel('');
  }

  // Save edited tag
  async function saveEditedTag() {
    const newLabel = editingTagLabel.trim();
    if (!newLabel) {
      Alert.alert('Invalid Name', 'Tag name cannot be empty.');
      return;
    }
    if (!editingTagId) return;

    if (
      tags.some(
        t => t.label.toLowerCase() === newLabel.toLowerCase() && t.id !== editingTagId
      )
    ) {
      Alert.alert('Duplicate Tag', 'A tag with this name already exists.');
      return;
    }

    const originalTag = tags.find(t => t.id === editingTagId);
    if (!originalTag) {
      Alert.alert('Error', 'Original tag not found.');
      cancelEditing();
      return;
    }

    const iconData = getTagIcon(newLabel);

    const updatedTag: Tag = {
      ...originalTag,
      label: newLabel,
      icon: iconData.iconName ?? originalTag.icon ?? DEFAULT_ICON_ICON,
      iconFamily: iconData.iconFamily ?? originalTag.iconFamily ?? DEFAULT_ICON_FAMILY,
    };

    try {
      const updated = await updateTag(updatedTag);

      if (!updated) {
        Alert.alert('Error', 'Failed to update tag (duplicate or other error).');
        return;
      }

      // Update recordings tag references if needed
      setRecordings(prev =>
        prev.map(rec => ({
          ...rec,
          tags: rec.tags ? rec.tags.map(id => (id === editingTagId ? updated.id : id)) : [],
        }))
      );

      cancelEditing();
    } catch (error) {
      console.error('[TagsScreen] Exception updating tag:', error);
      Alert.alert('Error', 'Failed to update tag.');
    }
  }

  // Delete tag handler with confirmation
  function deleteTagHandler(tag: Tag) {
    console.log('[TagsScreen] deleteTagHandler CALLED for tag:', tag);
    
    // Special handling for prophetic-word tag
    const isPropheticWord = tag.id === 'prophetic-word';
    console.log('[TagsScreen] Is prophetic word tag?', isPropheticWord);
    
    Alert.alert(
      'Delete Tag',
      `Are you sure you want to delete the tag "${tag.label}"?\n\nThis will remove it from all audio files, but your audio is preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const deleted = await deleteTag(tag.id);
              if (!deleted) {
                Alert.alert('Error', 'Tag not found or could not be deleted.');
                return;
              }
              // Remove tag from all recordings in memory and persistently
              const updateRecordingsAfterTagDelete = async () => {
                const { getAllRecordings } = await import('@/services/localRecordingService');
                const all = await getAllRecordings();
                const updatedAll = all.map(rec => {
                  const after = Array.isArray(rec.tags) ? rec.tags.filter(id => id !== tag.id) : [];
                  return { ...rec, tags: after };
                });
                await AsyncStorage.setItem('recordings', JSON.stringify(updatedAll));
                setRecordings(updatedAll);
              };
              await updateRecordingsAfterTagDelete();
              // Optionally, force a refresh of the recordings context if your app supports it
              if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new Event('refreshRecordings'));
              }
              
              // Reset any URL parameters related to the deleted tag to prevent filter engagement
              // For all tags, use the explicit navigation to force a clean state
              console.log('[TagsScreen] Using explicit navigation home for tag:', tag.id);
              
              // Store a flag in AsyncStorage to indicate we just deleted a tag
              await AsyncStorage.setItem('just_deleted_tag', 'true');
              await AsyncStorage.setItem('deleted_tag_id', tag.id);
              
              // Navigate to the main tab to ensure a clean state
              router.replace('/(tabs)/voiceRecorder');
              
              if (editingTagId === tag.id) cancelEditing();



              Alert.alert('Success', 'Tag deleted and removed from all files (audio preserved).');
            } catch (error) {
              console.error('[TagsScreen] Exception deleting tag:', error);
              Alert.alert('Error', 'Failed to delete tag.');
            }
          },
        },
      ]
    );
  }

  // Render each tag item
  function renderTag({ item }: { item: Tag }) {
    const isEditing = editingTagId === item.id;

    return (
      <View style={styles.tagRow}>
        {isEditing ? (
          <>
            <TextInput
              ref={editingInputRef}
              style={styles.editInput}
              value={editingTagLabel}
              onChangeText={setEditingTagLabel}
              onSubmitEditing={saveEditedTag}
              onBlur={cancelEditing}
              returnKeyType="done"
              maxLength={30}
              accessibilityLabel={`Edit tag ${item.label}`}
            />
            <TouchableOpacity
              onPress={saveEditedTag}
              style={styles.saveButton}
              accessibilityRole="button"
              accessibilityLabel="Save tag edit"
            >
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={cancelEditing}
              style={styles.cancelButton}
              accessibilityRole="button"
              accessibilityLabel="Cancel tag edit"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TagIcon
              icon={item.icon}
              iconFamily={item.iconFamily || DEFAULT_ICON_FAMILY}
              size={22}
              color={item.color || '#333'}
              style={styles.tagIcon}
              accessibilityIgnoresInvertColors
            />
            <Text style={[styles.tagLabel, { color: item.color || '#333' }]}>
              {item.label}
            </Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={() => startEditing(item)}
                accessibilityLabel={`Rename tag ${item.label}`}
              >
                <TagIcon icon="pencil-outline" size={22} color="#1976d2" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteTagHandler(item)}
                style={{ marginLeft: 16 }}
                accessibilityLabel={`Delete tag ${item.label}`}
              >
                <TagIcon icon="trash-outline" size={22} color="#e53935" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f7faff' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <FlatList
        data={tags}
        keyExtractor={item => item.id}
        renderItem={renderTag}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Manage Encounter Types</Text>
            <View style={styles.newTagContainer}>
              <TextInput
                placeholder="Enter new tag"
                style={styles.newTagInput}
                value={newTagInput}
                onChangeText={setNewTagInput}
                onSubmitEditing={handleAddTag}
                editable={!addingTag}
                returnKeyType="done"
                maxLength={30}
                accessibilityLabel="New tag input"
              />
              <TouchableOpacity
                onPress={handleAddTag}
                disabled={addingTag || !newTagInput.trim()}
                style={[
                  styles.addButton,
                  (addingTag || !newTagInput.trim()) && styles.addButtonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add new tag"
              >
                {addingTag ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.addButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        }
        ListFooterComponent={<View style={{ height: 60 }} />}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    margin: 20,
    textAlign: 'center',
    color: '#222',
  },
  newTagContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  newTagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  addButton: {
    marginLeft: 12,
    backgroundColor: '#1976d2',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  addButtonDisabled: {
    backgroundColor: '#999',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tagIcon: {
    marginRight: 12,
  },
  tagLabel: {
    flex: 1,
    fontSize: 18,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1976d2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 18,
    backgroundColor: '#fff',
  },
  saveButton: {
    marginLeft: 12,
    backgroundColor: '#1976d2',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButton: {
    marginLeft: 8,
    backgroundColor: '#ddd',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelText: {
    color: '#333',
  },
});
