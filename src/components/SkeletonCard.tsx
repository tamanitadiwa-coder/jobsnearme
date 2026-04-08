import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { Colors, Radius } from '../lib/theme';

export default function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(function() {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return function() { pulse.stop(); };
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.banner} />
      <View style={styles.body}>
        <View style={styles.line} />
        <View style={[styles.line, { width: '55%' }]} />
        <View style={styles.btnRow}>
          <View style={styles.btn} />
          <View style={styles.btn} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  banner: {
    height: 100,
    backgroundColor: Colors.surfaceAlt,
  },
  body: {
    padding: 14,
    gap: 10,
  },
  line: {
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.surfaceAlt,
    width: '80%',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
  },
});
