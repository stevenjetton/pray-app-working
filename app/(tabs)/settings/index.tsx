import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useLayoutEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import TagIcon from '@/components/ui/TagIcon';

const options = [
  { label: 'Manage Encounter Types', icon: 'pricetag-outline', route: '/settings/tags' },
  { label: 'Cloud Sync', icon: 'cloud-upload-outline', route: '/settings/cloud-sync' },
  { label: 'Local Data', icon: 'folder-open-outline', route: '/settings/local-data' },
  { label: 'Reformat Old Transcripts', icon: 'create-outline', route: '/settings/reformat-transcripts' }, 
] as const;

export default function SettingsHome() {
  const router = useRouter();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerTitle: () => null,
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.list}>
        {options.map(({ label, icon, route }) => (
          <Pressable
            key={label}
            style={({ pressed }) => [
              styles.item,
              pressed && styles.itemPressed,
            ]}
            onPress={() => router.push(route)}
            accessibilityRole="button"
            accessibilityLabel={`Go to ${label} settings`}
          >
            <TagIcon icon={icon} size={24} color="#1976d2" style={styles.icon} />
            <Text style={styles.label}>{label}</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#2b2b2b"
              style={styles.chevron}
              accessibilityElementsHidden={true}
              importantForAccessibility="no-hide-descendants"
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 24,
    color: '#222',
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  itemPressed: {
    backgroundColor: '#e6f0ff',
  },
  icon: {
    marginRight: 16,
  },
  label: {
    flex: 1,
    fontSize: 18,
    color: '#1976d2',
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 8,
  },
});
