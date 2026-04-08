import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ExpoLocation from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  Linking, ActivityIndicator, RefreshControl, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchNearbyStores, geocodeCity, Store } from '../lib/overpass';
import { getCategoryByKey } from '../lib/categories';
import { Colors, Radius } from '../lib/theme';

type Status = 'locating' | 'loading' | 'done' | 'error' | 'empty';

function SkeletonCard() {
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
    <Animated.View style={[sk.card, { opacity }]}>
      <View style={sk.banner} />
      <View style={sk.body}>
        <View style={sk.line} />
        <View style={[sk.line, { width: '55%' }]} />
        <View style={sk.btnRow}>
          <View style={sk.btn} />
          <View style={sk.btn} />
        </View>
      </View>
    </Animated.View>
  );
}

const sk = StyleSheet.create({
  card: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, marginBottom: 16, overflow: 'hidden', backgroundColor: Colors.white },
  banner: { height: 100, backgroundColor: Colors.light },
  body: { padding: 14, gap: 10 },
  line: { height: 12, borderRadius: 6, backgroundColor: Colors.light, width: '80%' },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn: { flex: 1, height: 36, borderRadius: 10, backgroundColor: Colors.light },
});

export default function ListingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    city: string; lat: string; lon: string;
    category: string; categoryLabel: string;
  }>();

  const { city, category, categoryLabel } = params;
  const catInfo = getCategoryByKey(category);

  const [stores, setStores]       = useState<Store[]>([]);
  const [status, setStatus]       = useState<Status>('locating');
  const [errorMsg, setErrorMsg]   = useState('');
  const [userLat, setUserLat]     = useState<number | null>(null);
  const [userLon, setUserLon]     = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(function() { init(); }, []);

  async function init() {
    setStatus('locating');
    setErrorMsg('');

    let lat = params.lat ? parseFloat(params.lat) : NaN;
    let lon = params.lon ? parseFloat(params.lon) : NaN;

    if (isNaN(lat) || isNaN(lon)) {
      try {
        const { status: perm } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (perm === 'granted') {
          const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
        }
      } catch {}
    }

    if (isNaN(lat) || isNaN(lon)) {
      const geo = await geocodeCity(city);
      if (geo) { lat = geo.lat; lon = geo.lon; }
    }

    if (isNaN(lat) || isNaN(lon)) {
      setErrorMsg('Could not find location for "' + city + '". Check your internet and try again.');
      setStatus('error');
      return;
    }

    setUserLat(lat);
    setUserLon(lon);
    await loadStores(lat, lon);
  }

  async function loadStores(lat: number, lon: number) {
    setStatus('loading');
    try {
      const results = await fetchNearbyStores(lat, lon, category, 5000);
      setStores(results);
      setStatus(results.length === 0 ? 'empty' : 'done');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error. Check your connection and try again.');
      setStatus('error');
    }
  }

  async function onRefresh() {
    if (!userLat || !userLon) return;
    setRefreshing(true);
    await loadStores(userLat, userLon);
    setRefreshing(false);
  }

  function openStore(store: Store) {
    router.push({
      pathname: '/store',
      params: {
        storeJson: JSON.stringify(store),
        categoryIcon: catInfo ? catInfo.icon : '🏪',
      },
    });
  }

  function callStore(phone: string) {
    Linking.openURL('tel:' + phone.replace(/\s/g, ''));
  }

  function whatsappStore(phone: string, name: string) {
    const clean = phone.replace(/[^0-9+]/g, '');
    const intl  = clean.startsWith('0') ? '27' + clean.slice(1) : clean.replace('+', '');
    Linking.openURL('https://wa.me/' + intl + '?text=' + encodeURIComponent('Hi ' + name + ', I found you on StoresNearm. '));
  }

  function openDirections(store: Store) {
    const url = Platform.select({
      ios:     'maps:0,0?q=' + store.lat + ',' + store.lon,
      android: 'geo:' + store.lat + ',' + store.lon + '?q=' + encodeURIComponent(store.name),
      default: 'https://maps.google.com/?q=' + store.lat + ',' + store.lon,
    });
    Linking.openURL(url!);
  }

  function StoreCard({ store }: { store: Store }) {
    const icon = catInfo ? catInfo.icon : '🏪';
    return (
      <TouchableOpacity style={styles.card} onPress={function() { openStore(store); }} activeOpacity={0.85}>
        <View style={styles.cardBanner}>
          <Text style={styles.cardIcon}>{icon}</Text>
          {store.distanceKm != null && (
            <View style={styles.distBadge}>
              <Text style={styles.distText}>{store.distanceKm < 0.1 ? 'Here' : store.distanceKm + ' km'}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={2}>{store.name}</Text>
          {store.address ? <Text style={styles.cardAddr} numberOfLines={2}>{store.address}</Text> : null}
          <Text style={styles.cardCat}>{store.category}</Text>
          <View style={styles.cardActions}>
            {store.phone ? (
              <TouchableOpacity
                style={[styles.actBtn, styles.actCall]}
                onPress={function() { callStore(store.phone!); }}
              >
                <Text style={styles.actLight}>Call</Text>
              </TouchableOpacity>
            ) : null}
            {store.phone ? (
              <TouchableOpacity
                style={[styles.actBtn, styles.actWa]}
                onPress={function() { whatsappStore(store.phone!, store.name); }}
              >
                <Text style={styles.actLight}>WhatsApp</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.actBtn, styles.actDir]}
              onPress={function() { openDirections(store); }}
            >
              <Text style={styles.actDark}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={function() { router.back(); }}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.topTitle} numberOfLines={1}>{categoryLabel || (catInfo ? catInfo.label : category)}</Text>
          <Text style={styles.topSub} numberOfLines={1}>📍 {city}</Text>
        </View>
      </View>

      {(status === 'locating' || status === 'loading') && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.black} style={{ marginBottom: 16 }} />
          <Text style={styles.loadingText}>{status === 'locating' ? 'Getting your location...' : 'Finding nearby stores...'}</Text>
          <Text style={styles.loadingSub}>Searching OpenStreetMap</Text>
          <View style={{ marginTop: 24, width: '100%', paddingHorizontal: 16 }}>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </View>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.centreWrap}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptySub}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={init}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'empty' && (
        <View style={styles.centreWrap}>
          <Text style={styles.emptyIcon}>{catInfo ? catInfo.icon : '🏪'}</Text>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySub}>{'No ' + (categoryLabel || category) + ' found within 5km of ' + city + '.\nTry a nearby city or different category.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={function() { router.back(); }}>
            <Text style={styles.retryText}>Try another category</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'done' && (
        <FlatList
          data={stores}
          keyExtractor={function(item) { return String(item.id); }}
          renderItem={function({ item }) { return <StoreCard store={item} />; }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.black} />}
          ListHeaderComponent={<Text style={styles.resultsCount}>{stores.length} results found</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  topbar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.pill,
    paddingHorizontal: 14, paddingVertical: 7, flexShrink: 0,
  },
  backText: { fontSize: 13, color: Colors.black },
  topTitle: { fontSize: 15, fontWeight: '500', color: Colors.black },
  topSub:   { fontSize: 12, color: Colors.gray, marginTop: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', paddingTop: 60 },
  loadingText: { fontSize: 16, fontWeight: '500', color: Colors.black },
  loadingSub:  { fontSize: 13, color: Colors.gray, marginTop: 4 },
  centreWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon:  { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '500', color: Colors.black, marginBottom: 8 },
  emptySub:   { fontSize: 14, color: Colors.gray, textAlign: 'center', lineHeight: 21 },
  retryBtn: { marginTop: 24, backgroundColor: Colors.black, borderRadius: Radius.lg, paddingVertical: 13, paddingHorizontal: 28 },
  retryText: { color: Colors.white, fontSize: 14, fontWeight: '500' },
  listContent: { padding: 16, paddingBottom: 60 },
  resultsCount: { fontSize: 12, color: Colors.muted, marginBottom: 12 },
  card: { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, marginBottom: 16, overflow: 'hidden' },
  cardBanner: { height: 100, backgroundColor: Colors.light, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cardIcon: { fontSize: 44 },
  distBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: Colors.white, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  distText: { fontSize: 11, fontWeight: '500', color: Colors.black },
  cardBody: { padding: 14 },
  cardName: { fontSize: 16, fontWeight: '500', color: Colors.black, marginBottom: 4 },
  cardAddr: { fontSize: 13, color: Colors.gray, marginBottom: 4, lineHeight: 18 },
  cardCat:  { fontSize: 11, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actBtn: { flex: 1, minWidth: 80, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  actCall:  { backgroundColor: Colors.black, borderColor: Colors.black },
  actWa:    { backgroundColor: Colors.whatsapp, borderColor: Colors.whatsapp },
  actDir:   { backgroundColor: Colors.light, borderColor: Colors.border },
  actLight: { fontSize: 12, fontWeight: '500', color: Colors.white },
  actDark:  { fontSize: 12, fontWeight: '500', color: Colors.black },
});