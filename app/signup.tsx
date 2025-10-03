import { useUserContext } from '@context/UserContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

export default function SignupScreen() {
  const router = useRouter();
  const { register, isAuthenticated, loading } = useUserContext();

  // Redirect if already logged in (after loading finishes)
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, loading]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Optional: ask for name at signup
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const handleSignup = async () => {
    setFormLoading(true);
    setError(null);
    try {
      await register(email.trim(), password, name);
      Alert.alert('Success', 'Account created! Redirecting to dashboard...');
      setEmail('');
      setPassword('');
      setName('');
      router.replace('/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Show spinner while checking auth state
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

      <TextInput
        placeholder="Name (optional)"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        placeholder="Email"
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Password"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        title={formLoading ? 'Signing up...' : 'Sign Up'}
        onPress={handleSignup}
        disabled={formLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 10, borderRadius: 4 },
  error: { color: 'red', marginBottom: 10, textAlign: 'center' },
});
