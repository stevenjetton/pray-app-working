import type { SyncOperation, SyncResult, SyncStatus } from '@/types/Sync';
import { useUserContext } from '@context/UserContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Simulated paid check
const isPaidUser = (userProfile: any): boolean => !!userProfile?.isPaid;

// Simulated sync function
const syncAllToFirebase: (operation: SyncOperation) => Promise<SyncResult> = async () => {
  return new Promise<SyncResult>((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'All recordings synced to Firebase!',
        syncedIds: ['1', '2', '3'],
      });
    }, 2000);
  });
};

export default function CloudSyncScreen() {
  const { userProfile, loading } = useUserContext();
  const router = useRouter();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!loading && !userProfile) {
      router.replace('/login');
    }
  }, [loading, userProfile]);

  const paid = isPaidUser(userProfile);

  const handleSyncAll = async () => {
    setSyncStatus('in_progress');
    setSyncMessage(null);
    try {
      const result = await syncAllToFirebase({ type: 'all' });
      if (result.success) {
        setSyncStatus('success');
        setSyncMessage(result.message || 'Sync complete!');
        Alert.alert('Cloud Sync', result.message || 'Sync complete!');
      } else {
        setSyncStatus('error');
        setSyncMessage(result.message || 'Sync failed.');
        Alert.alert('Cloud Sync', result.message || 'Sync failed.');
      }
    } catch (error: any) {
      setSyncStatus('error');
      setSyncMessage(error?.message || 'Sync failed.');
      Alert.alert('Cloud Sync', error?.message || 'Sync failed.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!userProfile) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Cloud Sync</Text>
      <Text style={styles.info}>Your data will be synced to Firebase Cloud Firestore.</Text>

      <TouchableOpacity
        style={[
          styles.syncButton,
          (!paid || syncStatus === 'in_progress') && { opacity: 0.5 },
        ]}
        onPress={handleSyncAll}
        disabled={!paid || syncStatus === 'in_progress'}
      >
        <Text style={styles.syncButtonText}>
          {syncStatus === 'in_progress' ? 'Syncing...' : 'Sync All to Cloud'}
        </Text>
      </TouchableOpacity>

      {!paid && (
        <Text style={{ color: '#888', textAlign: 'center', marginTop: 16 }}>
          Cloud sync is available for paid users only.
        </Text>
      )}

      {syncMessage && (
        <Text
          style={{
            color: syncStatus === 'success' ? 'green' : 'red',
            textAlign: 'center',
            marginTop: 16,
          }}
        >
          {syncMessage}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#f7faff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  info: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
  syncButton: {
    backgroundColor: 'black',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'center',
  },
  syncButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});
