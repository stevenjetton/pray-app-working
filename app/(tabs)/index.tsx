import { decode as atob, encode as btoa } from 'base-64';

// Polyfill for React Native global scope
if (typeof global.atob === 'undefined') {
  global.atob = atob;
}
if (typeof global.btoa === 'undefined') {
  global.btoa = btoa;
}

import PrayAnimation from '@components/PrayAnimation';
import { useUserContext } from '@context/UserContext';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const [animationDone, setAnimationDone] = useState(false);
  const [buttonFade] = useState(new Animated.Value(0));
  const router = useRouter();
  const { loading } = useUserContext();

  React.useEffect(() => {
    if (animationDone) {
      Animated.timing(buttonFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [animationDone]);


  // Wait for auth state before rendering main UI
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <PrayAnimation onFinish={() => setAnimationDone(true)} />
      </View>
      <Animated.View style={[styles.buttonColumn, { opacity: buttonFade }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/dashboard')}
        >
          <Text style={styles.buttonText}>Go to Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/voiceRecorder')}
        >
          <Text style={styles.buttonText}>Record Your Encounter{'\n'}With God</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 20,
    width: '100%',
  },
  buttonColumn: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 60,
  },
  actionButton: {
    backgroundColor: '#4B0082',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  syncAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'black',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'center',
    marginTop: 10,
  },
  syncAllText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 15,
  },
  cloudHint: {
    color: '#888',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
    width: '80%',
  },
});
