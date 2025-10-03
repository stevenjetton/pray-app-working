import { Audio } from 'expo-av';

/**
 * Preloads audio metadata (duration) for a given URI.
 * Returns duration in seconds, or 0 if unavailable.
 */
export async function preloadAudioDuration(uri: string): Promise<number> {
  try {
    const { sound, status } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false }
    );

    let duration = 0;
    // Type guard: only access duration if loaded
    if ('isLoaded' in status && status.isLoaded) {
      duration = typeof status.durationMillis === 'number' ? status.durationMillis / 1000 : 0;
    }

    await sound.unloadAsync();
    return duration;
  } catch {
    // silently ignore errors, return 0 duration
    return 0;
  }
}
