import TagIcon from '@/components/ui/TagIcon';
import { useTags } from '@/context/TagsContext';
import type { Encounter } from '@/types/Encounter';
import type { Tag } from '@/types/Tags';
import React, { useRef, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

// You'll need to add your Google Places API key
// Get it from: https://console.cloud.google.com/google/maps-apis
const GOOGLE_PLACES_API_KEY = 'YOUR_API_KEY_HERE';

type Props = {
  recording: Encounter;
  onSave: (updates: Partial<Encounter>) => Promise<void>;
  onCancel: () => void;
};

// Major US Cities list
const US_CITIES = [
  { label: 'Select City', value: '' },
  { label: 'New York', value: 'New York' },
  { label: 'Los Angeles', value: 'Los Angeles' },
  { label: 'Chicago', value: 'Chicago' },
  { label: 'Houston', value: 'Houston' },
  { label: 'Phoenix', value: 'Phoenix' },
  { label: 'Philadelphia', value: 'Philadelphia' },
  { label: 'San Antonio', value: 'San Antonio' },
  { label: 'San Diego', value: 'San Diego' },
  { label: 'Dallas', value: 'Dallas' },
  { label: 'San Jose', value: 'San Jose' },
  { label: 'Austin', value: 'Austin' },
  { label: 'Jacksonville', value: 'Jacksonville' },
  { label: 'Fort Worth', value: 'Fort Worth' },
  { label: 'Columbus', value: 'Columbus' },
  { label: 'Charlotte', value: 'Charlotte' },
  { label: 'San Francisco', value: 'San Francisco' },
  { label: 'Indianapolis', value: 'Indianapolis' },
  { label: 'Seattle', value: 'Seattle' },
  { label: 'Denver', value: 'Denver' },
  { label: 'Washington', value: 'Washington' },
  { label: 'Boston', value: 'Boston' },
  { label: 'Nashville', value: 'Nashville' },
  { label: 'Oklahoma City', value: 'Oklahoma City' },
  { label: 'Las Vegas', value: 'Las Vegas' },
  { label: 'Portland', value: 'Portland' },
  { label: 'Memphis', value: 'Memphis' },
  { label: 'Louisville', value: 'Louisville' },
  { label: 'Baltimore', value: 'Baltimore' },
  { label: 'Milwaukee', value: 'Milwaukee' },
  { label: 'Albuquerque', value: 'Albuquerque' },
  { label: 'Tucson', value: 'Tucson' },
  { label: 'Fresno', value: 'Fresno' },
  { label: 'Sacramento', value: 'Sacramento' },
  { label: 'Kansas City', value: 'Kansas City' },
  { label: 'Atlanta', value: 'Atlanta' },
  { label: 'Miami', value: 'Miami' },
  { label: 'Tampa', value: 'Tampa' },
  { label: 'Orlando', value: 'Orlando' },
  { label: 'Minneapolis', value: 'Minneapolis' },
  { label: 'Cleveland', value: 'Cleveland' },
  { label: 'Raleigh', value: 'Raleigh' },
  { label: 'Other', value: 'Other' },
];

// US States list
const US_STATES = [
  { label: 'Select State', value: '' },
  { label: 'Alabama', value: 'AL' },
  { label: 'Alaska', value: 'AK' },
  { label: 'Arizona', value: 'AZ' },
  { label: 'Arkansas', value: 'AR' },
  { label: 'California', value: 'CA' },
  { label: 'Colorado', value: 'CO' },
  { label: 'Connecticut', value: 'CT' },
  { label: 'Delaware', value: 'DE' },
  { label: 'Florida', value: 'FL' },
  { label: 'Georgia', value: 'GA' },
  { label: 'Hawaii', value: 'HI' },
  { label: 'Idaho', value: 'ID' },
  { label: 'Illinois', value: 'IL' },
  { label: 'Indiana', value: 'IN' },
  { label: 'Iowa', value: 'IA' },
  { label: 'Kansas', value: 'KS' },
  { label: 'Kentucky', value: 'KY' },
  { label: 'Louisiana', value: 'LA' },
  { label: 'Maine', value: 'ME' },
  { label: 'Maryland', value: 'MD' },
  { label: 'Massachusetts', value: 'MA' },
  { label: 'Michigan', value: 'MI' },
  { label: 'Minnesota', value: 'MN' },
  { label: 'Mississippi', value: 'MS' },
  { label: 'Missouri', value: 'MO' },
  { label: 'Montana', value: 'MT' },
  { label: 'Nebraska', value: 'NE' },
  { label: 'Nevada', value: 'NV' },
  { label: 'New Hampshire', value: 'NH' },
  { label: 'New Jersey', value: 'NJ' },
  { label: 'New Mexico', value: 'NM' },
  { label: 'New York', value: 'NY' },
  { label: 'North Carolina', value: 'NC' },
  { label: 'North Dakota', value: 'ND' },
  { label: 'Ohio', value: 'OH' },
  { label: 'Oklahoma', value: 'OK' },
  { label: 'Oregon', value: 'OR' },
  { label: 'Pennsylvania', value: 'PA' },
  { label: 'Rhode Island', value: 'RI' },
  { label: 'South Carolina', value: 'SC' },
  { label: 'South Dakota', value: 'SD' },
  { label: 'Tennessee', value: 'TN' },
  { label: 'Texas', value: 'TX' },
  { label: 'Utah', value: 'UT' },
  { label: 'Vermont', value: 'VT' },
  { label: 'Virginia', value: 'VA' },
  { label: 'Washington', value: 'WA' },
  { label: 'West Virginia', value: 'WV' },
  { label: 'Wisconsin', value: 'WI' },
  { label: 'Wyoming', value: 'WY' },
];

export default function MultiStepSaveRecordingForm({ recording, onSave, onCancel }: Props) {
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
  const googlePlacesRef = useRef<any>(null);

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
                size={18}
                color={isSelected ? '#fff' : '#333'}
              />
              <Text style={[styles.tagChipText, isSelected && styles.tagChipTextSelected]}>
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

  // Step 2: Location with City/State/Detail
  const renderStep2 = () => {
    const finalCity = city === 'Other' ? customCity : city;
    const hasLocation = finalCity.trim() || state || locationDetail.trim();
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.questionText}>
          Where did this encounter with God happen?
        </Text>
        
        <ScrollView style={styles.locationFormContainer} keyboardShouldPersistTaps="handled">
          {/* City Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>City</Text>
            {Platform.OS === 'ios' ? (
              <>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowCityPicker(true)}
                >
                  <Text style={[styles.pickerButtonText, !city && styles.placeholderText]}>
                    {city ? US_CITIES.find(c => c.value === city)?.label : 'Select City'}
                  </Text>
                  <TagIcon icon="chevron-down" size={20} color="#999" />
                </TouchableOpacity>
                
                <Modal
                  visible={showCityPicker}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setShowCityPicker(false)}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.pickerModal}>
                      <View style={styles.pickerHeader}>
                        <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                          <Text style={styles.pickerDoneButton}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <Picker
                        selectedValue={city}
                        onValueChange={(value) => setCity(value)}
                        style={styles.picker}
                      >
                        {US_CITIES.map((c) => (
                          <Picker.Item key={c.value} label={c.label} value={c.value} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </Modal>
              </>
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={city}
                  onValueChange={(value) => setCity(value)}
                  style={styles.pickerAndroid}
                >
                  {US_CITIES.map((c) => (
                    <Picker.Item key={c.value} label={c.label} value={c.value} />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          {/* Custom City Input - Show if "Other" is selected */}
          {city === 'Other' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Enter City Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter city name"
                placeholderTextColor="#999"
                value={customCity}
                onChangeText={setCustomCity}
                autoFocus
              />
            </View>
          )}

          {/* State Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>State</Text>
            {Platform.OS === 'ios' ? (
              <>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowStatePicker(true)}
                >
                  <Text style={[styles.pickerButtonText, !state && styles.placeholderText]}>
                    {state ? US_STATES.find(s => s.value === state)?.label : 'Select State'}
                  </Text>
                  <TagIcon icon="chevron-down" size={20} color="#999" />
                </TouchableOpacity>
                
                <Modal
                  visible={showStatePicker}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setShowStatePicker(false)}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.pickerModal}>
                      <View style={styles.pickerHeader}>
                        <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                          <Text style={styles.pickerDoneButton}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <Picker
                        selectedValue={state}
                        onValueChange={(value) => setState(value)}
                        style={styles.picker}
                      >
                        {US_STATES.map((s) => (
                          <Picker.Item key={s.value} label={s.label} value={s.value} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </Modal>
              </>
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={state}
                  onValueChange={(value) => setState(value)}
                  style={styles.pickerAndroid}
                >
                  {US_STATES.map((s) => (
                    <Picker.Item key={s.value} label={s.label} value={s.value} />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          {/* Location Detail */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location Detail (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Home, Church, Park"
              placeholderTextColor="#999"
              value={locationDetail}
              onChangeText={setLocationDetail}
            />
          </View>
        </ScrollView>

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
    const finalCity = city === 'Other' ? customCity : city;
    const locationParts = [];
    if (locationDetail.trim()) locationParts.push(locationDetail.trim());
    if (finalCity.trim()) locationParts.push(finalCity.trim());
    if (state) locationParts.push(state);
    const fullLocation = locationParts.join(', ');
    
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        place: fullLocation,
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
  container: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
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
    backgroundColor: '#007AFF',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepDotComplete: {
    backgroundColor: '#34C759',
  },
  stepContainer: {
    minHeight: 200,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  tagChipsContainer: {
    paddingVertical: 8,
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    gap: 6,
  },
  tagChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tagChipText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  tagChipTextSelected: {
    color: '#fff',
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 'auto',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
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
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#007AFF',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
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
  locationFormContainer: {
    maxHeight: 300,
    marginBottom: 12,
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
  pickerButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerAndroid: {
    height: 50,
  },
  picker: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  pickerDoneButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});
