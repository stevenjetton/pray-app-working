import { Link, Stack, usePathname, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@components/ThemedText';
import { ThemedView } from '@components/ThemedView';

export default function NotFoundScreen() {
  const segments = useSegments();
  const pathname = usePathname();
  const [maybePath, setMaybePath] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  // Try to get current path info from multiple sources
  useEffect(() => {
    try {
      // Try React Navigation internal API (mostly web)
      // @ts-ignore
      const navName = window?.navigation?.getCurrentRoute?.()?.name;
      if (navName) {
        setMaybePath(navName);
        return;
      }

      // Try location pathname (web)
      if (typeof location !== 'undefined') {
        setMaybePath(location.pathname);
        return;
      }

      // Fallback to expo-router's usePathname hook value (native + web)
      if (pathname) {
        setMaybePath(pathname);
        return;
      }
    } catch (e: any) {
      setError('Path fetch error: ' + String(e?.message || e));
    }
  }, [pathname]);

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <ThemedView style={styles.container}>
        <ThemedText type="title">This screen does not exist.</ThemedText>
        <View style={{ marginVertical: 16 }}>
          <ThemedText>
            <Text style={{ fontWeight: 'bold' }}>Segments:</Text>{' '}
            {JSON.stringify(segments)}
          </ThemedText>
          {maybePath && (
            <ThemedText>
              <Text style={{ fontWeight: 'bold' }}>Detected Path:</Text> {maybePath}
            </ThemedText>
          )}
          {error && (
            <ThemedText style={{ color: 'red' }}>{error}</ThemedText>
          )}
        </View>
        <Link href="/" style={styles.link}>
          <ThemedText type="link">Go to home screen!</ThemedText>
        </Link>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
