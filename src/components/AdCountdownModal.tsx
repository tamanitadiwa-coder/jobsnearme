import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

const COUNTDOWN  = 5;
const SKIP_AFTER = 3; // seconds before Skip appears

type Props = {
  visible: boolean;
  onSkip: () => void;         // user pressed Skip — dismiss immediately, no ad
  onCountdownEnd: () => void; // timer hit 0 — caller should show the interstitial
};

export default function AdCountdownModal({ visible, onSkip, onCountdownEnd }: Props) {
  const [countdown, setCountdown] = useState(COUNTDOWN);
  const [showSkip, setShowSkip]   = useState(false);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(function() {
    if (!visible) return;

    setCountdown(COUNTDOWN);
    setShowSkip(false);
    fadeAnim.setValue(0);

    Animated.timing(fadeAnim, {
      toValue: 1, duration: 300, useNativeDriver: true,
    }).start();

    let secs = COUNTDOWN;
    timerRef.current = setInterval(function() {
      secs -= 1;
      setCountdown(secs);

      if (secs <= COUNTDOWN - SKIP_AFTER) setShowSkip(true);

      if (secs <= 0) {
        clearInterval(timerRef.current!);
        Animated.timing(fadeAnim, {
          toValue: 0, duration: 200, useNativeDriver: true,
        }).start(function() { onCountdownEnd(); });
      }
    }, 1000);

    return function() {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  function handleSkip() {
    if (timerRef.current) clearInterval(timerRef.current);
    onSkip();
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {showSkip && (
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.countdown}>{countdown}</Text>
      <Text style={styles.subtitle}>Loading your next store...</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#D4A017',
  },
  countdown: {
    fontSize: 96,
    fontWeight: '700',
    color: '#D4A017',
    lineHeight: 100,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 16,
  },
});
