import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const scriptureRegex = /\b([1-3]?\s?[A-Za-z]+)\s+(\d{1,3}):(\d{1,3})\b/g;

interface ScriptureTaggedTextProps {
  text: string;
  highlightWords?: string[]; // optional highlight words
  highlightStyle?: object;
  style?: object;
}

export const ScriptureTaggedText: React.FC<ScriptureTaggedTextProps> = ({
  text,
  highlightWords = [],
  highlightStyle = { backgroundColor: 'yellow' },
  style = {},
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [verseText, setVerseText] = useState('');
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState('');

  const fetchVerse = async (ref: string) => {
    try {
      setLoading(true);
      setModalVisible(true);
      setReference(ref);

      const cleanRef = ref.replace(/\s+/g, '+'); // eg John 3:16 -> John+3:16
      const url = `https://bible-api.com/${cleanRef}`;

      const response = await fetch(url);
      const json = await response.json();

      if (json?.verses && json.verses.length > 0) {
        setVerseText(json.verses.map((v: any) => v.text).join(' '));
      } else if (json.text) {
        setVerseText(json.text);
      } else {
        setVerseText('Verse not found.');
      }
    } catch {
      setVerseText('Unable to fetch scripture.');
      setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const openBibleGateway = (ref: string) => {
    const url = `https://www.biblegateway.com/passage/?search=${encodeURIComponent(
      ref
    )}&version=ESV`;
    Linking.openURL(url);
  };

  // Utility to escape RegExp special chars in string
  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Helper function to split and render text with highlight style
  const highlightTextSegments = (segmentText: string, keyPrefix: string) => {
    if (!highlightWords.length) {
      return <Text key={`${keyPrefix}-plain`}>{segmentText}</Text>;
    }
    const regex = new RegExp(
      `(${highlightWords.map(w => escapeRegExp(w)).join('|')})`,
      'gi'
    );
    const splitPieces = segmentText.split(regex);
    return splitPieces.map((piece, idx) => {
      const isMatch = highlightWords.some(
        w => w.toLowerCase() === piece.toLowerCase()
      );
      return isMatch ? (
        <Text key={`${keyPrefix}-hl-${idx}`} style={highlightStyle}>
          {piece}
        </Text>
      ) : (
        <Text key={`${keyPrefix}-normal-${idx}`}>{piece}</Text>
      );
    });
  };

  // Main function to build text nodes with scripture links and highlighting
  const renderTextWithTagsAndHighlights = () => {
    let elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = scriptureRegex.exec(text)) !== null) {
      // Plain text before scripture
      if (match.index > lastIndex) {
        const plainText = text.slice(lastIndex, match.index);
        elements.push(highlightTextSegments(plainText, `plain-${lastIndex}`));
      }
      const ref = match[0];
      elements.push(
        <TouchableOpacity
          key={`link-${match.index}`}
          onPress={() => fetchVerse(ref)}
          onLongPress={() => openBibleGateway(ref)}
          accessibilityRole="link"
          accessibilityLabel={`Open scripture reference ${ref}`}
          activeOpacity={0.6}
        >
          <Text style={styles.link}>
            {highlightTextSegments(ref, `ref-${match.index}`)}
          </Text>
        </TouchableOpacity>
      );
      lastIndex = scriptureRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      const plainText = text.slice(lastIndex);
      elements.push(highlightTextSegments(plainText, `plain-end`));
    }
    return elements;
  };

  return (
    <>
      <Text style={style}>{renderTextWithTagsAndHighlights()}</Text>
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.refText}>{reference}</Text>
              {loading ? (
                <ActivityIndicator size="large" />
              ) : (
                <>
                  <Text style={styles.verseText}>{verseText}</Text>
                  <TouchableOpacity
                    style={styles.linkOutButton}
                    onPress={() => openBibleGateway(reference)}
                  >
                    <Text style={styles.linkOutText}>Read full passage on Bible Gateway</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: '#777', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  link: {
    color: 'blue',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    width: '80%',
    maxHeight: '70%',
    elevation: 5,
  },
  refText: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 12,
    textAlign: 'center',
  },
  verseText: {
    fontSize: 16,
    color: '#333',
  },
  linkOutButton: {
    marginTop: 16,
    paddingVertical: 8,
    backgroundColor: '#1976d2',
    borderRadius: 6,
    alignItems: 'center',
  },
  linkOutText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 24,
    alignItems: 'center',
  },
});
