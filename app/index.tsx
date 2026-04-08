import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import { Colors, Radius } from '../lib/theme';

const PILLS = ['Restaurants', 'Pharmacies', 'Supermarkets', 'Coffee shops', 'Electronics', '+ more'];

export default function WelcomeScreen() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Font.loadAsync({
      'DM-Sans': require('../assets/fonts/DMSans-Regular.ttf'),
      'DM-Serif': require('../assets/fonts/DMSerifDisplay-Regular.ttf'),
    }).then(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoMark}>
            <Text style={styles.logoPin}>📍</Text>
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>Stores{'\n'}Near You</Text>

        {/* Tagline */}
        <Text style={styles.tagline}>
          Find local stores instantly — phone numbers,{'\n'}
          addresses, and directions. Completely free.
        </Text>

        {/* Pills */}
        <View style={styles.pillRow}>
          {PILLS.map(p => (
            <View key={p} style={styles.pill}>
              <Text style={styles.pillText}>{p}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.push('/location')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Find stores near me →</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Works worldwide · 100% free · No sign-up
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },

  logoWrap: {
    marginBottom: 28,
  },

  logoMark: {
    width: 64,
    height: 64,
    backgroundColor: Colors.black,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoPin: {
    fontSize: 28,
  },

  // ✅ FIXED: now uses serif font
  headline: {
    fontFamily: 'DM-Serif',
    fontSize: Platform.OS === 'web' ? 48 : 42,
    lineHeight: Platform.OS === 'web' ? 56 : 48,
    textAlign: 'center',
    color: Colors.black,
    marginBottom: 14,
  },

  // ✅ FIXED: uses DM Sans
  tagline: {
    fontFamily: 'DM-Sans',
    fontSize: 15,
    color: Colors.gray,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: 40,
  },

  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 48,
  },

  pill: {
    backgroundColor: Colors.light,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },

  // ✅ FIXED font
  pillText: {
    fontFamily: 'DM-Sans',
    fontSize: 12,
    color: Colors.gray,
  },

  ctaBtn: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Colors.black,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 10,
  },

  // ✅ FIXED font
  ctaText: {
    fontFamily: 'DM-Sans',
    color: Colors.white,
    fontSize: 15,
    letterSpacing: 0.2,
  },

  footerNote: {
    marginTop: 20,
    fontFamily: 'DM-Sans',
    fontSize: 12,
    color: Colors.muted,
    textAlign: 'center',
  },
});