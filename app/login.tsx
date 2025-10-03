// app/login.tsx

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Keyboard,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useUserContext } from '@context/UserContext';

function getFriendlyErrorMessage(code: string) {
  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/user-not-found':
      return 'No user found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    default:
      return 'Login failed. Please try again.';
  }
}

const STORAGE_EMAIL_KEY = 'userEmail';
const STORAGE_PASSWORD_KEY = 'userPassword';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthenticated, loading } = useUserContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    (async () => {
      try {
        const savedEmail = await SecureStore.getItemAsync(STORAGE_EMAIL_KEY);
        const savedPassword = await SecureStore.getItemAsync(STORAGE_PASSWORD_KEY);
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);
        }
      } catch (e) {
        // Error loading saved credentials
      }
    })();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && isAuthenticated) {
      (async () => {
        const shouldRedirect = await AsyncStorage.getItem('redirectToProfile');
        if (shouldRedirect) {
          await AsyncStorage.removeItem('redirectToProfile');
          router.replace('/profile');
        } else {
          router.replace('/dashboard');
        }
      })();
    }
  }, [isAuthenticated, loading, router]);

  const handleLogin = async () => {
    Keyboard.dismiss();
    setFormLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);

      if (rememberMe) {
        await SecureStore.setItemAsync(STORAGE_EMAIL_KEY, email.trim());
        await SecureStore.setItemAsync(STORAGE_PASSWORD_KEY, password);
      } else {
        await SecureStore.deleteItemAsync(STORAGE_EMAIL_KEY);
        await SecureStore.deleteItemAsync(STORAGE_PASSWORD_KEY);
      }

      Alert.alert('Success', 'Logged in!');
      // Redirect is handled by useEffect above
    } catch (e: any) {
      setError(getFriendlyErrorMessage(e.code));
      Alert.alert(
        'Login Error',
        (e.message ? e.message : JSON.stringify(e)) + (e.code ? `\nCode: ${e.code}` : '')
      );
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <Text style={styles.title}>Log In</Text>

        <TextInput
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="username"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          accessibilityLabel="Email input"
          returnKeyType="next"
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          accessibilityLabel="Password input"
          returnKeyType="done"
        />

        <View style={styles.rememberMeContainer}>
          <Switch
            value={rememberMe}
            onValueChange={setRememberMe}
            accessibilityLabel="Remember Me toggle"
          />
          <Text style={styles.rememberMeText}>Remember Me</Text>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Button
          title={formLoading ? 'Logging in...' : 'Log In'}
          onPress={handleLogin}
          disabled={formLoading}
          accessibilityLabel="Log In button"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    marginBottom: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMeText: {
    marginLeft: 8,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 12,
    textAlign: 'center',
  },
});
