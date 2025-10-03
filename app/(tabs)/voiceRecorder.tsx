import { SEARCH_BAR_HEIGHT } from '@/components/ui/SearchFeature';
import { useSearch } from '@/context/SearchContext';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { DrawerLayout } from 'react-native-gesture-handler';

import { useDropbox } from '@/hooks/useDropbox';
import AsyncStorage from '@react-native-async-storage/async-storage';

import RecordingList from '@/components/recording/RecordingList';
import { SortByTagSection } from '@/components/SortByTagSection';

import { usePlayback } from '@/context/PlaybackContext';
import { useRecordings } from '@/context/RecordingContext';
import { useTags } from '@/context/TagsContext';
import type { Encounter } from '@/types/Encounter';

import { useDropboxAuth } from '@/context/DropboxAuthContext';
import type { DropboxEntry } from '@/hooks/useDropbox';
import { useDropboxSync } from '@/hooks/useDropboxSync';
import { Audio, InterruptionModeIOS } from 'expo-av';

import { useVoice, VoiceMode } from 'react-native-voicekit';

import TagIcon from '@/components/ui/TagIcon';



import SearchFeature from '@/components/ui/SearchFeature';
import { Animated, Easing } from 'react-native';


WebBrowser.maybeCompleteAuthSession();

type SortMode = 'date' | 'title' | 'place' | null;
const STORAGE_KEY_DROPBOX_FOLDER = '@dropbox_sync_folder';

import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';






function normalizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/\(s\)/g, '')
    .replace(/[\(\)]/g, '')
    .replace(/s\b/, '')
    .replace(/\s+/g, ' ')
    .trim();
}


function getEncounterDateValue(encounter: Encounter): number {
  if (encounter.imported && encounter.dropboxModified) {
    return encounter.dropboxModified;
  }
  if (encounter.createdDate) {
    const ms = Date.parse(encounter.createdDate);
    return isNaN(ms) ? 0 : ms;
  }
  return 0;
}

export default function VoiceRecorder() {
  // Debug: log params.tag, sortTags, and allTags on every render
  React.useEffect(() => {
    console.log('[VoiceRecorder][Debug] params.tag:', params?.tag, 'sortTags:', sortTags, 'allTags:', allTags.map(t => ({ id: t.id, label: t.label })));
  });
  // ...existing code...
  const params = useLocalSearchParams();
  // Get tag param from router
  const { tags: allTags, addTag, refreshTags } = useTags();

  // iOS Messages-style search bar with continuous pull gesture
  const [searchBarVisible, setSearchBarVisible] = useState(false);
  const searchBarHeight = useRef(new Animated.Value(0)).current;
  const searchBarOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smooth easing animation like iOS Messages - no spring bounce
    Animated.parallel([
      Animated.timing(searchBarHeight, {
        toValue: searchBarVisible ? 58 : 0,
        useNativeDriver: false,
        duration: 250,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(searchBarOpacity, {
        toValue: searchBarVisible ? 1 : 0,
        useNativeDriver: false,
        duration: 250,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [searchBarVisible, searchBarHeight, searchBarOpacity]);

  // iOS Messages-style search bar handlers
  const handleRevealSearchBar = useCallback(() => {
    setSearchBarVisible(true);
  }, []);
  
  const handleHideSearchBar = useCallback(() => {
    setSearchBarVisible(false);
  }, []);

  const router = useRouter();
  const navigation = useNavigation();
  const drawerRef = useRef<DrawerLayout>(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Helper: map label or id to tag id (globalize by tag ID)
  const getTagIdFromLabel = (input: string): string | null => {
    console.log('[VoiceRecorder] getTagIdFromLabel called with input:', input);
    
    if (!input) {
      console.log('[VoiceRecorder] Empty input to getTagIdFromLabel');
      return null;
    }
    
    // First, try direct ID match (most reliable)
    const directIdMatch = allTags.find(t => t.id === input);
    if (directIdMatch) {
      console.log('[VoiceRecorder] Found direct ID match:', directIdMatch.id);
      return directIdMatch.id;
    }
    
    // Try to decode any URL-encoded values
    let decodedInput = input;
    try {
      decodedInput = decodeURIComponent(input);
      console.log('[VoiceRecorder] Decoded input:', decodedInput);
    } catch (e) {
      console.error('[VoiceRecorder] Error decoding input:', e);
    }
    
    // Try label match (less reliable)
    const labelMatch = allTags.find(t => 
      t.label.toLowerCase() === decodedInput.toLowerCase() || 
      t.label.toLowerCase() === input.toLowerCase()
    );
    
    if (labelMatch) {
      console.log('[VoiceRecorder] Found label match:', labelMatch.id);
      return labelMatch.id;
    }
    
    // No matches found
    console.log('[VoiceRecorder] No tag matches found for input:', input);
    return null;
  };

  const [sortTags, setSortTags] = useState<string[]>([]);

  // ...existing code...

  // Reset tag filter when coming back from settings screens
  useFocusEffect(
    useCallback(() => {
      // Check if we're coming back from a settings screen
      const navState = navigation.getState?.();
      const prevRoute = navState?.routes?.slice(-2)?.[0];
      
      console.log('[VoiceRecorder] useFocusEffect - prevRoute:', prevRoute?.name);
      
      // Check if we just deleted a tag
      const checkDeletedTag = async () => {
        try {
          const justDeletedTag = await AsyncStorage.getItem('just_deleted_tag');
          const deletedTagId = await AsyncStorage.getItem('deleted_tag_id');
          
          if (justDeletedTag === 'true') {
            console.log('[VoiceRecorder] Found just_deleted_tag flag for tag:', deletedTagId);
            
            // Reset filters and params
            setSortTags([]);
            router.setParams({});
            
            // Clear the flag
            await AsyncStorage.removeItem('just_deleted_tag');
            await AsyncStorage.removeItem('deleted_tag_id');
            return true;
          }
          return false;
        } catch (error) {
          console.error('[VoiceRecorder] Error checking deleted tag:', error);
          return false;
        }
      };
      
      // Execute the check
      checkDeletedTag().then(wasDeleted => {
        // Only continue with other checks if we didn't just delete a tag
        if (!wasDeleted) {
          // Reset filter if coming from settings or tags screens
          if ((prevRoute?.name?.includes('settings') || prevRoute?.name?.includes('tags'))) {
            console.log('[VoiceRecorder] Resetting tag filter after settings');
            setSortTags([]);
          }
          
          // Handle case for specific deleted tags
          if (params?.tag && !allTags.some(t => t.id === params.tag)) {
            console.log(`[VoiceRecorder] Tag ${params.tag} no longer exists, clearing filter`);
            setSortTags([]);
            router.setParams({});
          }
        }
      });
    }, [navigation, params, allTags, router])
  );

  // Sorting and filtering
  const [sortMode, setSortMode] = useState<SortMode>(null);
  const [sortAsc, setSortAsc] = useState(true);



  const { selectedRecording, isPlaying, playRecording, pausePlayback, skipBy, position, duration, stopPlayback } = usePlayback();

  // Dropbox OAuth context
  const {
    accessToken,
    refreshAccessToken,
    signIn: promptDropboxAuth,
  } = useDropboxAuth();

  // Dropbox hooks
  const {
    listFiles,
    downloadFile,
  } = useDropbox({ accessToken, refreshAccessToken });


  // URL tag param for filtering
  const { searchQuery, setSearchQuery } = useSearch();

  // Update sortTags when params.tag changes, but only if the tag still exists
  useEffect(() => {
    console.log('[VoiceRecorder] useEffect for params.tag - current params:', params);
    
    // First check if we have a "just_deleted_tag" flag in AsyncStorage
    const checkDeletedTagFlag = async () => {
      try {
        const justDeletedTag = await AsyncStorage.getItem('just_deleted_tag');
        if (justDeletedTag === 'true') {
          console.log('[VoiceRecorder] Found just_deleted_tag flag in useEffect, skipping tag filter');
          // We'll handle this in useFocusEffect, so just return early
          return true;
        }
        return false;
      } catch (error) {
        console.error('[VoiceRecorder] Error checking deleted tag flag:', error);
        return false;
      }
    };
    
    checkDeletedTagFlag().then(wasDeleted => {
      if (wasDeleted) {
        // Skip the rest of the effect if we just deleted a tag
        return;
      }
      
      if (params?.tag && typeof params.tag === 'string') {
        const tagId = getTagIdFromLabel(params.tag);
        console.log('[VoiceRecorder] tagId from params.tag:', tagId, 'exists in allTags:', allTags.some(t => t.id === tagId));
        
        // Only set the filter if the tag exists in allTags
        if (tagId && allTags.some(t => t.id === tagId)) {
          console.log('[VoiceRecorder] Setting sortTags to:', [tagId]);
          setSortTags([tagId]);
          return;
        }
      }
      
      // If tag doesn't exist or isn't specified, don't automatically engage the filter
      // Only clear sortTags if we're coming from a URL with a tag parameter
      if (params?.tag) {
        console.log('[VoiceRecorder] Clearing sortTags because tag no longer exists');
        setSortTags([]);
      }
    });
  }, [params?.tag, allTags]);

  // No-op: always visible

  // No-op: always visible

  // No-op: always visible


  // Show search bar with animation

  // Worklet-safe function to trigger revealSearchBar from a worklet
  // Hide search bar with animation (JS thread only)

  // Worklet-safe function to trigger hideSearchBar from a worklet



  // Local UI state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editPlace, setEditPlace] = useState<string>('');
  const [editCreatedDate, setEditCreatedDate] = useState<string>('');
  const [popoverId, setPopoverId] = useState<string | null>(null);

  const [chosenDropboxFolder, setChosenDropboxFolder] = useState('');
  const [validatingFolder, setValidatingFolder] = useState(false);
  const [dropboxModal, setDropboxModal] = useState(false);
  const [dropboxFiles, setDropboxFiles] = useState<any[]>([]);
  const [dropboxLoading, setDropboxLoading] = useState(false);
  const [dropboxError, setDropboxError] = useState<string | null>(null);

  const [fabMenuOpen, setFabMenuOpen] = useState(false);

  // Dropbox sync context with missing tag prompt
  // Already declared at top, do not redeclare
  const onMissingTag = async (label: string): Promise<string | null> => {
    // Import getTagIcon utility
    const { getTagIcon } = await import('@/utils/tagIcons');
    const iconData = getTagIcon(label);
    return new Promise((resolve) => {
      Alert.alert(
        'Create New Tag?',
        `Dropbox folder "${label}" does not match any tag. Would you like to create a new tag for it?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          {
            text: 'Create',
            style: 'default',
            onPress: async () => {
              // Use getTagIcon for sensible icon mapping
              const created = await addTag({ label, icon: iconData.iconName, iconFamily: iconData.iconFamily });
              await refreshTags();
              resolve(created ? created.id : null);
            },
          },
        ],
        { cancelable: true }
      );
    });
  };

  // Patch: useDropboxSync only accepts one argument, so update hook to support onMissingTag
  const {
    syncing: dropboxSyncing,
    syncError,
    syncProgress,
    twoWaySync,
  } = useDropboxSync(chosenDropboxFolder || '/Recordings', onMissingTag);

  // Reset sortTags after Dropbox sync completes
  useEffect(() => {
    if (!dropboxSyncing) {
      setSortTags([]);
    }
  }, [dropboxSyncing]);

  const { recordings, deleteRecording } = useRecordings();

  // Log allTags and recordings on screen focus for debugging
  useFocusEffect(
    React.useCallback(() => {
      console.log('[VoiceRecorder][Focus] Screen focused. Current tags:', allTags.map(t => ({ id: t.id, label: t.label })), 'Current recordings:', recordings.map(r => ({ id: r.id, tags: r.tags })));
    }, [allTags, recordings])
  );

  // Only apply filter if tags and recordings are loaded; add debug logs
  useEffect(() => {
    const tagsLoaded = Array.isArray(allTags) && allTags.length > 0;
    const recsLoaded = Array.isArray(recordings);
    if (!tagsLoaded || !recsLoaded) {
      return;
    }
    if (params?.tag && typeof params.tag === 'string') {
      const tagId = getTagIdFromLabel(params.tag);
      if (tagId && allTags.some(t => t.id === tagId)) {
        setSortTags([tagId]);
        return;
      }
    }
    setSortTags([]);
  }, [params?.tag, allTags.map(t => t.id).join(","), allTags.map(t => t.label).join(","), recordings.length]);

  // Ensure sortTags never contains deleted tags
  useEffect(() => {
    if (!Array.isArray(sortTags) || sortTags.length === 0) return;
    const validTagIds = new Set(allTags.map(t => t.id));
    const filtered = sortTags.filter(tagId => validTagIds.has(tagId));
    if (filtered.length !== sortTags.length) {
      setSortTags(filtered);
    }
  }, [allTags, sortTags]);
  // const { tags: allTags } = useTags(); // Removed duplicate declaration



  // Use recordings and allTags directly from context to ensure UI always reflects latest state

  const currentDropboxFolder = chosenDropboxFolder || '';

  async function callWithRefreshRetry(apiCall: () => Promise<any>): Promise<any> {
    try {
      return await apiCall();
    } catch (error: any) {
      const isTokenExpired =
        error?.status === 401 ||
        (typeof error.message === 'string' &&
          (error.message.toLowerCase().includes('invalid_access_token') ||
           error.message.toLowerCase().includes('expired_access_token')));
      if (isTokenExpired) {
        try {
          await refreshAccessToken();
          return await apiCall();
        } catch (refreshError) {
          await promptDropboxAuth();
          throw error;
        }
      }
      throw error;
    }
  }

  const listDropboxFolderEntries = useCallback(
    async (folderPath: string): Promise<DropboxEntry[]> => {
      if (!accessToken) return [];
      setDropboxLoading(true);
      setDropboxError(null);
      try {
        const files = await callWithRefreshRetry(() => listFiles(folderPath));
        const filteredFiles = files.filter(
          (file: DropboxEntry) => !file.name.toLowerCase().endsWith('transcription.json')
        );
        setDropboxFiles(filteredFiles);
        return filteredFiles;
      } catch (e: any) {
        setDropboxError(e.message || 'Failed to list Dropbox folder');
        setDropboxFiles([]);
        return [];
      } finally {
        setDropboxLoading(false);
      }
    },
    [accessToken, listFiles, promptDropboxAuth, refreshAccessToken]
  );

  useEffect(() => {
    (async () => {
      if (!accessToken) return;
      await listDropboxFolderEntries('/');
    })();
  }, [accessToken]);


  // console.log('[VoiceRecorder] Render - editId:', editId, 'expandedId:', expandedId); // Removed for performance
  // [VoiceRecorder] Render - editId, expandedId

  const handleDropboxDownload = useCallback(
    async (filePath: string, filename: string) => {
      if (!accessToken) {
        Alert.alert('Dropbox Notice', 'Please sign in to Dropbox first.');
        return;
      }
      try {
        const tempUrl = await callWithRefreshRetry(() => downloadFile(filePath));
        if (!tempUrl) throw new Error('Failed to get download link');
        const localUri =
          FileSystem.documentDirectory +
          `dropbox_${Date.now()}_${filename.replace(/[^\w.-]/g, '_')}`;
        const downloaded = await FileSystem.downloadAsync(tempUrl, localUri);
        setDropboxModal(false);
        setPendingURI(downloaded.uri);
        setPendingDuration(0);
        setPendingTranscription('');
      } catch (error: any) {
        setDropboxModal(false);
        Alert.alert('Dropbox Import Error', error.message || 'Failed to import from Dropbox');
      }
    },
    [accessToken, downloadFile]
  );

  const [pickingDoc, setPickingDoc] = useState(false);
  const [pickerCooldown, setPickerCooldown] = useState(false);

  const [importQueue, setImportQueue] = useState<any[]>([]);
  const [importIndex, setImportIndex] = useState<number>(0);


  const handleImportAudio = useCallback(async () => {
    if (pickingDoc || pickerCooldown) return;
    setPickingDoc(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!('type' in result) || result.type === 'cancel') return;
      if (!result || !('uri' in result)) return;
      const assets = Array.isArray((result as any).output) ? (result as any).output : [result];
      setImportQueue(assets);
      setImportIndex(0);
    } catch (error: any) {
      if (error.message?.includes('different document picking')) {
        Alert.alert('Import Warning', 'Please restart the app to fix picker issues in your device.');
      } else {
        Alert.alert('Import failed', error.message || 'Unknown error');
      }
    } finally {
      setPickingDoc(false);
      setPickerCooldown(true);
    }
  }, [pickingDoc, pickerCooldown]);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [pendingURI, setPendingURI] = useState<string | null>(null);
  const [pendingDuration, setPendingDuration] = useState<number | undefined>();
  const [pendingTranscription, setPendingTranscription] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

  const {
    available: voiceAvailable,
    listening: voiceListening,
    transcript: voiceTranscript,
    startListening,
  } = useVoice({
    locale: 'en-US',
    mode: VoiceMode.Continuous,
    enablePartialResults: true,
  });

  const startRecording = useCallback(async () => {
    try {
      if (stopPlayback) {
        await stopPlayback();
      }
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please enable microphone access.');
        return;
      }
      if (!voiceAvailable) {
        Alert.alert('Speech Recognition Unavailable', 'Voice recognition is not available on this device.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      const newRec = new Audio.Recording();
      await newRec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRec.startAsync();
      setRecording(newRec);
      setPendingURI(null);
      setPendingDuration(undefined);
      setPendingTranscription('');
      if (voiceAvailable && !voiceListening) {
        await startListening();
      }
    } catch (error) {
      Alert.alert('Recording error', 'Unable to start recording.');
    }
  }, [voiceAvailable, voiceListening, startListening, stopPlayback]);

  const recordingListRef = useRef<any>(null);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        recordingListRef.current?.scrollToOffset({
          offset: SEARCH_BAR_HEIGHT,
          animated: false,
        });
      }, 50);
      return () => clearTimeout(timer);
    }, [])
  );


  useEffect(() => {
    if (recording) {
      setPendingTranscription(voiceTranscript);
    }
  }, [voiceTranscript, recording]);

  useEffect(() => {
    if (recording) {
      setRecordingDuration(0);
      recordingInterval.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } else {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
    }
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }
    };
  }, [recording]);


  useEffect(() => {
  // [VoiceRecorder] editId changed
  }, [editId]);

  useEffect(() => {
  // [VoiceRecorder] expandedId changed
  }, [expandedId]);




  // Unified update/save function for both updateRecording and saveEdit

  // Wrapper for RecordingList prop type












  const drawerPauseInProgress = useRef(false);

  const handleDrawerClose = useCallback(async () => {
    if (drawerPauseInProgress.current) {
      // [VoiceRecorder] Drawer close pause ignored, already in progress
      return;
    }
    drawerPauseInProgress.current = true;
    try {
      // [VoiceRecorder] pausePlayback called in drawer close
    } finally {
      setTimeout(() => {
        drawerPauseInProgress.current = false;
        // [VoiceRecorder] Drawer pause debounce reset
      }, 400);
    }
  }, [pausePlayback]);

  
  const getParentDropboxPath = useCallback((path: string) => {
    if (!path) return '';
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 1) return '';
    parts.pop();
    return '/' + parts.join('/');
  }, []);

  const validateDropboxFolder = useCallback(
    async (folder: string) => {
      try {
        const entries = await listDropboxFolderEntries(folder);
        return entries.length > 0;
      } catch {
        return false;
      }
    },
    [listDropboxFolderEntries],
  );

  const handleFolderSelect = useCallback(
    async (folder: string) => {
      setValidatingFolder(true);
      const isValid = await validateDropboxFolder(folder);
      setValidatingFolder(false);

      if (isValid) {
        setChosenDropboxFolder(folder);
        await AsyncStorage.setItem(STORAGE_KEY_DROPBOX_FOLDER, folder);
        await listDropboxFolderEntries(folder);
        setDropboxModal(false);
        Alert.alert('Folder selected', folder);
      } else {
        Alert.alert('Invalid folder', 'Folder is empty or inaccessible, please choose another.');
      }
    },
    [validateDropboxFolder, listDropboxFolderEntries],
  );

  const getFilteredSortedRecordings = useCallback((): Encounter[] => {
    let items = recordings;
    if (sortTags.length) {
      items = items.filter(rec =>
        Array.isArray(rec.tags) && rec.tags.some(tag => sortTags.includes(tag))
      );
    }

    const dir = sortAsc ? 1 : -1;

    if (sortMode === 'title') {
      return [...items].sort(
        (a, b) => dir * (a.title?.localeCompare(b.title ?? '') ?? 0)
      );
    }
    if (sortMode === 'place') {
      const withPlace = items.filter(i => i.place?.trim());
      const withoutPlace = items.filter(i => !i.place?.trim());
      withPlace.sort(
        (a, b) => dir * (a.place?.localeCompare(b.place ?? '') ?? 0)
      );
      return [...withPlace, ...withoutPlace];
    }
    if (sortMode === 'date') {
      return [...items].sort(
        (a, b) => dir * (getEncounterDateValue(b) - getEncounterDateValue(a))
      );
    }
    if (sortTags.length === 0) {
      return [...items].sort(
        (a, b) => getEncounterDateValue(b) - getEncounterDateValue(a)
      );
    }

    const tagMatches = (rec: Encounter) =>
      rec.tags?.filter(t => sortTags.includes(t)).length ?? 0;

    const groups: Record<string, Encounter[]> = {};
    items.forEach(rec => {
      const count = tagMatches(rec);
      if (count === sortTags.length) {
        groups.full = groups.full ?? [];
        groups.full.push(rec);
      } else if (count > 1) {
        groups.multi = groups.multi ?? [];
        groups.multi.push(rec);
      } else if (count === 1) {
        const tag = sortTags.find(t => rec.tags?.includes(t));
        if (!tag) return;
        groups[tag] = groups[tag] ?? [];
        groups[tag].push(rec);
      }
    });

    let combined: Encounter[] = [];
    if (groups.full)
      combined = combined.concat(
        groups.full.sort(
          (a, b) => getEncounterDateValue(b) - getEncounterDateValue(a)
        )
      );
    if (groups.multi)
      combined = combined.concat(
        groups.multi.sort(
          (a, b) => getEncounterDateValue(b) - getEncounterDateValue(a)
        )
      );
    sortTags.forEach(tag => {
      if (groups[tag])
        combined = combined.concat(
          groups[tag].sort(
            (a, b) => getEncounterDateValue(b) - getEncounterDateValue(a)
          )
        );
    });

    return combined;
  }, [recordings, sortAsc, sortMode, sortTags]);

  // Memoize filtered and sorted recordings only if needed for performance
  const filteredAndSortedRecordings = getFilteredSortedRecordings();

  // --- Search Filtering (restored & upgraded) ---
  let searchFilteredRecordings = filteredAndSortedRecordings;
  if (searchQuery?.trim()) {
    const q = searchQuery.trim().toLowerCase();
    searchFilteredRecordings = filteredAndSortedRecordings.filter(rec => {
      // Search in title, place, tags, and localTranscription if present
      const inTitle = rec.title?.toLowerCase().includes(q);
      const inPlace = rec.place?.toLowerCase().includes(q);
      const inTags = Array.isArray(rec.tags) && rec.tags.some(tagId => {
        const tagObj = allTags.find(t => t.id === tagId);
        return tagObj?.label?.toLowerCase().includes(q);
      });
      const inTranscript = rec.localTranscription?.toLowerCase().includes(q);
      return inTitle || inPlace || inTags || inTranscript;
    });
  }

  // Compose recordingsToShow from the above, always up to date
  const recordingsToShow = useMemo(() => {
    // Log tags for each recording as seen by the UI
    console.log('[VoiceRecorder][UI] Recordings to render:', (searchFilteredRecordings || filteredAndSortedRecordings || recordings).map(r => ({ id: r.id, tags: r.tags })));
    return searchFilteredRecordings || filteredAndSortedRecordings || recordings;
  }, [searchFilteredRecordings, filteredAndSortedRecordings, recordings]);




  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (pickerCooldown) timer = setTimeout(() => setPickerCooldown(false), 2000);
    return () => timer && clearTimeout(timer);
  }, [pickerCooldown]);

  useEffect(() => {
    if (!fabMenuOpen) setPickingDoc(false);
  }, [fabMenuOpen]);

  // [VoiceRecorder] recordingsToShow before render
  // Track scroll position for other features if needed

  // Callbacks for RecordingList to trigger search bar reveal/hide (only update state)

  // Restore header title and filter/sort menu button
  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Record', // Explicitly set tab title to "Record"
      headerTitleAlign: 'left',
      headerTitle: () => (
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'black' }}>
          My Encounters with God
        </Text>
      ),
      headerRight: () => (
        <TouchableOpacity
          style={{ paddingHorizontal: 20 }}
          onPress={() => {
            if (isFilterDrawerOpen) {
              drawerRef.current?.closeDrawer();
            } else {
              drawerRef.current?.openDrawer();
            }
          }}
          accessibilityLabel="Toggle filter drawer"
        >
          <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
            <MaterialIcons name="filter-list" size={24} color="black" />
            {(sortTags.length > 0 || sortMode !== null) && (
              <View
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'red',
                }}
              />
            )}
          </View>
        </TouchableOpacity>
      ),
    });
  }, [navigation, isFilterDrawerOpen, sortTags, sortMode]);

  return (
    <>
      <DrawerLayout
        ref={drawerRef}
        drawerWidth={340}
        drawerPosition="right"
        drawerType="slide"
        overlayColor="rgba(0,0,0,0.2)"
        onDrawerOpen={() => {
          setIsFilterDrawerOpen(true);
          console.log('[VoiceRecorder] Drawer opened');
        }}
        onDrawerClose={() => {
          setIsFilterDrawerOpen(false);
          console.log('[VoiceRecorder] Drawer closed');
          handleDrawerClose();
        }}
        renderNavigationView={() => (
          <SortByTagSection
            sortTags={sortTags}
            setSortTags={setSortTags}
            sortMode={sortMode}
            setSortMode={setSortMode}
            sortAsc={sortAsc}
            setSortAsc={setSortAsc}
            recordings={recordings}
            allTags={allTags}
            normalizeTag={normalizeTag}
          />
        )}
      >
        <View style={styles.container}>
          {/* Pull-to-reveal search bar above the list with smooth animation */}
          <Animated.View 
            style={{ 
              width: '100%', 
              marginTop: 12, 
              backgroundColor: '#fff', 
              height: searchBarHeight,
              opacity: searchBarOpacity,
              overflow: 'hidden',
              justifyContent: 'center',
            }}
          >
            <SearchFeature
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={() => {}}
              onFocus={() => {}}
            />
          </Animated.View>

          {dropboxSyncing && (
            <View style={styles.syncRow}>
              <ActivityIndicator size="small" color="#006ff" />
              <Text style={styles.syncText}>
                Syncing Dropbox: {syncProgress.completed} / {syncProgress.total} files...
              </Text>
            </View>
          )}
          {syncError && !dropboxSyncing && (
            <View style={styles.syncRow}>
              <Text style={{ color: 'red' }}>{syncError}</Text>
            </View>
          )}

          {/* Minimal delete handler for RecordingList */}
          <RecordingList
            key={allTags.map(t => t.id).join(',') + '|' + recordings.map(r => r.id + ':' + (r.tags || []).join(',')).join(';')}
            // Always use context values for recordings and tags
            recordings={recordingsToShow}
            onDelete={useCallback(async (item) => {
              try {
                await deleteRecording(item.id);
              } catch (err) {
                console.error('Failed to delete recording:', err);
              }
            }, [deleteRecording])}
            searchQuery={searchQuery}
            onRevealSearchBar={handleRevealSearchBar}
            onHideSearchBar={handleHideSearchBar}
            onView={useCallback(async (item) => {
              await pausePlayback();
              if (searchQuery && searchQuery.trim() !== '') {
                router.push({ pathname: `/encounter/${item.id}`, params: { search: searchQuery } });
              } else {
                router.push(`/encounter/${item.id}`);
              }
            }, [pausePlayback, router, searchQuery])}
            selectedRecording={selectedRecording}
            isPlaying={isPlaying}
            playRecording={playRecording}
            pausePlayback={pausePlayback}
            skipBy={skipBy}
            position={position}
            duration={duration}
            stopPlayback={stopPlayback}
          />

        {/* Floating Plus Button (FAB) */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setFabMenuOpen(true)}
          accessibilityLabel="Open actions menu"
        >
          <TagIcon icon="add" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </DrawerLayout>

      {/* FAB menu modal */}
      <Modal visible={fabMenuOpen} transparent animationType="fade" onRequestClose={() => setFabMenuOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setFabMenuOpen(false)} />
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.actionRow} onPress={() => { setFabMenuOpen(false); setSortTags([]); startRecording(); }}>
            <TagIcon icon="mic" size={22} color="red" />
            <Text style={[styles.actionText, { color: 'red', fontWeight: 'bold' }]}>Record New</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => { if (!pickingDoc && !pickerCooldown) { setFabMenuOpen(false); handleImportAudio(); } }}
            disabled={pickingDoc || pickerCooldown}
          >
            <TagIcon icon="document" size={22} color="#222" />
            <Text style={styles.actionText}>Import from Other Apps/Files</Text>
            {(pickingDoc || pickerCooldown) && <Text style={{ marginLeft: 10, color: '#888' }}>Loading…</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={async () => {
              setFabMenuOpen(false);
              if (!dropboxSyncing) {
                if (!accessToken) {
                  await promptDropboxAuth();
                  return;
                }
                await twoWaySync();
              }
            }}
            disabled={dropboxSyncing}
            accessibilityLabel="Sync with Dropbox"
          >
            <TagIcon icon="sync" size={22} color="#0066ff" />
            <Text style={styles.actionText}>{dropboxSyncing ? 'Syncing Dropbox...' : 'Sync with Dropbox'}</Text>
            {dropboxSyncing && <ActivityIndicator size="small" color="#0066ff" style={{ marginLeft: 10 }} />}
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Dropbox folder modal */}
      <Modal visible={dropboxModal} transparent animationType="fade" onRequestClose={() => setDropboxModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setDropboxModal(false)} />
        <View style={[styles.menuCard, { maxHeight: 400, minWidth: 240, alignSelf: 'center' }]}> 
          <ScrollView>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
              {accessToken ? 'Select a Dropbox folder for sync or file import:' : 'Sign in to Dropbox…'}
            </Text>
            {dropboxLoading && <Text>Loading…</Text>}
            {dropboxError && <Text style={{ color: 'red' }}>{dropboxError}</Text>}
            {!accessToken && !dropboxLoading && (
              <Text style={{ color: '#444', marginVertical: 8, fontSize: 13 }}>Authorize access to Dropbox to sync or import files.</Text>
            )}
            {validatingFolder && (
              <View style={{ marginVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#0066ff" />
                <Text style={{ color: '#0066ff', marginLeft: 8 }}>Validating folder…</Text>
              </View>
            )}
            {currentDropboxFolder && accessToken && (
              <TouchableOpacity style={{ paddingVertical: 6, marginVertical: 1 }} onPress={() => listDropboxFolderEntries(getParentDropboxPath(currentDropboxFolder))}>
                <Text style={{ color: '#222', fontWeight: 'bold', fontSize: 14 }}>{'.. (Up)'}</Text>
              </TouchableOpacity>
            )}
            {/* Dropbox folders */}
            {dropboxFiles.filter(f => f['.tag'] === 'folder').map(folder => (
              <TouchableOpacity key={folder.id} style={{ paddingVertical: 6, marginVertical: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => handleFolderSelect(folder.path_lower)}>
                <Text style={{ color: '#555', fontWeight: 'bold', fontSize: 14 }}>📁 {folder.name}</Text>
                <Text style={{ color: '#0066ff', marginLeft: 6, fontSize: 12 }}>(Sync Folder)</Text>
              </TouchableOpacity>
            ))}
            {/* Dropbox files for import (if no folder selected) */}
            {!chosenDropboxFolder && (
              <>
                {dropboxFiles.filter(f => f['.tag'] === 'file' && /\.(mp3|m4a|wav|ogg|flac)$/i.test(f.name)).map(file => (
                  <TouchableOpacity key={file.id} style={{ paddingVertical: 6, marginVertical: 1 }} onPress={() => handleDropboxDownload(file.path_lower, file.name)}>
                    <Text style={{ color: '#0066ff', fontSize: 14 }}>{file.name}</Text>
                  </TouchableOpacity>
                ))}
                {dropboxFiles.length === 0 && !dropboxLoading && !dropboxError && (
                  <Text style={{ color: '#222', fontSize: 13, marginVertical: 8 }}>No audio files or folders found.</Text>
                )}
              </>
            )}
            <TouchableOpacity onPress={() => setDropboxModal(false)} style={{ marginTop: 18, backgroundColor: '#eee', padding: 10, borderRadius: 6 }}>
              <Text style={{ textAlign: 'center', color: '#333', fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, backgroundColor: '#fff' },
  syncRow: { paddingHorizontal: 20, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  syncText: { marginLeft: 8, color: '#0066ff' },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 99,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' },
  menuCard: {
    position: 'absolute',
    bottom: 98,
    right: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 6,
    minWidth: 200,
    shadowColor: '#000',
    shadowOpacity: 0.17,
    shadowRadius: 8,
    elevation: 12,
    ...Platform.select({ ios: { paddingBottom: 16 }, android: { paddingBottom: 10 } }),
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  actionText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#222',
  },
});
