// /types/Tags.ts
export type IconFamily = 'Ionicons' | 'MaterialIcons' | 'MaterialCommunityIcons' | 'FontAwesome5';

export type Tag = {
  id: string;
  label: string;
  icon: string;       // Just a string — actual icon name
  iconFamily: IconFamily;
  color?: string;
  isCustom?: boolean;
};

// Example predefined tags - icon names as strings, families as literals
export const ALL_TAGS: Tag[] = [
  { id: 'dream', label: 'Dream', icon: 'cloudy-night-outline', iconFamily: 'Ionicons' },
  { id: 'vision', label: 'Vision', icon: 'eye-outline', iconFamily: 'Ionicons' },
  { id: 'prophetic-word', label: 'Prophetic Word', icon: 'megaphone-outline', iconFamily: 'Ionicons' },
  { id: 'trance', label: 'Trance', icon: 'moon-outline', iconFamily: 'Ionicons' },
  { id: 'scripture', label: 'Scripture', icon: 'book-outline', iconFamily: 'Ionicons' },
  { id: 'peaceful-inner-voice', label: 'Peaceful Inner Voice', icon: 'chatbubble-ellipses-outline', iconFamily: 'Ionicons' },
];

// Helper IDs array
export const ALL_TAG_IDS = ALL_TAGS.map(tag => tag.id);
