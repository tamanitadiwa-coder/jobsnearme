import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';

type SplashNavProp = StackNavigationProp<RootStackParamList, 'Splash'>;

interface Props {
  navigation: SplashNavProp;
}

export default function SplashScreen({ navigation }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    // Fade + scale in
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // After 2.5s, fade out then navigate
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        navigation.replace('Home');
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigation, opacity, scale]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }] }]}>
        <Text style={styles.title}>StoresNearMe</Text>
        <Ionicons name="location" size={48} color="#D4A017" style={styles.pin} />
      </Animated.View>
      <Animated.Text style={[styles.powered, { opacity }]}>
        Powered by TAMANY.TECH
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#D4A017',
    letterSpacing: 0.5,
  },
  pin: {
    marginTop: 16,
  },
  powered: {
    position: 'absolute',
    bottom: 48,
    fontSize: 12,
    color: '#888888',
    letterSpacing: 0.3,
  },
});
