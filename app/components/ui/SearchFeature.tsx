import debounce from 'lodash.debounce';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityRole, Keyboard, StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export const SEARCH_BAR_HEIGHT = 58; // Increased for better touch targets

type Props = {
  value: string;
  onChange: (query: string) => void;
  onSubmit?: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

export default function SearchFeature({
  value,
  onChange,
  onSubmit,
  onFocus,
  onBlur,
}: Props) {
  const inputRef = useRef<TextInput>(null);
  const [internalValue, setInternalValue] = useState(value);

  // Debounce onChange handler to reduce excessive calls, memoized properly
  const debouncedChange = useMemo(() => debounce(onChange, 300), [onChange]);

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      debouncedChange.cancel();
    };
  }, [debouncedChange]);

  const onTextChange = (text: string) => {
    setInternalValue(text);
    debouncedChange(text);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <Icon name="search" size={22} color="#777" style={styles.icon} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Search encounters"
          placeholderTextColor="#777"
          value={internalValue}
          onChangeText={onTextChange}
          onFocus={onFocus}
          onBlur={onBlur}
          returnKeyType="search"
          onSubmitEditing={() => onSubmit?.(internalValue)}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="never" // Using custom clear button
          accessibilityRole={'search' as AccessibilityRole}
          accessibilityHint="Enter search text to filter encounters"
          importantForAutofill="yes"
          keyboardAppearance="default"
          underlineColorAndroid="transparent"
        />
        {!!internalValue && (
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.clearBtn}
            onPress={() => {
              setInternalValue('');
              onChange('');
              Keyboard.dismiss();
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear search text"
            accessibilityHint="Clears the search input field"
          >
            <Text style={styles.clearBtnText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    width: '100%',
    height: SEARCH_BAR_HEIGHT,
    justifyContent: 'center',
    paddingBottom: 6,
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,

    // Shadows for iOS and Android for subtle elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  icon: {
    position: 'absolute',
    left: 12,
    zIndex: 10,
  },
  input: {
    height: 42, // adjusted to fit nicely within 58 total height
    paddingLeft: 40, // room for left search icon
    paddingRight: 40, // room for right clear button
    fontSize: 16,
    color: '#111',
  },
  clearBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    padding: 6,
    zIndex: 10,
  },
  clearBtnText: {
    fontSize: 20,
    color: '#999',
  },
});
