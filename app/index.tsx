import 'react-native-get-random-values';

import 'react-native-gesture-handler';
import 'react-native-reanimated';

import PrayAnimation from '@components/PrayAnimation';
import { useUserContext } from '@context/UserContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function LandingScreen() {
  const router = useRouter();
  const { isAuthenticated, loading } = useUserContext();

  const [animationDone, setAnimationDone] = useState(false);
  const [buttonFade] = useState(new Animated.Value(0));

  // Redirect if authenticated (after loading finishes)
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, loading]);

  useEffect(() => {
    if (animationDone) {
      Animated.timing(buttonFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [animationDone]);

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
          onPress={() => router.push('/login')}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/signup')}
        >
          <Text style={styles.buttonText}>Sign Up</Text>
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
});
