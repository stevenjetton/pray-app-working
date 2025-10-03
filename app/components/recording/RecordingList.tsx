




import { useRecordings } from '@/context/RecordingContext';
import { useTags } from '@/context/TagsContext';
import { Encounter } from '@/types/Encounter';
import React, { useCallback, useRef, useState } from 'react';
import { FlatList, ListRenderItemInfo, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import RecordingListItem from './RecordingListItem';

type Props = {
  recordings: Encounter[];
  setRecordings: React.Dispatch<React.SetStateAction<Encounter[]>>;
  onDelete: (item: Encounter) => void;
  searchQuery?: string;
  onRevealSearchBar?: () => void;
  onHideSearchBar?: () => void;
  onScroll?: (e: any) => void;
  onView: (item: Encounter) => void;
  selectedRecording: Encounter | null;
  isPlaying: boolean;
  playRecording: (item: Encounter) => Promise<void>;
  pausePlayback: () => Promise<void>;
  skipBy: (amount: number) => void;
  position: number;
  duration: number;
  stopPlayback: () => Promise<void>;
};


const RecordingList = ({
  recordings,
  onDelete,
  searchQuery,
  onRevealSearchBar,
  onHideSearchBar,
  onView,
  selectedRecording,
  isPlaying,
  playRecording,
  pausePlayback,
  skipBy,
  position,
  duration,
  stopPlayback,
}: Omit<Props, 'setRecordings'> & { onScroll?: (e: any) => void }) => {
  // Get updateRecording at the top level (fix invalid hook call)
  const { updateRecording } = useRecordings();
  // Restore all original interactive state/logic
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [popoverId, setPopoverId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editPlace, setEditPlace] = useState('');
  const [editCreatedDate, setEditCreatedDate] = useState('');

  // iOS Messages-style continuous pull gesture handling
  const scrollY = useRef(0);
  const lastScrollY = useRef(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = e.nativeEvent.contentOffset.y;
    const deltaY = currentScrollY - lastScrollY.current;
    scrollY.current = currentScrollY;
    lastScrollY.current = currentScrollY;

    // Handle continuous pull gesture for iOS Messages-style behavior
    if (currentScrollY < 0) {
      // Pulling down - reveal search proportionally
      const maxPull = 60; // Maximum pull distance
      const progress = Math.min(Math.abs(currentScrollY) / maxPull, 1);
      
      // Trigger reveal when pulled enough (like iOS Messages)
      if (progress > 0.3 && onRevealSearchBar) {
        onRevealSearchBar();
      }
    } else if (currentScrollY > 5 && onHideSearchBar) {
      // Scrolled up - hide search immediately (super sensitive like Messages)
      onHideSearchBar();
    }
  };

  const handleScrollEndDrag = () => {
    const currentScrollY = scrollY.current;
    
    // Reveal search bar when pulling down (any amount)
    if (currentScrollY < 0 && onRevealSearchBar) {
      onRevealSearchBar();
    } 
    // Hide search bar when scrolling up (super sensitive like Messages)
    else if (currentScrollY > 5 && onHideSearchBar) {
      onHideSearchBar();
    }
  };

  // Handle momentum scrolling for smooth experience
  const handleMomentumScrollEnd = () => {
    const currentScrollY = scrollY.current;
    
    // Hide search bar if scrolled down significantly
    if (currentScrollY > 10 && onHideSearchBar) {
      onHideSearchBar();
    }
  };



  // Memoized handlers for props
  const handleSetExpandedId = useCallback((value: React.SetStateAction<string | null>) => setExpandedId(value), []);
  const handleSetEditId = useCallback((value: React.SetStateAction<string | null>) => setEditId(value), []);
  const handleSetPopoverId = useCallback((value: React.SetStateAction<string | null>) => setPopoverId(value), []);
  const handleSetEditTitle = useCallback((value: React.SetStateAction<string>) => setEditTitle(value), []);
  const handleSetEditTags = useCallback((value: React.SetStateAction<string[]>) => setEditTags(value), []);
  const handleSetEditPlace = useCallback((value: React.SetStateAction<string>) => setEditPlace(value), []);
  const handleSetEditCreatedDate = useCallback((value: React.SetStateAction<string>) => setEditCreatedDate(value), []);
  const handleStartEdit = useCallback((item: Encounter) => {
    setEditId(item.id);
    setEditTitle(item.title);
    setEditTags(item.tags || []);
    setEditPlace(item.place || '');
    setEditCreatedDate(item.createdDate || '');
  }, []);
  // Return a valid Tag object (update as needed for your Tag type)
  const handleAddCustomTag = useCallback(async (label: string) => {
    return {
      id: '',
      label,
      icon: '',
      iconFamily: 'Ionicons' as any,
    };
  }, []);
  const handleOnCancelEdit = useCallback(() => setEditId(null), []);

  // Restore tags context for tag display
  const { tags: allTags } = useTags();

  return (
    <FlatList
      data={recordings}
      keyExtractor={(item: Encounter) => item.id}
      renderItem={({ item, index }: ListRenderItemInfo<Encounter>) => {
        const isCurrent = selectedRecording?.id === item.id;
        return (
          <RecordingListItem
            item={item}
            index={index}
            expanded={expandedId === item.id}
            isEditing={editId === item.id}
            showPopover={popoverId === item.id}
            isCurrent={isCurrent}
            isPlaying={isPlaying && isCurrent}
            playRecording={() => playRecording(item)}
            pausePlayback={pausePlayback}
            skipBy={skipBy}
            position={isCurrent ? position : 0}
            duration={isCurrent ? duration : item.duration || 0}
            stopPlayback={stopPlayback}
            onView={onView}
            setExpandedId={handleSetExpandedId}
            setEditId={handleSetEditId}
            setPopoverId={handleSetPopoverId}
            startEdit={() => handleStartEdit(item)}
            saveEdit={async (updatedItem, createdDate) => {
              console.log('[RecordingList] saveEdit called', { updatedItem, createdDate });
              try {
                await updateRecording(updatedItem.id, { ...updatedItem, createdDate });
                console.log('[RecordingList] updateRecording success');
              } catch (err) {
                console.error('[RecordingList] ERROR in updateRecording:', err);
                throw err;
              }
              setEditId(null);
              setExpandedId(null);
            }}
            toggleEditTag={() => {}}
            setEditTitle={handleSetEditTitle}
            setEditTags={handleSetEditTags}
            setEditPlace={handleSetEditPlace}
            editTitle={editTitle}
            editTags={editTags}
            editPlace={editPlace}
            editCreatedDate={editCreatedDate}
            setEditCreatedDate={handleSetEditCreatedDate}
            handleDelete={onDelete}
            isBusy={false}
            allTags={allTags}
            addCustomTag={handleAddCustomTag}
            searchQuery={searchQuery || ''}
            editId={editId}
            onCancelEdit={handleOnCancelEdit}
          />
        );
      }}
      onScroll={handleScroll}
      onScrollEndDrag={handleScrollEndDrag}
      onMomentumScrollEnd={handleMomentumScrollEnd}
      scrollEventThrottle={16}
      bounces={true}
      alwaysBounceVertical={true}
    />
  );
};

export default RecordingList;

