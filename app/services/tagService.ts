// /services/tagService.ts
import { Tag } from '@/types/Tags';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import ALL_TAGS — your predefined tags list from your shared types file
import { ALL_TAGS } from '@/types/Tags';

// AsyncStorage keys for user data
const STORAGE_KEYS = {
  customTags: 'custom_tags',
  editedPredefinedTags: 'edited_predefined_tags',
  deletedPredefinedTags: 'deleted_predefined_tags',
};

// Default icon to assign for new/custom tags lacking one
const DEFAULT_ICON: Tag['icon'] = 'pricetag-outline';

// Simple UUID generator (for demo, consider using a proper UUID lib)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper to read JSON from AsyncStorage or default value
async function readJson<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch (e) {
    // optionally log error
  }
  return defaultValue;
}

// Helper to write JSON to AsyncStorage
async function writeJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // optionally log error
  }
}

// Get user custom tags from AsyncStorage
async function getCustomTags(): Promise<Tag[]> {
  const tags = await readJson<Tag[]>(STORAGE_KEYS.customTags, []);
  // Ensure every custom tag has an icon; assign default if missing
  return tags.map(t => ({
    ...t,
    icon: t.icon || DEFAULT_ICON,
  }));
}

// Save user custom tags to AsyncStorage
async function saveCustomTags(tags: Tag[]): Promise<void> {
  await writeJson(STORAGE_KEYS.customTags, tags);
}

// Get edited predefined tags overrides
async function getEditedPredefinedTags(): Promise<Record<string, Partial<Tag>>> {
  return await readJson<Record<string, Partial<Tag>>>(STORAGE_KEYS.editedPredefinedTags, {});
}

// Save edited predefined tags overrides
async function saveEditedPredefinedTags(data: Record<string, Partial<Tag>>): Promise<void> {
  await writeJson(STORAGE_KEYS.editedPredefinedTags, data);
}

// Get list of deleted predefined tag IDs (soft deletion)
async function getDeletedPredefinedTags(): Promise<string[]> {
  return await readJson<string[]>(STORAGE_KEYS.deletedPredefinedTags, []);
}

// Save deleted predefined tag IDs
async function saveDeletedPredefinedTags(ids: string[]): Promise<void> {
  await writeJson(STORAGE_KEYS.deletedPredefinedTags, ids);
}

// Public API:

/**
 * Get all tags merged: predefined tags with user edits applied,
 * soft delete filtering, plus user custom tags.
 */
export async function getAllMergedTags(): Promise<Tag[]> {
  const customTags = await getCustomTags();
  const editedTags = await getEditedPredefinedTags();
  const deletedTags = await getDeletedPredefinedTags();

  // Filter out deleted predefined tags
  const predefinedFiltered = ALL_TAGS.filter(tag => !deletedTags.includes(tag.id));

  // Apply edits/overrides on predefined tags
  const mergedPredefined = predefinedFiltered.map(tag => {
    const override = editedTags[tag.id];
    if (override) {
      return { ...tag, ...override };
    }
    return tag;
  });

  // Combine and return
  return [...mergedPredefined, ...customTags];
};

type AddCustomTagInput = {
  label: string;
  color?: string | null;
  icon?: Tag['icon'];
  iconFamily?: Tag['iconFamily'];
};

/**
 * Add a new user custom tag with label, optional color, icon, and iconFamily.
 * Assigns a generated UUID and default icon if not provided.
 * Returns the new Tag or null if duplicate or invalid.
 */
export async function addCustomTag({
  label,
  color,
  icon,
  iconFamily,
}: AddCustomTagInput): Promise<Tag | null> {
  const trimmedLabel = label.trim();
  if (!trimmedLabel) return null;

  const allTags = await getAllMergedTags();

  // Prevent duplicates (case-insensitive label)
  if (allTags.some(t => t.label.toLowerCase() === trimmedLabel.toLowerCase())) {
    return null;
  }

const newTag: Tag = {
  id: generateUUID(),
  label: trimmedLabel,
  isCustom: true,
  icon: icon ?? DEFAULT_ICON,
  iconFamily: iconFamily ?? 'Ionicons',
  ...(color ? { color } : {}),
};


  const customTags = await getCustomTags();
  customTags.push(newTag);
  await saveCustomTags(customTags);
  return newTag;
}

/**
 * Update any tag (predefined or custom).
 * Updates user custom tags directly.
 * Updates predefined tags as overrides stored in AsyncStorage.
 * Returns the updated Tag or null (on failure/duplicate).
 */
export async function updateTag(updatedTag: Tag): Promise<Tag | null> {
  if (!updatedTag?.label?.trim()) return null;

  const labelLower = updatedTag.label.trim().toLowerCase();
  const allTags = await getAllMergedTags();

  // Prevent duplicate labels except self
  if (allTags.some(t => t.label.toLowerCase() === labelLower && t.id !== updatedTag.id)) {
    return null;
  }

  if (updatedTag.isCustom) {
    // Update user custom tag
    const customTags = await getCustomTags();
    const index = customTags.findIndex(t => t.id === updatedTag.id);
    if (index === -1) return null;

    customTags[index] = {
      ...customTags[index],
      ...updatedTag,
      label: updatedTag.label.trim(),
      icon: updatedTag.icon || DEFAULT_ICON,
    };
    await saveCustomTags(customTags);
    return customTags[index];
  } else {
    // Update predefined tag override (stored separately)
    const editedTags = await getEditedPredefinedTags();
    editedTags[updatedTag.id] = {
      label: updatedTag.label.trim(),
      color: updatedTag.color,
      icon: updatedTag.icon || DEFAULT_ICON,
    };
    await saveEditedPredefinedTags(editedTags);

    // Return the merged tag
    const predefined = ALL_TAGS.find(t => t.id === updatedTag.id);
    if (!predefined) return null;
    return { ...predefined, ...editedTags[updatedTag.id] };
  }
}

/**
 * Soft delete tag by ID. If custom tag, delete from custom tags.
 * If predefined tag, add id to deleted list.
 * Removes any edits for that predefined tag.
 * Returns true if deletion successful, false otherwise.
 */
export async function deleteTagById(id: string): Promise<boolean> {
  const customTags = await getCustomTags();
  const customIndex = customTags.findIndex(t => t.id === id);

  if (customIndex !== -1) {
    // Delete user custom tag
    customTags.splice(customIndex, 1);
    await saveCustomTags(customTags);
    return true;
  }

  // Check predefined tag
  const predefined = ALL_TAGS.find(t => t.id === id);
  if (!predefined) return false; // Tag not found

  // Add to deleted predefined tags
  let deletedTags = await getDeletedPredefinedTags();
  if (deletedTags.includes(id)) return false; // Already deleted

  deletedTags.push(id);
  await saveDeletedPredefinedTags(deletedTags);

  // Remove any edit overrides for deleted tag
  const editedTags = await getEditedPredefinedTags();
  if (editedTags[id]) {
    delete editedTags[id];
    await saveEditedPredefinedTags(editedTags);
  }

  return true;
}
