// utils/tagIcons.ts
import type { IconFamily } from '@/components/ui/TagIcon';

/**
 * Represents icon data with icon family and icon name.
 */
export interface TagIconData {
  iconFamily: IconFamily;
  iconName: string;
}

/**
 * Returns the icon family and icon name for a given tag label.
 * 
 * Supports multiple icon families including 'Ionicons' and 'MaterialIcons'.
 * Falls back to Ionicons 'pricetag-outline' if no match found.
 *
 * @param label - The tag label
 * @returns TagIconData object with `iconFamily` and `iconName` fields
 */
export function getTagIcon(label: string): TagIconData {
  const name = label.toLowerCase();

  // Specific icons with MaterialIcons family
  if (name === 'menu' || name === 'more options') {
    return { iconFamily: 'MaterialIcons', iconName: 'more-vert' };
  }
  if (name === 'delete') {
    return { iconFamily: 'MaterialIcons', iconName: 'delete' };
  }
  if (name === 'edit') {
    return { iconFamily: 'MaterialIcons', iconName: 'edit' };
    // Alternatively, if you prefer Ionicons 'create' icon:
    // return { iconFamily: 'Ionicons', iconName: 'create' };
  }

  // Predefined built-in tags from ALL_TAGS (Ionicons)
  if (name === 'dream') return { iconFamily: 'Ionicons', iconName: 'cloudy-night-outline' };
  if (name === 'vision') return { iconFamily: 'Ionicons', iconName: 'eye-outline' };
  if (name === 'prophetic word') return { iconFamily: 'Ionicons', iconName: 'megaphone-outline' };
  if (name === 'trance') return { iconFamily: 'Ionicons', iconName: 'moon-outline' };
  if (name === 'scripture') return { iconFamily: 'Ionicons', iconName: 'book-outline' };
  if (name === 'peaceful inner voice') return { iconFamily: 'Ionicons', iconName: 'chatbubble-ellipses-outline' };

  // Additional related encounter types (Ionicons)
  if (name.includes('book') || name.includes('reading')) return { iconFamily: 'Ionicons', iconName: 'book-outline' };
  if (name.includes('movie') || name.includes('film') || name.includes('cinema')) return { iconFamily: 'Ionicons', iconName: 'film-outline' };
  if (name.includes('thought')) return { iconFamily: 'Ionicons', iconName: 'chatbubble-ellipses-outline' };
  if (name.includes('mind')) return { iconFamily: 'Ionicons', iconName: 'bulb-outline' };
  if (name.includes('heart')) return { iconFamily: 'Ionicons', iconName: 'heart-outline' };
  if (name.includes('whisper') || name.includes('quiet')) return { iconFamily: 'Ionicons', iconName: 'volume-off-outline' };
  if (name.includes('prayer') || name.includes('pray')) return { iconFamily: 'Ionicons', iconName: 'hand-right-outline' };
  if (name.includes('washing') || name.includes('dishes')) return { iconFamily: 'Ionicons', iconName: 'water-outline' };
  if (name.includes('shower') || name.includes('showering')) return { iconFamily: 'Ionicons', iconName: 'rainy-outline' };

  // Other useful related tags (Ionicons)
  if (name.includes('call') || name.includes('phone')) return { iconFamily: 'Ionicons', iconName: 'call-outline' };
  if (name.includes('travel') || name.includes('trip')) return { iconFamily: 'Ionicons', iconName: 'car-outline' };
  if (name.includes('light')) return { iconFamily: 'Ionicons', iconName: 'bulb-outline' };
  if (name.includes('reflect')) return { iconFamily: 'Ionicons', iconName: 'sync-circle-outline' };
  if (name.includes('silence') || name.includes('still')) return { iconFamily: 'Ionicons', iconName: 'pause-circle-outline' };

  // Generic encounter-related tags (Ionicons)
  if (name.includes('encounter')) return { iconFamily: 'Ionicons', iconName: 'flash-outline' };
  if (name.includes('healing')) return { iconFamily: 'Ionicons', iconName: 'medkit-outline' };
  if (name.includes('work')) return { iconFamily: 'Ionicons', iconName: 'briefcase-outline' };
  if (name.includes('family')) return { iconFamily: 'Ionicons', iconName: 'people-outline' };
  if (name.includes('friends') || name.includes('friend')) return { iconFamily: 'Ionicons', iconName: 'people-circle-outline' };
  if (name.includes('music') || name.includes('song')) return { iconFamily: 'Ionicons', iconName: 'musical-notes-outline' };
  if (name.includes('nature')) return { iconFamily: 'Ionicons', iconName: 'leaf-outline' };
  if (name.includes('testimony')) return { iconFamily: 'Ionicons', iconName: 'sparkles-outline' };
  if (name.includes('worship')) return { iconFamily: 'Ionicons', iconName: 'musical-note-outline' };
  if (name.includes('praise')) return { iconFamily: 'Ionicons', iconName: 'sunny-outline' };

  // Fallback icon (Ionicons)
  return { iconFamily: 'Ionicons', iconName: 'pricetag-outline' };
}
