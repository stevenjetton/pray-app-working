import TagIcon from '@/components/ui/TagIcon';
import { useTags } from '@/context/TagsContext';
import type { Encounter } from '@/types/Encounter';
import type { Tag } from '@/types/Tags';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Google Places API key from environment variables
const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

type Props = {
  recording: Encounter;
  onSave: (updates: Partial<Encounter>) => Promise<void>;
  onCancel: () => void;
};

interface PlacePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}


function MultiStepSaveRecordingForm({ recording, onSave, onCancel }: Props) {
  const { tags: allTags } = useTags();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>(recording.tags || []);
  const [title, setTitle] = useState(recording.title || '');
  const [saving, setSaving] = useState(false);
  
  // Location state - with coordinates for map
  const [locationName, setLocationName] = useState(recording.place || '');
  const [latitude, setLatitude] = useState<number | undefined>(recording.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(recording.longitude);
  const [locationDetail, setLocationDetail] = useState('');
  
  // Manual autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Search for places
  const searchPlaces = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`
      );
      const data = await response.json();
      
      if (data.predictions) {
        setPredictions(data.predictions);
      }
    } catch (error) {
      console.error('Error searching places:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle search input change with debounce
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(text);
    }, 400);
  }, [searchPlaces]);

  // Fetch place details when selected
  const selectPlace = useCallback(async (prediction: PlacePrediction) => {
    console.log('=== Location selected ===', prediction);
    
    setLocationName(prediction.description);
    setSearchQuery('');
    setPredictions([]);

    // Fetch details for coordinates
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&key=${GOOGLE_PLACES_API_KEY}`
      );
      const data = await response.json();
      
      if (data.result?.geometry?.location) {
        setLatitude(data.result.geometry.location.lat);
        setLongitude(data.result.geometry.location.lng);
        console.log('Coordinates:', data.result.geometry.location);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
  }, []);

  // Clear selected location to allow re-searching
  const clearLocation = useCallback(() => {
    setLocationName('');
    setLatitude(undefined);
    setLongitude(undefined);
    setSearchQuery('');
    setPredictions([]);
  }, []);

  // Step 1: Encounter Type Selection
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.questionText}>What type of encounter with God is this?</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagChipsContainer}
      >
        {allTags.map((tag: Tag) => {
          const isSelected = selectedTags.includes(tag.id);
          return (
            <TouchableOpacity
              key={tag.id}
              style={[
                styles.tagChip,
                isSelected && styles.tagChipSelected,
              ]}
              onPress={() => {
                setSelectedTags((prev) =>
                  prev.includes(tag.id)
                    ? prev.filter((t) => t !== tag.id)
                    : [...prev, tag.id]
                );
              }}
            >
              <TagIcon
                icon={tag.icon}
                iconFamily={tag.iconFamily}
                size={16}
                color="#333"
              />
              <Text style={[styles.tagChipText, isSelected && styles.tagChipTextSelected, { marginLeft: 6 }]}>
                {tag.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          onPress={onCancel}
          style={[styles.button, styles.cancelButton]}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setCurrentStep(1)}
          style={[styles.button, styles.nextButton]}
          disabled={selectedTags.length === 0}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 2: Location with Google Places Autocomplete
  const renderStep2 = () => {
    const hasLocation = locationName.trim() || locationDetail.trim();
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.questionText}>
          Where did this encounter with God happen?
        </Text>
        
        {/* Custom Places Autocomplete */}
        <View style={styles.autocompleteWrapper}>
          <Text style={styles.inputLabel}>Search Location</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Search for a city or place..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          {/* Autocomplete dropdown */}
          {predictions.length > 0 && (
            <View style={styles.predictionsContainer}>
              <FlatList
                data={predictions}
                keyExtractor={(item) => item.place_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.predictionItem}
                    onPress={() => selectPlace(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.predictionMainText}>
                      {item.structured_formatting?.main_text || item.description}
                    </Text>
                    {item.structured_formatting?.secondary_text && (
                      <Text style={styles.predictionSecondaryText}>
                        {item.structured_formatting.secondary_text}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                scrollEnabled={false}
              />
            </View>
          )}
          
          {loading && (
            <Text style={styles.loadingText}>Searching...</Text>
          )}
        </View>

        {/* Show selected location */}
        {locationName && (
          <View style={styles.selectedLocationContainer}>
            <TagIcon icon="location" size={16} color="#007AFF" />
            <Text style={styles.selectedLocationText}>{locationName}</Text>
            <TouchableOpacity
              style={styles.clearLocationButton}
              onPress={clearLocation}
              activeOpacity={0.7}
            >
              <Text style={styles.clearLocationText}>×</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Location Detail (Optional) */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Location Detail (Optional)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Home, Church, Prayer Room"
            placeholderTextColor="#999"
            value={locationDetail}
            onChangeText={setLocationDetail}
          />
        </View>

        <View style={styles.buttonsRow}>
          <TouchableOpacity
            onPress={() => setCurrentStep(0)}
            style={[styles.button, styles.backButton]}
          >
            <Text style={styles.backButtonText}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCurrentStep(2)}
            style={[styles.button, styles.nextButton]}
            disabled={!hasLocation}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Step 3: Title
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.questionText}>What title would you give this encounter?</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Enter title"
        placeholderTextColor="#999"
        value={title}
        onChangeText={setTitle}
        autoFocus
      />
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          onPress={() => setCurrentStep(1)}
          style={[styles.button, styles.backButton]}
        >
          <Text style={styles.backButtonText}>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.button, styles.saveButton]}
          disabled={!title.trim() || saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a title for this encounter.');
      return;
    }
    
    // Build location string from components
    const locationParts = [];
    if (locationDetail.trim()) locationParts.push(locationDetail.trim());
    if (locationName.trim()) locationParts.push(locationName.trim());
    const fullLocation = locationParts.join(', ');
    
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        place: fullLocation,
        latitude,
        longitude,
        tags: selectedTags,
      });
    } catch (error) {
      console.error('Error saving recording:', error);
      Alert.alert('Error', 'Failed to save recording. Please try again.');
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {/* Dark Overlay */}
      <View style={styles.fullScreenOverlay}>
        {/* Form Container - Centered on screen */}
        <View style={styles.formCard}>
          {/* Step indicator */}
          <View style={styles.stepIndicator}>
            {[0, 1, 2].map((step) => (
              <View
                key={step}
                style={[
                  styles.stepDot,
                  currentStep === step && styles.stepDotActive,
                  currentStep > step && styles.stepDotComplete,
                ]}
              />
            ))}
          </View>

          {/* Render current step */}
          {currentStep === 0 && renderStep1()}
          {currentStep === 1 && renderStep2()}
          {currentStep === 2 && renderStep3()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ddd',
  },
  stepDotActive: {
    backgroundColor: 'gray',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepDotComplete: {
    backgroundColor: '#34C759',
  },
  stepContainer: {
    // Remove flex: 1 which was causing content to disappear
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 25,
    textAlign: 'center',
  },
  tagChipsContainer: {
    paddingVertical: 0,
    marginBottom: 16,
    alignItems: 'center',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  tagChipSelected: {
    backgroundColor: '#D1EFFE',
    borderColor: '#999',
  },
  tagChipText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  tagChipTextSelected: {
    color: '#333',
  },
  locationFormContainer: {
    marginBottom: 12,
  },
  autocompleteWrapper: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  selectedLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  selectedLocationText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    flex: 1,
  },
  clearLocationButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  clearLocationText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  predictionsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 8,
    maxHeight: 200,
  },
  predictionItem: {
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  predictionMainText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  predictionSecondaryText: {
    fontSize: 12,
    color: '#726d6dff',
    marginTop: 2,
  },
  loadingText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20 ,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  backButtonText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#007AFF',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#34C759',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Memoize to prevent re-renders during recording
// Only re-render if the recording ID changes (different recording) or isTemporary flag changes
export default React.memo(MultiStepSaveRecordingForm, (prevProps, nextProps) => {
  return (
    prevProps.recording.id === nextProps.recording.id &&
    prevProps.recording.isTemporary === nextProps.recording.isTemporary
  );
});
