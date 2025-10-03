import { ScriptureTaggedText } from '@/components/ui/ScriptureTaggedText';
import type { Encounter } from '@/types/Encounter';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PlaybackBar } from './PlaybackBar';

interface PlaybackDrawerProps {
  recording: Encounter;
  open: boolean;
  onToggle?: () => void;
  showToggle?: boolean;
  onView?: () => void;
  onMenu?: () => void;
  onDelete?: () => void;
  showTranscription?: boolean;
  onTogglePlayPause?: () => void | Promise<void>; // Accept sync or async
}

export const PlaybackDrawer: React.FC<PlaybackDrawerProps> = ({
  recording,
  open,
  onToggle,
  showToggle = true,
  onView,
  onMenu,
  onDelete,
  showTranscription = true,
  onTogglePlayPause,
}) => {
  const router = useRouter();

  if (!recording) return null;

  return (
    <View style={styles.wrapper}>
      {showToggle && (
        <TouchableOpacity
          style={styles.header}
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={open ? 'Collapse playback drawer' : 'Expand playback drawer'}
        >
          <Text style={styles.headerTitle} numberOfLines={1}>
            {recording.title || 'Untitled recording'}
          </Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color="black" />
        </TouchableOpacity>
      )}

      {open && (
        <View style={styles.drawerContent}>
          <PlaybackBar
            recording={recording}
            onView={onView}
            onMenu={onMenu}
            onDelete={onDelete}
            onTogglePlayPause={onTogglePlayPause} // Pass down the flexible toggle prop
          />

          {showTranscription && recording.localTranscription ? (
            <TouchableOpacity
              style={styles.transcriptionPreview}
              onPress={() => router.push(`/encounters/${recording.id}`)}
              activeOpacity={0.8}
              accessibilityRole="link"
              accessibilityLabel={`View details of transcription for ${recording.title || 'recording'}`}
            >
              <ScriptureTaggedText text={recording.localTranscription} />
            </TouchableOpacity>
          ) : null}

          {!showTranscription && <></>}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 4,
    // backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    // backgroundColor: '#f5faff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: 'bold',
    color: 'black',
  },
  drawerContent: {
    paddingHorizontal: 10,
    paddingBottom: 16,
    paddingTop: 6,
    // backgroundColor: '#fff',
  },
  transcriptionPreview: {
    maxHeight: 80,
    overflow: 'hidden',
    marginTop: 12,
  },
  noTranscription: {
    marginTop: 12,
    color: '#888',
    fontStyle: 'italic',
  },
});
