import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Linking, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../lib/navigation';
import { useStoreViewCounter } from '../hooks/useStoreViewCounter';
import { useInterstitialAd } from '../hooks/useInterstitialAd';
import AdCountdownModal from '../components/AdCountdownModal';
import { Colors, Radius } from '../lib/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Store'>;

export default function StoreScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { store, categoryIcon } = route.params;
  const counter = useStoreViewCounter();
  const ad      = useInterstitialAd();

  const [showAd, setShowAd] = useState(false);

  useEffect(function() {
    counter.incrementCount();
    // Only show the countdown if a real ad is confirmed ready
    if (counter.shouldShowAd && ad.isReady) setShowAd(true);
  }, []);

  function dismissAd() {
    counter.resetAdFlag();
    setShowAd(false);
  }

  function handleCountdownEnd() {
    // Ad is shown natively; dismissAd is called when the user closes it
    ad.show(dismissAd);
  }

  function callStore() {
    if (!store.phone) return;
    Linking.openURL('tel:' + store.phone.replace(/\s/g, '')).catch(function() {});
  }

  function whatsApp() {
    if (!store.phone) return;
    const clean = store.phone.replace(/[^0-9+]/g, '');
    const intl  = clean.startsWith('0') ? '27' + clean.slice(1) : clean.replace('+', '');
    Linking.openURL(
      'https://wa.me/' + intl + '?text=' + encodeURIComponent('Hi ' + store.name + ', I found you on StoresNearm. ')
    ).catch(function() {});
  }

  function openWebsite() {
    if (!store.website) return;
    const url = store.website.startsWith('http') ? store.website : 'https://' + store.website;
    Linking.openURL(url).catch(function() {});
  }

  function openDirections() {
    const label = encodeURIComponent(store.name);
    const url = Platform.select({
      ios:     'maps:0,0?q=' + store.lat + ',' + store.lon,
      android: 'geo:' + store.lat + ',' + store.lon + '?q=' + label,
      default: 'https://maps.google.com/?q=' + store.lat + ',' + store.lon,
    });
    Linking.openURL(url!).catch(function() {});
  }

  const hasContact = store.phone || store.website || store.address;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* ── Ad interstitial modal ── */}
      <AdCountdownModal visible={showAd} onSkip={dismissAd} onCountdownEnd={handleCountdownEnd} />

      {/* ── Top bar ── */}
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={function() { navigation.goBack(); }}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{store.name}</Text>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>{categoryIcon}</Text>
          {store.distanceKm !== null && (
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {store.distanceKm < 0.1 ? 'You are here' : store.distanceKm + ' km away'}
              </Text>
            </View>
          )}
        </View>

        {/* Info body */}
        <View style={styles.body}>
          <Text style={styles.storeName}>{store.name}</Text>
          <Text style={styles.storeCat}>{store.category}</Text>

          {store.openingHours ? (
            <View style={styles.hoursBadge}>
              <Text style={styles.hoursText}>🕐 {store.openingHours}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />
          <Text style={styles.sectionLbl}>Contact &amp; Location</Text>

          {store.phone ? (
            <TouchableOpacity style={styles.infoRow} onPress={callStore}>
              <Text style={styles.infoKey}>📞  Phone</Text>
              <Text style={[styles.infoVal, styles.infoLink]}>{store.phone}</Text>
            </TouchableOpacity>
          ) : null}

          {store.website ? (
            <TouchableOpacity style={styles.infoRow} onPress={openWebsite}>
              <Text style={styles.infoKey}>🌐  Website</Text>
              <Text style={[styles.infoVal, styles.infoLink]} numberOfLines={1}>
                {store.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </Text>
            </TouchableOpacity>
          ) : null}

          {store.address ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>📍  Address</Text>
              <Text style={styles.infoVal} numberOfLines={3}>{store.address}</Text>
            </View>
          ) : null}

          {store.distanceKm !== null ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>📏  Distance</Text>
              <Text style={styles.infoVal}>
                {store.distanceKm < 0.1 ? 'You are here' : store.distanceKm + ' km from you'}
              </Text>
            </View>
          ) : null}

          {!hasContact ? (
            <View style={styles.noContactBox}>
              <Text style={styles.noContactText}>
                Limited info on OpenStreetMap. Use Directions to find it on the map.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* ── Sticky bottom action bar ── */}
      <View style={[styles.actionBar, { paddingBottom: 14 + insets.bottom }]}>
        {store.phone ? (
          <TouchableOpacity style={[styles.cta, styles.ctaCall]} onPress={callStore}>
            <Text style={styles.ctaDark}>📞 Call</Text>
          </TouchableOpacity>
        ) : null}
        {store.phone ? (
          <TouchableOpacity style={[styles.cta, styles.ctaWa]} onPress={whatsApp}>
            <Text style={styles.ctaLight}>💬 WhatsApp</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.cta, styles.ctaDir]} onPress={openDirections}>
          <Text style={styles.ctaLight}>📍 Directions</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  // Top bar
  topbar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 7, flexShrink: 0,
  },
  backText: { fontSize: 13, color: Colors.text },
  topTitle: { fontSize: 15, fontWeight: '500', color: Colors.text, flex: 1 },

  // Hero
  hero: {
    height: 190, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  heroIcon: { fontSize: 68 },
  heroBadge: {
    position: 'absolute', top: 12, right: 14,
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.pill,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  heroBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.text },

  // Body
  body: { padding: 22 },
  storeName: {
    fontSize: 28, fontWeight: '300', color: Colors.text,
    letterSpacing: -0.4, marginBottom: 4,
  },
  storeCat: {
    fontSize: 12, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14,
  },
  hoursBadge: {
    backgroundColor: Colors.greenBg, borderRadius: Radius.pill,
    paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start', marginBottom: 18,
  },
  hoursText: { fontSize: 13, color: Colors.green },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 20 },
  sectionLbl: {
    fontSize: 11, fontWeight: '600', color: Colors.muted,
    letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    gap: 12,
  },
  infoKey: { fontSize: 14, color: Colors.gray, flexShrink: 0 },
  infoVal: { fontSize: 14, color: Colors.text, textAlign: 'right', flex: 1 },
  infoLink: { color: Colors.accent, textDecorationLine: 'underline' },
  noContactBox: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: 16, marginTop: 8,
  },
  noContactText: { fontSize: 13, color: Colors.gray, lineHeight: 20, textAlign: 'center' },

  // Sticky action bar
  actionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingTop: 14,
  },
  cta: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaCall: { backgroundColor: Colors.accent },
  ctaWa:   { backgroundColor: Colors.whatsapp },
  ctaDir:  { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  ctaDark: { fontSize: 14, fontWeight: '700', color: '#0a0a0a' },
  ctaLight: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
});
