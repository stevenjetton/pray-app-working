import { useRecordings } from '@context/RecordingContext';
import { useUserContext } from '@context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function LocalDataScreen() {
  const { userProfile, loading } = useUserContext();
  const router = useRouter();
  const { setRecordings } = useRecordings();

  const [localLoading, setLocalLoading] = useState(false);

  React.useEffect(() => {
    if (!loading && !userProfile) {
      router.replace('/login');
    }
  }, [loading, userProfile]);

  const handleClearLocalData = async () => {
    Alert.alert(
      'Clear Local Data',
      'This will permanently delete all your recordings and settings from this device. This cannot be undone.\n\nNote: Uninstalling the app will also permanently delete all your local recordings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLocalLoading(true);
            try {
              await AsyncStorage.clear();
              setRecordings([]);
              Alert.alert('Local Data', 'All local data cleared!');
            } catch (err) {
              Alert.alert('Error', 'Failed to clear local data.');
            }
            setLocalLoading(false);
          },
        },
      ]
    );
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
      <Text style={styles.title}>Local Data</Text>

      <View style={styles.warningBox}>
        <Text style={styles.warningText}>
          ⚠️ All your recordings are stored locally on this device. If you{' '}
          <Text style={{ fontWeight: 'bold' }}>clear local data</Text> <Text style={{ fontWeight: 'bold' }}>or</Text>{' '}
          <Text style={{ fontWeight: 'bold' }}>uninstall the app</Text>, your recordings will be permanently deleted and cannot be recovered. Please{' '}
          <TouchableOpacity onPress={() => router.push('/settings/cloud-sync')}>
            <Text style={{ fontWeight: 'bold', color: '#1976d2', textDecorationLine: 'underline' }}>back up important files</Text>
          </TouchableOpacity>
          {' '}before proceeding.
        </Text>
      </View>

      <TouchableOpacity style={styles.clearButton} onPress={handleClearLocalData} disabled={localLoading}>
        <Text style={styles.clearButtonText}>{localLoading ? 'Clearing...' : 'Clear Local Data'}</Text>
      </TouchableOpacity>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  warningBox: {
    backgroundColor: '#fffbe6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffe58f',
  },
  warningText: {
    color: '#ad6800',
    fontSize: 16,
    textAlign: 'center',
  },
  clearButton: {
    backgroundColor: '#e53935',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignSelf: 'center',
  },
  clearButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
});
