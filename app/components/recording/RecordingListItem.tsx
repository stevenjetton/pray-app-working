import { PlaybackProgressRow } from '@/components/playback/PlaybackProgressRow';
import type { Encounter } from '@/types/Encounter';
import type { Tag } from '@/types/Tags';
import { formatDateForDisplay } from '@/utils/dateHelpers';
import { Ionicons } from '@expo/vector-icons';
import HighlightText from '@sanar/react-native-highlight-text';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Collapsible from 'react-native-collapsible';
import { Swipeable } from 'react-native-gesture-handler';
import Popover from 'react-native-popover-view';

import EditRecordingForm from '@/components/recording/EditRecordingForm';
import { ScriptureTaggedText } from '@/components/ui/ScriptureTaggedText';
import TagIcon from '@/components/ui/TagIcon';
import { getTagIcon } from '@/utils/tagIcons';

const DASHBOARD_TAG_COLOR = '#1976d2';
const icons = {
  delete: getTagIcon('delete'),
  edit: getTagIcon('edit'),
};

function getEncounterDisplayDate(encounter: Encounter): string {
  if (encounter.imported && encounter.dropboxModified) {
    try {
      return new Date(encounter.dropboxModified).toISOString();
    } catch {
      return '';
    }
  }
  return encounter.createdDate ?? '';
}

const formatDuration = (seconds?: number) => {
  if (!seconds || isNaN(seconds)) return '0:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

type Props = {
  item: Encounter;
  index: number;
  expanded: boolean;
  isEditing: boolean;
  showPopover: boolean;
  isCurrent: boolean;
  editTitle: string;
  editTags: string[];
  editPlace: string;
  selectedRecording?: Encounter | null;
  isPlaying: boolean;
  playRecording: (item: Encounter) => Promise<void>;
  pausePlayback: () => Promise<void>;
  skipBy: (amount: number) => void;
  position: number;
  duration: number;
  stopPlayback: () => Promise<void>;
  onView: (item: Encounter) => void;
  setExpandedId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditId: React.Dispatch<React.SetStateAction<string | null>>;
  setPopoverId: React.Dispatch<React.SetStateAction<string | null>>;
  onTogglePlayback?: (item: Encounter) => Promise<void>;
  startEdit: (item: Encounter) => void;
  saveEdit: (item: Encounter, createdDate: string) => void | Promise<void>;
  toggleEditTag: (tag: string) => void;
  setEditTitle: React.Dispatch<React.SetStateAction<string>>;
  setEditTags: React.Dispatch<React.SetStateAction<string[]>>;
  setEditPlace: React.Dispatch<React.SetStateAction<string>>;
  editCreatedDate?: string;
  setEditCreatedDate?: React.Dispatch<React.SetStateAction<string>>;
  handleDelete: (item: Encounter) => void;
  isBusy: boolean;
  allTags: Tag[];
  addCustomTag?: (label: string) => Promise<Tag>;
  searchQuery: string;
  editId: string | null;
  onCancelEdit: () => void;
};

function extractSnippet(text: string, query: string, snippetLength = 120): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);
  if (matchIndex === -1) {
    return text.length > snippetLength ? text.slice(0, snippetLength) + '...' : text;
  }
  const start = Math.max(0, matchIndex - snippetLength / 3);
  const end = Math.min(text.length, start + snippetLength);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return prefix + text.slice(start, end) + suffix;
}

const RecordingListItem = React.memo(
  ({
    item,
    index,
    expanded,
    isEditing,
    showPopover,
    isCurrent,
    isPlaying,
    playRecording,
    toggleEditTag,
    pausePlayback,
    skipBy,
    position,
    stopPlayback,
    onView,
    setExpandedId,
    setEditId,
    setPopoverId,
    startEdit,
    handleDelete,
    editCreatedDate,
    setEditCreatedDate,
    allTags,
    searchQuery = '',
    saveEdit,
    editTitle,
    editTags,
    editPlace,
    setEditTitle,
    setEditPlace,
    isBusy,
    addCustomTag,
    editId,
    onCancelEdit,
  }: Props) => {
  // [RecordingListItem] Render start - id: item.id, isEditing: isEditing, expanded: expanded, editTitle: editTitle, editPlace: editPlace

    // Swipeable ref for controlling swipe actions
    const swipeableRef = useRef<Swipeable>(null);
    
    // Track swipe state to prevent accidental touches
    const [isSwipeActive, setIsSwipeActive] = useState(false);
    const swipeActiveRef = useRef(false);

    const [, setLocalEditCreatedDate] = useState<string>(
      item.createdDate ?? new Date().toISOString(),
    );
    const [localDuration, setLocalDuration] = useState<number | null>(
      item.duration && item.duration > 0 ? item.duration : null,
    );
    const [durationError, setDurationError] = useState(false);
    const isStoppingRef = useRef(false);
    const snippetOpacity = useRef(new Animated.Value(0)).current;

  // No search bar reveal/hide logic here; only highlight logic remains

    const safeStopPlayback = async () => {
      if (isStoppingRef.current) return;
      isStoppingRef.current = true;
      try {
        await stopPlayback();
      } finally {
        isStoppingRef.current = false;
      }
    };

  // Removed effect that caused infinite update loop with setEditCreatedDate

    useEffect(() => {
      setLocalEditCreatedDate(editCreatedDate ?? item.createdDate ?? new Date().toISOString());
    }, [item.createdDate, editCreatedDate]);

    useEffect(() => {
      let cancelled = false;
      async function loadDuration() {
        if (expanded && localDuration == null && item.uri) {
          try {
            const { Audio } = await import('expo-av');
            const { sound, status } = await Audio.Sound.createAsync({ uri: item.uri }, { shouldPlay: false });
            if (!cancelled) {
              if (status.isLoaded && status.durationMillis) {
                setLocalDuration(status.durationMillis / 1000);
              } else {
                setDurationError(true);
              }
            }
            await sound.unloadAsync();
          } catch (e) {
            if (!cancelled) setDurationError(true);
          }
        }
      }
      loadDuration();
      return () => {
        cancelled = true;
      };
    }, [expanded, item.uri]);

    let durationContent: React.ReactNode;
    if (!item.uri) {
      durationContent = <Text style={{ color: 'red' }}>Audio file not found.</Text>;
    } else if (durationError) {
      durationContent = <Text style={{ color: 'red' }}>Duration unavailable</Text>;
    } else {
      durationContent = <Text style={styles.length}>{localDuration !== null ? formatDuration(localDuration) : '...'}</Text>;
    }

    const onRecordingPress = async () => {
      if (editId && editId !== item.id) {
        // [VoiceRecorder] Edit is active on different recording, cancelling edit to switch
        onCancelEdit();
        await safeStopPlayback();
        setExpandedId(item.id);
        setPopoverId(null);
        return;
      }

      if (expanded) {
        await safeStopPlayback();
        setExpandedId(null);
        setEditId(null);
      } else {
        await safeStopPlayback();
        setExpandedId(item.id);
      }
      setPopoverId(null);
    };

    const onStartEdit = (item: Encounter) => {
      startEdit(item);
      const dateToUse = item.createdDate ?? new Date().toISOString();
      setLocalEditCreatedDate(dateToUse);
      if (setEditCreatedDate) setEditCreatedDate(dateToUse);
    };

    const transcriptionSnippet = useMemo(() => {
      if (searchQuery.trim() === '') return '';
      if (item.cloudTranscription) {
        return extractSnippet(item.cloudTranscription, searchQuery);
      }
      if (item.localTranscription) {
        return extractSnippet(item.localTranscription, searchQuery);
      }
      return '';
    }, [searchQuery, item.cloudTranscription, item.localTranscription]);

    // Handle delete action
    const handleDeletePress = () => {
      console.log('[RecordingListItem] Delete pressed - clearing swipe state');
      // Add haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Clear swipe state immediately
      setIsSwipeActive(false);
      swipeActiveRef.current = false;
      // Close the swipeable first
      swipeableRef.current?.close();
      // Call the delete handler
      handleDelete(item);
    };

    // Handle swipe progress for haptic feedback

    // Render the delete action that appears on swipe
    const renderRightActions = () => {
      return (
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={handleDeletePress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Delete recording ${item.title || 'Untitled'}`}
        >
          <Ionicons name="trash" size={20} color="#ffffff" />
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      );
    };




    return (
      <Swipeable
        ref={swipeableRef}
        renderRightActions={expanded ? undefined : renderRightActions}
        rightThreshold={60} // Slightly higher threshold
        friction={1.5} // Slightly less friction for smoother feel
        overshootRight={false} // Prevent overshooting past the action
        enabled={!expanded} // Disable swipe when playback drawer is expanded
        onSwipeableWillOpen={(direction) => {
          console.log('[RecordingListItem] Swipe will open, direction:', direction);
          // Set swipe active when any swipe starts
          setIsSwipeActive(true);
          swipeActiveRef.current = true;
        }}
        onSwipeableRightWillOpen={() => {
          console.log('[RecordingListItem] Right swipe will open - setting swipe active');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsSwipeActive(true);
          swipeActiveRef.current = true;
        }}
        onSwipeableRightOpen={() => {
          console.log('[RecordingListItem] Right swipe opened - ensuring swipe remains active');
          setIsSwipeActive(true);
          swipeActiveRef.current = true;
        }}
        onSwipeableClose={() => {
          console.log('[RecordingListItem] Swipe closed - clearing swipe active after delay');
          // Clear swipe state after a longer delay to prevent immediate touch
          setTimeout(() => {
            setIsSwipeActive(false);
            swipeActiveRef.current = false;
            console.log('[RecordingListItem] Swipe state cleared');
          }, 300); // Increased delay to 300ms
        }}
        onSwipeableOpen={() => {
          console.log('[RecordingListItem] Swipe opened - keeping swipe active');
          swipeActiveRef.current = true;
        }}
      >
        <View accessible accessibilityLabel={`Recording ${item.title || 'Untitled'}`} style={[
          { backgroundColor: '#ffffff' }, 
          index === 0 && styles.firstRecordingItem
        ]}>
          <TouchableOpacity
            onPress={() => {
              // Double-check swipe state before executing press
              if (swipeActiveRef.current || isSwipeActive) {
                console.log('[RecordingListItem] onPress blocked - swipe is active');
                return;
              }
              onRecordingPress();
            }}
            onPressIn={() => {
              // If swipe is active, prevent any press interaction
              if (swipeActiveRef.current || isSwipeActive) {
                console.log('[RecordingListItem] onPressIn blocked - swipe is active');
                return false;
              }
            }}
            style={[styles.recordingItem, expanded && styles.recordingItemNoBorder]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Expand or collapse recording ${item.title || 'Untitled'}`}
          testID={`expand-row-${item.id}`}
        >
          {isEditing ? (
            <Animated.View style={{ maxHeight: 420 }}>
              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
                <EditRecordingForm
                  title={editTitle}
                  setTitle={setEditTitle}
                  place={editPlace}
                  setPlace={setEditPlace}
                  tags={editTags}
                  toggleTag={toggleEditTag}
                  defaultTags={allTags}
                  onSave={async (title, place, tags) => {
                    console.log('[RecordingListItem] onSave called with:', { title, place, tags });
                    console.log('[RecordingListItem] Current parent state values:', { 
                      editTitle, 
                      editPlace, 
                      editTags 
                    });
                    const updatedEncounter: Encounter = {
                      ...item,
                      title,
                      tags,
                      place,
                      createdDate: editCreatedDate ?? new Date().toISOString(),
                    };
                    console.log('[RecordingListItem] onSaveEdit - Final updatedEncounter:', { 
                      id: updatedEncounter.id,
                      title: updatedEncounter.title, 
                      place: updatedEncounter.place, 
                      tags: updatedEncounter.tags 
                    });
                    try {
                      await saveEdit(updatedEncounter, updatedEncounter.createdDate ?? new Date().toISOString());
                      console.log('[RecordingListItem] saveEdit success');
                    } catch (err) {
                      console.error('[RecordingListItem] ERROR in saveEdit:', err);
                      throw err;
                    }
                  }}
                  onCancel={onCancelEdit}
                  loading={isBusy}
                  addCustomTag={addCustomTag}
                  createdDate={editCreatedDate ?? new Date().toISOString()}
                  setCreatedDate={setEditCreatedDate!}
                  dropboxModified={item.dropboxModified ? String(item.dropboxModified) : undefined}
                />
              </ScrollView>
            </Animated.View>
          ) : (
            <>
              <View style={styles.titleTagsRow}>   
                <HighlightText
                  searchWords={[searchQuery.trim()]}
                  textToHighlight={item.title || 'Untitled'}
                  highlightStyle={{ backgroundColor: 'yellow' }}
                  style={styles.recordingTitle}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                />
                <View style={styles.tagsRow}>
                  {item.tags &&
                    item.tags.length > 0 &&
                    item.tags.map(tagId => {
                        const tagObj = allTags.find(t => t.id === tagId);
                        if (!tagObj) return null;
                        return (
                          <View key={tagId} style={[styles.tagChip, { backgroundColor: tagObj.color || DASHBOARD_TAG_COLOR }]}> 
                            <TagIcon icon={tagObj.icon} iconFamily={tagObj.iconFamily || 'Ionicons'} size={14} color="#fff" style={{ marginRight: 4 }} />
                            <Text style={[styles.tagText, { color: '#fff' }]}>{tagObj.label}</Text>
                          </View>
                        );
                      })}
                </View>
              </View>
              {/* Show snippet under title if searching and match found */}
              {searchQuery.trim() !== '' && transcriptionSnippet !== '' && !isEditing && (
                <View style={{ marginTop: 2, marginBottom: 2, marginRight: 8 }}>
                  {item.cloudTranscription ? (
                    <HighlightText
                      searchWords={[searchQuery.trim()]}
                      textToHighlight={transcriptionSnippet}
                      highlightStyle={{ backgroundColor: 'yellow' }}
                      style={{ color: '#333', fontSize: 13 }}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    />
                  ) : item.localTranscription ? (
                    <ScriptureTaggedText
                      text={transcriptionSnippet}
                      highlightWords={searchQuery.trim() ? [searchQuery.trim()] : []}
                      highlightStyle={{ backgroundColor: 'yellow' }}
                      style={{ color: '#333', fontSize: 13 }}
                    />
                  ) : null}
                </View>
              )}
              <View style={styles.metaRow}>
                <View style={styles.datePlaceRow}>
                  <Text style={styles.date} numberOfLines={1} ellipsizeMode="tail">
                    {formatDateForDisplay(getEncounterDisplayDate(item))}
                  </Text>
                  {item.place && item.place.trim() !== '' && (
                    <>
                      <Text style={styles.pipe}>|</Text>
                      <Text style={styles.place} numberOfLines={1} ellipsizeMode="tail">
                        {item.place}
                      </Text>
                    </>
                  )}
                </View>
                <View style={styles.durationContainer}>
                  {durationContent}
                  {item.synced && <TagIcon icon="cloud-done" size={18} color="black" style={{ marginLeft: 8, marginTop: 2 }} />}
                </View>
              </View>
            </>
          )}
        </TouchableOpacity>

        {expanded && transcriptionSnippet !== '' && !isEditing && (
          <Animated.View style={[{ opacity: snippetOpacity }, { marginHorizontal: 12, marginBottom: 8 }]}>
            {item.cloudTranscription ? (
              <HighlightText
                searchWords={[searchQuery.trim()]}
                textToHighlight={transcriptionSnippet}
                highlightStyle={{ backgroundColor: 'yellow' }}
                style={{ color: '#333', fontSize: 14 }}
              />
            ) : item.localTranscription ? (
              <ScriptureTaggedText
                text={transcriptionSnippet}
                highlightWords={searchQuery.trim() ? [searchQuery.trim()] : []}
                highlightStyle={{ backgroundColor: 'yellow' }}
                style={{ color: '#333', fontSize: 14 }}
              />
            ) : null}
          </Animated.View>
        )}

        <Collapsible collapsed={!expanded} align="top">
          <View style={styles.drawer} accessible accessibilityLabel={`Controls for ${item.title || 'Untitled'}`}>
            <PlaybackProgressRow
              position={isCurrent ? position : 0}
              duration={localDuration ?? undefined}
              loading={!!expanded && !!item.uri && localDuration == null && !durationError}
              error={durationError || !item.uri}
            />
            <View style={styles.drawerRow}>
              <TouchableOpacity onPress={() => onView(item)} style={{ padding: 4 }} accessibilityRole="button" accessibilityLabel={`View details for ${item.title || 'Untitled'}`} testID={`view-details-${item.id}`}>
                <TagIcon icon="eye" size={24} color="black" />
              </TouchableOpacity>

              <View style={styles.centerControls}>
                <TouchableOpacity
                  style={styles.circleButton}
                  onPress={() => skipBy(-15)}
                  disabled={!isCurrent}
                  accessibilityRole="button"
                  accessibilityLabel={`Skip back 15 seconds for ${item.title || 'Untitled'}`}
                  testID={`skip-back-${item.id}`}
                >
                  <TagIcon icon="reload" size={38} color="black" style={{ transform: [{ scaleX: -1 }] }} />
                  <Text style={styles.circleText}>15</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={async () => {
                    if (isCurrent && isPlaying) {
                      await pausePlayback();
                    } else {
                      await playRecording(item);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={isCurrent && isPlaying ? `Pause playback for ${item.title || 'Untitled'}` : `Play recording ${item.title || 'Untitled'}`}
                  testID={`play-pause-${item.id}`}
                >
                  <TagIcon icon={isCurrent && isPlaying ? 'pause-circle' : 'play-circle'} size={56} color="black" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.circleButton}
                  onPress={() => skipBy(15)}
                  disabled={!isCurrent}
                  accessibilityRole="button"
                  accessibilityLabel={`Skip forward 15 seconds for ${item.title || 'Untitled'}`}
                  testID={`skip-forward-${item.id}`}
                >
                  <TagIcon icon="reload" size={40} color="black" />
                  <Text style={styles.circleText}>15</Text>
                </TouchableOpacity>
              </View>

              <Popover
                isVisible={showPopover}
                from={
                  <TouchableOpacity
                    style={styles.moreButton}
                    onPress={() => setPopoverId(showPopover ? null : item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Show options for ${item.title || 'Untitled'}`}
                    testID={`more-options-${item.id}`}
                  >
                    <TagIcon icon="more-vert" iconFamily="MaterialIcons" size={24} color="#444" />
                  </TouchableOpacity>
                }
                onRequestClose={() => setPopoverId(null)}
              >
                <View style={styles.popoverMenu}>
                  <TouchableOpacity
                    style={styles.optionsMenuItem}
                    onPress={() => {
                      setPopoverId(null);
                      onStartEdit(item);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit recording ${item.title || 'Untitled'}`}
                    testID={`edit-recording-${item.id}`}
                  >
                    <TagIcon icon={icons.edit.iconName} iconFamily={icons.edit.iconFamily} />
                    <Text style={styles.optionsMenuText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionsMenuItem}
                    onPress={() => handleDelete(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete recording ${item.title || 'Untitled'}`}
                    testID={`delete-recording-${item.id}`}
                  >
                    <TagIcon icon={icons.delete.iconName} iconFamily={icons.delete.iconFamily} />
                    <Text style={[styles.optionsMenuText, { color: '#e53935' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </Popover>
            </View>
          </View>
        </Collapsible>
      </View>
      </Swipeable>
    );
  },
  (prevProps, nextProps) => {
    const a = prevProps.item;
    const b = nextProps.item;
  let different = false;
  if (a.id !== b.id) { /* [Memo comparator] Field changed for id:a.id field:id */ different = true; }
  if (a.title !== b.title) { /* [Memo comparator] Field changed for id:a.id field:title */ different = true; }
  if (a.place !== b.place) { /* [Memo comparator] Field changed for id:a.id field:place */ different = true; }
  if (a.createdDate !== b.createdDate) { /* [Memo comparator] Field changed for id:a.id field:createdDate */ different = true; }
  if (a.localTranscription !== b.localTranscription) { different = true; }
  if (a.cloudTranscription !== b.cloudTranscription) { different = true; }
  if (a.duration !== b.duration) { /* [Memo comparator] Field changed for id:a.id field:duration */ different = true; }
  if (a.uri !== b.uri) { /* [Memo comparator] Field changed for id:a.id field:uri */ different = true; }
  if (a.imported !== b.imported) { /* [Memo comparator] Field changed for id:a.id field:imported */ different = true; }
  if (a.dropboxFileId !== b.dropboxFileId) { /* [Memo comparator] Field changed for id:a.id field:dropboxFileId */ different = true; }
  if (a.dropboxModified !== b.dropboxModified) { /* [Memo comparator] Field changed for id:a.id field:dropboxModified */ different = true; }
  if (a.dropboxRev !== b.dropboxRev) { /* [Memo comparator] Field changed for id:a.id field:dropboxRev */ different = true; }
  if (a.views !== b.views) { /* [Memo comparator] Field changed for id:a.id field:views */ different = true; }
  if (different) return false;
    if (
      prevProps.expanded !== nextProps.expanded ||
      prevProps.isEditing !== nextProps.isEditing ||
      prevProps.showPopover !== nextProps.showPopover ||
      prevProps.isCurrent !== nextProps.isCurrent ||
      prevProps.editTitle !== nextProps.editTitle ||
      prevProps.editPlace !== nextProps.editPlace ||
      prevProps.isPlaying !== nextProps.isPlaying ||
      prevProps.position !== nextProps.position ||
      prevProps.editCreatedDate !== nextProps.editCreatedDate ||
      prevProps.searchQuery !== nextProps.searchQuery
    ) {
      /* [Memo comparator] Boolean/primitive prop changed for id:a.id */
      return false;
    }
    const prevTags = prevProps.editTags || [];
    const nextTags = nextProps.editTags || [];
    if (prevTags.length !== nextTags.length) {
      /* [Memo comparator] editTags length changed for id:a.id */
      return false;
    }
    for (let i = 0; i < prevTags.length; i++) {
      if (prevTags[i] !== nextTags[i]) {
        /* [Memo comparator] editTags content changed for id:a.id at idx:i */
        return false;
      }
    }
    return true;
  },
);

export default RecordingListItem;

const styles = StyleSheet.create({
  recordingItem: {
    paddingVertical: 12,
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
    backgroundColor: '#ffffff',
  },
  recordingItemNoBorder: {
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  firstRecordingItem: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  drawer: {
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 8,
    marginBottom: 6,
    marginTop: -2,
    marginHorizontal: 0,
    elevation: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#ffffff',
  },
  drawerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
    width: '100%',
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  circleButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleText: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -7 }, { translateY: -7 }],
    color: '#000',
    fontWeight: 'bold',
    fontSize: 10,
    textAlign: 'center',
  },
  moreButton: {
    marginLeft: 0,
    marginRight: 0,
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 4,
    zIndex: 10,
  },
  popoverMenu: {
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 160,
    paddingVertical: 4,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  optionsMenuText: {
    marginLeft: 12,
    fontSize: 15,
    color: 'black',
    fontWeight: '500',
  },
  titleTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
    flexWrap: 'nowrap',
    marginBottom: 0,
  },
  recordingTitle: {
    fontSize: 18,
    fontWeight: '600',
    flexShrink: 1,
    marginRight: 8,
    flexWrap: 'nowrap',
    minWidth: 0,
    color: '#222',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
    minWidth: 0,
    maxWidth: '65%',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 2,
  },
  tagText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
    marginBottom: 0,
    minHeight: 20,
    justifyContent: 'space-between',
  },
  datePlaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
    flex: 1,
  },
  date: {
    fontSize: 14,
    color: '#888',
    textAlign: 'left',
    minWidth: 0,
    flexShrink: 1,
    flexGrow: 0,
  },
  pipe: {
    color: '#bbb',
    fontSize: 14,
    marginHorizontal: 4,
    flexShrink: 0,
  },
  place: {
    fontSize: 14,
    color: '#bbb',
    fontWeight: '500',
    textAlign: 'left',
    minWidth: 0,
    flexShrink: 1,
    flexGrow: 0,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    justifyContent: 'flex-end',
    flex: 1,
    paddingRight: 8, // Added padding to align with tags
  },
  length: {
    fontSize: 14,
    color: '#555',
    textAlign: 'right',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 6,
    fontSize: 16,
  },
  editButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginRight: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    backgroundColor: '#e53935',
    paddingHorizontal: 10,
  },
  deleteActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
