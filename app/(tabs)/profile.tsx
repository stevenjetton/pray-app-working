import { useEncounterContext } from '@context/EncounterContext';
import { useUserContext } from '@context/UserContext';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@services/firebase';
import { db } from '@services/firebaseService';
import { uploadFile } from '@services/storageService';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { updateEmail, updatePassword, User } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';


export default function Profile() {
  const router = useRouter();
  const { userProfile, setUserProfile, loading, clearUserProfile } = useUserContext();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  // Handle avatar upload
  const handlePickAvatar = async () => {
    setAvatarError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (result.canceled) return;
      setAvatarUploading(true);
      const asset = result.assets[0];
      if (!asset.uri || !userProfile?.uid) throw new Error('No image or user.');
      // Fetch the image as a blob
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const ext = asset.uri.split('.').pop() || 'jpg';
      const storagePath = `users/${userProfile.uid}/avatar.${ext}`;
      const url = await uploadFile(storagePath, blob);
      // Update Firestore
      await updateDoc(doc(db, 'users', userProfile.uid), { avatarUrl: url });
      setUserProfile({ ...userProfile, avatarUrl: url });
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to upload avatar.');
    } finally {
      setAvatarUploading(false);
    }
  };
  const { clearAll } = useEncounterContext();

  const [password, setPassword] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Add refs for TextInput fields
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  // Type authUser as Firebase User or null
  const [authUser, setAuthUser] = useState<User | null>(auth.currentUser);

  // Track focus state for both fields
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Use the cached profile email for display/editing
  // Start with empty input, show masked email above
  const [email, setEmail] = useState('');

  // Mask the email for display
  const maskedEmail = userProfile?.email
    ? userProfile.email.replace(/(.).+(@.+)/, (m, a, b) => a + '***' + b)
    : '';

  useEffect(() => {
    // Do not auto-fill the input, keep it empty until editing
    setEmail('');
  }, [userProfile]);

  const handleUpdateEmail = async () => {
    if (!authUser) return;
    if (email === authUser.email || !email.trim()) return;

    setLoadingEmail(true);
    setEmailSuccess(null);
    try {
      await updateEmail(authUser, email.trim());
      setEmailSuccess('Email updated successfully!');
      setTimeout(() => setEmailSuccess(null), 3000); // Auto-hide after 3s
      Alert.alert('Success', 'Email updated!');
      emailInputRef.current?.blur(); // Remove focus after update
    } catch (err: unknown) {
      const error = err as Error;
      if (error.message.includes('recent login')) {
        // Set redirect flag before logging out
        await AsyncStorage.setItem('redirectToProfile', '1');
        Alert.alert(
          'Re-authentication required',
          'Please log out and log back in, then try again.',
          [
            {
              text: 'Log Out Now',
              onPress: handleLogout,
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Error', error.message);
      }
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!authUser) return;
    if (password.length < 6) return;

    setLoadingPassword(true);
    setPasswordSuccess(null);
    setPasswordError(null);
    try {
      await updatePassword(authUser, password);
      setPasswordSuccess('Password updated successfully!');
      setTimeout(() => setPasswordSuccess(null), 3000); // Auto-hide after 3s
      setPasswordError(null);
      Alert.alert('Success', 'Password updated!');
      setPassword('');
      passwordInputRef.current?.blur(); // Remove focus after update
    } catch (err: any) {
      if (
        err.code === 'auth/requires-recent-login' ||
        (typeof err.message === 'string' && err.message.includes('recent login'))
      ) {
        // Set redirect flag before logging out
        await AsyncStorage.setItem('redirectToProfile', '1');
        const msg = 'For security, please log out and log back in, then try again.';
        setPasswordError(msg);
        Alert.alert(
          'Re-authentication required',
          msg,
          [
            {
              text: 'Log Out Now',
              onPress: handleLogout,
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        setPasswordError(err.message || 'Failed to update password.');
        Alert.alert('Error', err.message || 'Failed to update password.');
      }
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (authUser) {
        await AsyncStorage.removeItem(`animationPlayedForUser:${authUser.uid}`);
      }
      await auth.signOut();
      clearUserProfile();
      clearAll?.();
      router.replace('/login');
    } catch (err: unknown) {
      const error = err as Error;
      Alert.alert('Logout Error', error.message);
    }
  };

  if (loading) {
    return (
  <View style={[styles.modernContainer, { justifyContent: 'center', alignItems: 'center' }]}> 
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!userProfile) {
    return (
  <View style={[styles.modernContainer, { justifyContent: 'center', alignItems: 'center' }]}> 
        <Text style={{ color: '#888', fontSize: 16 }}>You must be logged in to view your profile.</Text>
      </View>
    );
  }

  // Email button enabled only if email is changed and not empty
  const emailChanged = email.trim() !== '' && email !== authUser?.email;
  // Strong password validation
  const passwordRequirements = [
    { label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
    { label: 'One uppercase letter', test: (pw: string) => /[A-Z]/.test(pw) },
    { label: 'One lowercase letter', test: (pw: string) => /[a-z]/.test(pw) },
    { label: 'One number', test: (pw: string) => /[0-9]/.test(pw) },
    { label: 'One special character', test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
  ];
  const passwordValid = passwordRequirements.every(r => r.test(password));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f7f7fa' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.modernContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              {userProfile?.avatarUrl ? (
                <>
                  <Pressable onPress={handlePickAvatar} style={styles.avatarEditOverlay} disabled={avatarUploading}>
                    <Image
                      source={{ uri: userProfile.avatarUrl }}
                      style={styles.avatarImage}
                    />
                    <View style={styles.avatarEditIconWrap}>
                      <MaterialIcons name="edit" size={20} color="#fff" />
                    </View>
                  </Pressable>
                </>
              ) : (
                <Pressable onPress={handlePickAvatar} style={styles.avatarEditOverlay} disabled={avatarUploading}>
                  {userProfile?.email ? (
                    <Text style={styles.avatarInitials}>
                      {userProfile.email[0]?.toUpperCase()}
                    </Text>
                  ) : (
                    <MaterialIcons name="person" size={36} color="#bbb" />
                  )}
                  <View style={styles.avatarEditIconWrap}>
                    <MaterialIcons name="edit" size={20} color="#fff" />
                  </View>
                </Pressable>
              )}
              {avatarUploading && (
                <View style={styles.avatarUploadingOverlay}>
                  <ActivityIndicator size="small" color="#4f8cff" />
                </View>
              )}
            </View>
            {avatarError && <Text style={{ color: '#d33', fontSize: 13, marginTop: 4 }}>{avatarError}</Text>}
          </View>
          <View style={styles.sectionDivider} />

          <Text style={styles.label}>Email</Text>
          {maskedEmail ? (
            <Text style={styles.maskedEmail}>{maskedEmail}</Text>
          ) : null}
          <View style={{ position: 'relative', marginBottom: 18 }}>
            <TextInput
              ref={emailInputRef}
              value={email}
              onChangeText={text => {
                setEmail(text);
                setEmailSuccess(null); // Clear success message on edit
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.modernInput}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              placeholder="Enter new email"
              placeholderTextColor="#bbb"
            />
            {emailFocused && email.length > 0 && (
              <Pressable
                onPress={() => {
                  setEmail('');
                  setEmailSuccess(null);
                }}
                style={styles.clearButton}
                hitSlop={10}
              >
                <MaterialIcons name="close" size={20} color="#bbb" />
              </Pressable>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.8 }]}
            onPress={handleUpdateEmail}
            disabled={loadingEmail || !emailChanged}
          >
            <Text style={styles.primaryButtonText}>
              {loadingEmail ? 'Updating...' : 'Update Email'}
            </Text>
          </Pressable>
          {emailSuccess && (
            <Text style={styles.successMessage}>{emailSuccess}</Text>
          )}

          <View style={styles.sectionDivider} />

          <Text style={styles.label}>New Password</Text>
          <View style={{ position: 'relative', marginBottom: 8 }}>
            <TextInput
              ref={passwordInputRef}
              value={password}
              onChangeText={text => {
                setPassword(text);
                setPasswordSuccess(null); // Clear success message on edit
                setPasswordError(null); // Clear error message on edit
              }}
              secureTextEntry
              placeholder="Enter new password"
              style={styles.modernInput}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              placeholderTextColor="#bbb"
            />
            {passwordFocused && password.length > 0 && (
              <Pressable
                onPress={() => {
                  setPassword('');
                  setPasswordSuccess(null);
                  setPasswordError(null);
                }}
                style={styles.clearButton}
                hitSlop={10}
              >
                <MaterialIcons name="close" size={20} color="#bbb" />
              </Pressable>
            )}
          </View>
          {password.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              {passwordRequirements.map((req, idx) => (
                <Text
                  key={req.label}
                  style={{
                    color: req.test(password) ? '#2ecc71' : '#bbb',
                    fontSize: 13,
                    marginBottom: idx === passwordRequirements.length - 1 ? 0 : 2,
                  }}
                >
                  {req.test(password) ? '✓' : '•'} {req.label}
                </Text>
              ))}
            </View>
          )}
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.8 }]}
            onPress={handleUpdatePassword}
            disabled={loadingPassword || !passwordValid}
          >
            <Text style={styles.primaryButtonText}>
              {loadingPassword ? 'Updating...' : 'Update Password'}
            </Text>
          </Pressable>
          {passwordSuccess && (
            <Text style={styles.successMessage}>{passwordSuccess}</Text>
          )}
          {passwordError && (
            <Text style={styles.errorMessage}>{passwordError}</Text>
          )}

          <View style={styles.sectionDivider} />

          <Pressable
            style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.8 }]}
            onPress={handleLogout}
          >
            <MaterialIcons name="logout" size={20} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    resizeMode: 'cover',
  },
  avatarEditOverlay: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarEditIconWrap: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4f8cff',
    borderRadius: 12,
    padding: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    zIndex: 2,
  },
  modernContainer: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f7f7fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 32,
    marginBottom: 32,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e6e6ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarInitials: {
    fontSize: 32,
    color: '#888',
    fontWeight: 'bold',
  },
  profileTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#222',
    letterSpacing: 0.5,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 18,
    width: '100%',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
    marginBottom: 2,
  },
  maskedEmail: {
    color: '#888',
    fontSize: 15,
    marginBottom: 2,
  },
  modernInput: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafbfc',
    marginBottom: 0,
    color: '#222',
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    top: 14,
    zIndex: 2,
  },
  primaryButton: {
    backgroundColor: '#4f8cff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  logoutButton: {
    backgroundColor: '#d33',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  successMessage: {
    color: '#2ecc71',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
    fontSize: 15,
  },
  errorMessage: {
    color: '#d33',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
    fontSize: 15,
  },
});
