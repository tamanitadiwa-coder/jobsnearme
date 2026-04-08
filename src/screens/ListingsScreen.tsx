import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Linking, ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ExpoLocation from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../lib/navigation';
import { fetchNearbyStores, geocodeCity } from '../lib/overpass';
import type { Store } from '../lib/overpass';
import SkeletonCard from '../components/SkeletonCard';
import { Colors, Radius } from '../lib/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Listings'>;
type Status = 'locating' | 'loading' | 'done' | 'error' | 'empty';

export default function ListingsScreen({ navigation, route }: Props) {
  const { city, lat: latParam, lon: lonParam, category, categoryLabel, categoryIcon } = route.params;

  const [stores, setStores]         = useState<Store[]>([]);
  const [status, setStatus]         = useState<Status>('locating');
  const [errorMsg, setErrorMsg]     = useState('');
  const [radius, setRadius]         = useState(5000);
  const [userLat, setUserLat]       = useState<number | null>(null);
  const [userLon, setUserLon]       = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(function() { init(); }, []);

  async function resolveCoords(): Promise<{ lat: number; lon: number } | null> {
    // 1. Params
    const pLat = latParam ? parseFloat(latParam) : NaN;
    const pLon = lonParam ? parseFloat(lonParam) : NaN;
    if (!isNaN(pLat) && !isNaN(pLon)) return { lat: pLat, lon: pLon };

    // 2. Device GPS
    try {
      const { status: perm } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (perm === 'granted') {
        const pos = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Balanced,
        });
        return { lat: pos.coords.latitude, lon: pos.coords.longitude };
      }
    } catch {}

    // 3. Geocode city name
    try {
      const geo = await geocodeCity(city);
      if (geo) return geo;
    } catch {}

    return null;
  }

  async function init() {
    setStatus('locating');
    setErrorMsg('');
    setStores([]);

    try {
      const coords = await resolveCoords();
      if (!coords) {
        setErrorMsg('Could not find location for "' + city + '". Check your internet and try again.');
        setStatus('error');
        return;
      }
      setUserLat(coords.lat);
      setUserLon(coords.lon);
      await loadStores(coords.lat, coords.lon, radius);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  async function loadStores(lat: number, lon: number, r: number) {
    setStatus('loading');
    try {
      const results = await fetchNearbyStores(lat, lon, category, r);
      setStores(results);
      setStatus(results.length === 0 ? 'empty' : 'done');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error. Check your connection and try again.');
      setStatus('error');
    }
  }

  async function expandRadius() {
    const newRadius = 10000;
    setRadius(newRadius);
    if (userLat !== null && userLon !== null) {
      await loadStores(userLat, userLon, newRadius);
    }
  }

  async function onRefresh() {
    if (userLat === null || userLon === null) return;
    setRefreshing(true);
    try {
      await loadStores(userLat, userLon, radius);
    } finally {
      setRefreshing(false);
    }
  }

  function openStore(store: Store) {
    navigation.navigate('Store', { store, categoryIcon });
  }

  function callStore(phone: string) {
    Linking.openURL('tel:' + phone.replace(/\s/g, '')).catch(function() {});
  }

  function whatsappStore(phone: string, name: string) {
    const clean = phone.replace(/[^0-9+]/g, '');
    const intl  = clean.startsWith('0') ? '27' + clean.slice(1) : clean.replace('+', '');
    Linking.openURL(
      'https://wa.me/' + intl + '?text=' + encodeURIComponent('Hi ' + name + ', I found you on StoresNearm. ')
    ).catch(function() {});
  }

  function openDirections(store: Store) {
    const label = encodeURIComponent(store.name);
    const url = Platform.select({
      ios:     'maps:0,0?q=' + store.lat + ',' + store.lon,
      android: 'geo:' + store.lat + ',' + store.lon + '?q=' + label,
      default: 'https://maps.google.com/?q=' + store.lat + ',' + store.lon,
    });
    Linking.openURL(url!).catch(function() {});
  }

  const renderStore = useCallback(function({ item }: { item: Store }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={function() { openStore(item); }}
        activeOpacity={0.85}
      >
        {/* Banner */}
        <View style={styles.cardBanner}>
          <Text style={styles.cardIcon}>{categoryIcon}</Text>
          {item.distanceKm !== null && (
            <View style={styles.distBadge}>
              <Text style={styles.distText}>
                {item.distanceKm < 0.1 ? 'Here' : item.distanceKm + ' km'}
              </Text>
            </View>
          )}
        </View>

        {/* Body */}
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
          {item.address ? (
            <Text style={styles.cardAddr} numberOfLines={2}>{item.address}</Text>
          ) : null}
          <Text style={styles.cardCat}>{item.category}</Text>

          {/* Action buttons */}
          <View style={styles.cardActions}>
            {item.phone ? (
              <TouchableOpacity
                style={[styles.actBtn, styles.actCall]}
                onPress={function() { callStore(item.phone!); }}
              >
                <Text style={styles.actTextDark}>📞 Call</Text>
              </TouchableOpacity>
            ) : null}
            {item.phone ? (
              <TouchableOpacity
                style={[styles.actBtn, styles.actWa]}
                onPress={function() { whatsappStore(item.phone!, item.name); }}
              >
                <Text style={styles.actTextLight}>💬 WA</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.actBtn, styles.actDir]}
              onPress={function() { openDirections(item); }}
            >
              <Text style={styles.actTextLight}>📍 Dir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [categoryIcon, userLat, userLon]);

  const isLoading = status === 'locating' || status === 'loading';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={function() { navigation.goBack(); }}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.topMeta}>
          <Text style={styles.topTitle} numberOfLines={1}>
            {categoryIcon} {categoryLabel}
          </Text>
          <Text style={styles.topSub} numberOfLines={1}>📍 {city}</Text>
        </View>
      </View>

      {/* Loading */}
      {isLoading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.accent} style={styles.spinner} />
          <Text style={styles.loadingTitle}>
            {status === 'locating' ? 'Getting your location...' : 'Searching nearby stores...'}
          </Text>
          <Text style={styles.loadingSub}>
            {status === 'locating' ? 'This takes a moment' : 'Powered by OpenStreetMap'}
          </Text>
          <View style={styles.skeletonWrap}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </View>
      )}

      {/* Error */}
      {status === 'error' && (
        <View style={styles.centreWrap}>
          <Text style={styles.statIcon}>⚠️</Text>
          <Text style={styles.statTitle}>Something went wrong</Text>
          <Text style={styles.statSub}>{errorMsg}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={init}>
            <Text style={styles.primaryBtnText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={function() { navigation.goBack(); }}>
            <Text style={styles.ghostBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty */}
      {status === 'empty' && (
        <View style={styles.centreWrap}>
          <Text style={styles.statIcon}>{categoryIcon}</Text>
          <Text style={styles.statTitle}>No results found</Text>
          <Text style={styles.statSub}>
            {'No ' + categoryLabel + ' found within ' + (radius / 1000) + ' km of ' + city + '.'}
          </Text>
          {radius < 10000 && (
            <TouchableOpacity style={styles.primaryBtn} onPress={expandRadius}>
              <Text style={styles.primaryBtnText}>Expand to 10 km radius</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.ghostBtn} onPress={function() { navigation.goBack(); }}>
            <Text style={styles.ghostBtnText}>Try another category</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      {status === 'done' && (
        <FlatList
          data={stores}
          keyExtractor={function(item) { return String(item.id); }}
          renderItem={renderStore}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          }
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {stores.length} result{stores.length !== 1 ? 's' : ''} within {radius / 1000} km
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

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
  topMeta: { flex: 1, minWidth: 0 },
  topTitle: { fontSize: 15, fontWeight: '500', color: Colors.text },
  topSub: { fontSize: 12, color: Colors.gray, marginTop: 2 },

  // Loading
  loadingWrap: { flex: 1, paddingTop: 40, alignItems: 'center' },
  spinner: { marginBottom: 16 },
  loadingTitle: { fontSize: 16, fontWeight: '500', color: Colors.text, marginBottom: 4 },
  loadingSub: { fontSize: 13, color: Colors.gray },
  skeletonWrap: { marginTop: 24, width: '100%', paddingHorizontal: 16 },

  // Error / Empty
  centreWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32,
  },
  statIcon: { fontSize: 52, marginBottom: 16 },
  statTitle: { fontSize: 20, fontWeight: '500', color: Colors.text, marginBottom: 8 },
  statSub: { fontSize: 14, color: Colors.gray, textAlign: 'center', lineHeight: 21, marginBottom: 24 },

  primaryBtn: {
    backgroundColor: Colors.accent, borderRadius: Radius.lg,
    paddingVertical: 14, paddingHorizontal: 28,
    alignItems: 'center', width: '100%', marginBottom: 12,
  },
  primaryBtnText: { color: '#0a0a0a', fontSize: 15, fontWeight: '700' },
  ghostBtn: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg,
    paddingVertical: 13, paddingHorizontal: 28,
    alignItems: 'center', width: '100%',
  },
  ghostBtnText: { color: Colors.gray, fontSize: 14 },

  // List
  listContent: { padding: 16, paddingBottom: 60 },
  resultsCount: { fontSize: 12, color: Colors.muted, marginBottom: 12 },

  // Store card
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, marginBottom: 16, overflow: 'hidden',
  },
  cardBanner: {
    height: 90, backgroundColor: Colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  cardIcon: { fontSize: 40 },
  distBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: Colors.bg, borderRadius: Radius.pill,
    paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  distText: { fontSize: 11, fontWeight: '600', color: Colors.text },
  cardBody: { padding: 14 },
  cardName: { fontSize: 16, fontWeight: '500', color: Colors.text, marginBottom: 4 },
  cardAddr: { fontSize: 13, color: Colors.gray, marginBottom: 4, lineHeight: 18 },
  cardCat: {
    fontSize: 11, color: Colors.muted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
  },
  cardActions: { flexDirection: 'row', gap: 8 },
  actBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  actCall: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  actWa:   { backgroundColor: Colors.whatsapp, borderColor: Colors.whatsapp },
  actDir:  { backgroundColor: Colors.surfaceAlt, borderColor: Colors.border },
  actTextDark:  { fontSize: 12, fontWeight: '700', color: '#0a0a0a' },
  actTextLight: { fontSize: 12, fontWeight: '600', color: '#ffffff' },
});
