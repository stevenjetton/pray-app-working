// MUST be at the very top of the entry file before any other imports
import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/useColorScheme';

import { DropboxAuthProvider } from '@/context/DropboxAuthContext';
import { SearchProvider } from '@/context/SearchContext';
import { EncounterProvider } from '@context/EncounterContext';
import { PlaybackProvider } from '@context/PlaybackContext';
import { PlaylistProvider } from '@context/PlaylistContext';
import { RecordingProvider } from '@context/RecordingContext';
import { TagsProvider } from '@context/TagsContext';
import { UserProvider } from '@context/UserContext';

export default function RootLayout() {
  console.log('[RootLayout] rendered');
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  // <SearchProvider> is OUTERMOST app context!
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SearchProvider>
          <DropboxAuthProvider>
            <UserProvider>
              <RecordingProvider>
                <EncounterProvider>
                  <PlaybackProvider>
                    <PlaylistProvider>
                      <TagsProvider>
                      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                        <Stack>
                          {/* Main navigation */}
                          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                          <Stack.Screen name="+not-found" />
                        </Stack>
                        <StatusBar style="auto" />
                      </ThemeProvider>
                    </TagsProvider>
                  </PlaylistProvider>
                </PlaybackProvider>
              </EncounterProvider>
              </RecordingProvider>
            </UserProvider>
          </DropboxAuthProvider>
        </SearchProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
