import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Linking, Modal, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Store } from '../lib/overpass';
import { checkAndIncrementAdGate, resetAdCounter } from '../lib/ads';
import { Colors, Radius } from '../lib/theme';

const AD_SECONDS = 30;

export default function StoreScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const params  = useLocalSearchParams<{ storeJson: string; categoryIcon: string }>();

  const [store,     setStore]     = useState<Store | null>(null);
  const [showAd,    setShowAd]    = useState(false);
  const [countdown, setCountdown] = useState(AD_SECONDS);
  const [canSkip,   setCanSkip]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(function() {
    try {
      const s: Store = JSON.parse(params.storeJson);
      setStore(s);
    } catch {
      router.back();
      return;
    }
    checkAndIncrementAdGate().then(function(shouldShow) {
      if (shouldShow) {
        setShowAd(true);
        startCountdown();
      }
    });
    return function() {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCountdown() {
    let secs = AD_SECONDS;
    setCountdown(secs);
    setCanSkip(false);
    timerRef.current = setInterval(function() {
      secs--;
      setCountdown(secs);
      if (secs <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setCanSkip(true);
      }
    }, 1000);
  }

  function dismissAd() {
    if (!canSkip) return;
    resetAdCounter();
    setShowAd(false);
  }

  function callStore() {
    if (!store || !store.phone) return;
    Linking.openURL('tel:' + store.phone.replace(/\s/g, ''));
  }

  function whatsApp() {
    if (!store || !store.phone) return;
    const clean = store.phone.replace(/[^0-9+]/g, '');
    const intl  = clean.startsWith('0') ? '27' + clean.slice(1) : clean.replace('+', '');
    Linking.openURL('https://wa.me/' + intl + '?text=' + encodeURIComponent('Hi ' + store.name + ', I found you on StoresNearm. '));
  }

  function openWebsite() {
    if (!store || !store.website) return;
    const url = store.website.startsWith('http') ? store.website : 'https://' + store.website;
    Linking.openURL(url);
  }

  function openDirections() {
    if (!store) return;
    const url = Platform.select({
      ios:     'maps:0,0?q=' + store.lat + ',' + store.lon,
      android: 'geo:' + store.lat + ',' + store.lon + '?q=' + encodeURIComponent(store.name),
      default: 'https://maps.google.com/?q=' + store.lat + ',' + store.lon,
    });
    Linking.openURL(url!);
  }

  if (!store) return null;

  const icon = params.categoryIcon || '🏪';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      {/* Ad interstitial — every 3rd store view */}
      <Modal visible={showAd} animationType="fade" transparent={false} statusBarTranslucent>
        <SafeAreaView style={styles.adSafe}>
          <View style={styles.adTop}>
            <Text style={styles.adEyebrow}>Advertisement</Text>
            <Text style={styles.adHeadline}>Keeping StoresNearm free</Text>
            <Text style={styles.adSub}>A short ad keeps this app 100% free for everyone</Text>
          </View>

          {/* Ad unit placeholder — swap in AdSense/AdMob when ready */}
          <View style={styles.adUnit}>
            <Text style={styles.adUnitText}>Ad space</Text>
            <Text style={styles.adUnitSub}>
              {Platform.OS === 'web' ? 'Add Google AdSense here' : 'Add Google AdMob here'}
            </Text>
          </View>

          <View style={styles.adBottom}>
            {canSkip
              ? <Text style={styles.adCountdown}>Ready to continue</Text>
              : <Text style={styles.adCountdown}>{'Continue in ' + countdown + ' seconds'}</Text>
            }
            <TouchableOpacity
              style={[styles.adContinueBtn, canSkip ? styles.adContinueBtnReady : null]}
              onPress={dismissAd}
              disabled={!canSkip}
            >
              <Text style={[styles.adContinueText, canSkip ? styles.adContinueTextReady : null]}>
                {canSkip ? 'Continue to store →' : 'Please wait...'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Top bar */}
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={function() { router.back(); }}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{store.name}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>{icon}</Text>
          {store.distanceKm != null && (
            <View style={styles.heroDist}>
              <Text style={styles.heroDistText}>
                {store.distanceKm < 0.1 ? 'Here' : store.distanceKm + ' km away'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.storeName}>{store.name}</Text>
          <Text style={styles.storeCat}>{store.category}</Text>

          {store.openingHours ? (
            <View style={styles.hoursBadge}>
              <Text style={styles.hoursText}>🕐 {store.openingHours}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />
          <Text style={styles.sectionLbl}>Contact & Location</Text>

          {store.phone ? (
            <TouchableOpacity style={styles.infoRow} onPress={callStore}>
              <Text style={styles.infoKey}>📞  Phone</Text>
              <Text style={[styles.infoVal, styles.infoValLink]}>{store.phone}</Text>
            </TouchableOpacity>
          ) : null}

          {store.website ? (
            <TouchableOpacity style={styles.infoRow} onPress={openWebsite}>
              <Text style={styles.infoKey}>🌐  Website</Text>
              <Text style={[styles.infoVal, styles.infoValLink]} numberOfLines={1}>
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

          {store.distanceKm != null ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>📏  Distance</Text>
              <Text style={styles.infoVal}>
                {store.distanceKm < 0.1 ? 'You are here' : store.distanceKm + ' km from you'}
              </Text>
            </View>
          ) : null}

          {!store.phone && !store.website && !store.address ? (
            <View style={styles.noContact}>
              <Text style={styles.noContactText}>
                This place has limited info on OpenStreetMap. Use Directions to find it on the map.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky action bar */}
      <View style={[styles.actionBar, { paddingBottom: 14 + insets.bottom }]}>
        {store.phone ? (
          <TouchableOpacity style={[styles.cta, styles.ctaCall]} onPress={callStore}>
            <Text style={styles.ctaLight}>📞 Call</Text>
          </TouchableOpacity>
        ) : null}
        {store.phone ? (
          <TouchableOpacity style={[styles.cta, styles.ctaWa]} onPress={whatsApp}>
            <Text style={styles.ctaLight}>💬 WhatsApp</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={[styles.cta, styles.ctaDir]} onPress={openDirections}>
          <Text style={styles.ctaDark}>📍 Directions</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },

  adSafe: { flex: 1, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 36 },
  adTop: { alignItems: 'center' },
  adEyebrow: { fontSize: 11, fontWeight: '500', color: Colors.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  adHeadline: { fontSize: 24, fontWeight: '300', color: Colors.black, textAlign: 'center', marginBottom: 6 },
  adSub: { fontSize: 13, color: Colors.gray, textAlign: 'center' },
  adUnit: { width: '100%', maxWidth: 340, height: 250, backgroundColor: Colors.light, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  adUnitText: { fontSize: 14, color: Colors.gray, fontWeight: '500' },
  adUnitSub: { fontSize: 12, color: Colors.muted, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
  adBottom: { width: '100%', alignItems: 'center' },
  adCountdown: { fontSize: 14, color: Colors.gray, marginBottom: 14 },
  adContinueBtn: { width: '100%', backgroundColor: Colors.light, borderRadius: Radius.lg, paddingVertical: 15, alignItems: 'center' },
  adContinueBtnReady: { backgroundColor: Colors.black },
  adContinueText: { fontSize: 15, fontWeight: '500', color: Colors.muted },
  adContinueTextReady: { color: Colors.white },

  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 7, flexShrink: 0 },
  backText: { fontSize: 13, color: Colors.black },
  topTitle: { fontSize: 15, fontWeight: '500', color: Colors.black, flex: 1 },

  hero: { height: 180, backgroundColor: Colors.light, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  heroIcon: { fontSize: 64 },
  heroDist: { position: 'absolute', top: 12, right: 14, backgroundColor: Colors.white, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  heroDistText: { fontSize: 11, fontWeight: '500', color: Colors.black },

  body: { padding: 20 },
  storeName: { fontSize: 26, fontWeight: '300', color: Colors.black, letterSpacing: -0.3, marginBottom: 4 },
  storeCat: { fontSize: 12, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  hoursBadge: { backgroundColor: Colors.greenBg, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: 16 },
  hoursText: { fontSize: 13, color: Colors.green },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 20 },
  sectionLbl: { fontSize: 11, fontWeight: '500', color: Colors.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  infoKey: { fontSize: 14, color: Colors.gray, flexShrink: 0 },
  infoVal: { fontSize: 14, color: Colors.black, textAlign: 'right', flex: 1 },
  infoValLink: { textDecorationLine: 'underline' },
  noContact: { backgroundColor: Colors.light, borderRadius: Radius.md, padding: 14, marginTop: 8 },
  noContactText: { fontSize: 13, color: Colors.gray, lineHeight: 20, textAlign: 'center' },

  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  cta: { flex: 1, paddingVertical: 14, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  ctaCall: { backgroundColor: Colors.black },
  ctaWa:   { backgroundColor: Colors.whatsapp },
  ctaDir:  { backgroundColor: Colors.light, borderWidth: 1, borderColor: Colors.border },
  ctaLight:{ fontSize: 14, fontWeight: '500', color: Colors.white },
  ctaDark: { fontSize: 14, fontWeight: '500', color: Colors.black },
});