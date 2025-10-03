import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

export default function PrayAnimation({ onFinish }: { onFinish: () => void }) {
  const dotAOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const scriptureOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(1200),
      Animated.parallel([
        Animated.timing(dotAOpacity, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(scriptureOpacity, {
        toValue: 1,
        duration: 1300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(onFinish, 1200);
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <Text style={styles.logoText}>Pr</Text>

        <View style={styles.dotALogoContainer}>
          {/* ".a." wrapper for vertical alignment */}
          <Animated.View style={[styles.dotAWrapper, { opacity: dotAOpacity }]}>
            <Text
              style={styles.dotA}
              allowFontScaling={false}
            >
              .a.
            </Text>
          </Animated.View>
          {/* Logo wrapper for vertical alignment */}
          <Animated.View
            style={[
              styles.logoAnimationContainer,
              { opacity: logoOpacity, transform: [{ scale: logoScale }] },
            ]}
          >
            <Image
              source={require('../../assets/images/logo-pray.png')}
              style={styles.icon}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        <Text style={styles.logoText}>y</Text>
      </View>

      <Animated.View style={[styles.scriptureContainer, { opacity: scriptureOpacity }]}>
        <Text style={styles.scripture}>
          “This charge I commit to you, son Timothy, according to the prophecies previously made concerning you, that by them you may wage the good warfare, holding faith and a good conscience.”
        </Text>
        <Text style={styles.reference}>— 1 Timothy 1:18-19a</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 64,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4B0082',
    letterSpacing: 0,
  },
  dotALogoContainer: {
    width: 65, // can adjust for more/less space
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginHorizontal: 0,
  },
  dotAWrapper: {
    position: 'absolute',
    left: 0,
    bottom: 7, // adjust this to move ".a." up/down
    width: 58,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  dotA: {
    fontSize: 58,
    fontWeight: 'bold',
    color: '#4B0082',
    letterSpacing: 0,
    textAlign: 'center',
    height: 62,
    includeFontPadding: false,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'center',
  },
  logoAnimationContainer: {
    position: 'absolute',
    left: 2, // adjust this to move logo horizontally
    top: -3,  // adjust this to move logo vertically
    width: 58,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  icon: {
    width: 70,
    height: 70,
  },
  scriptureContainer: {
    marginTop: 10,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  scripture: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  reference: {
    fontSize: 14,
    textAlign: 'center',
    color: '#4d4d4d',
  },
});
