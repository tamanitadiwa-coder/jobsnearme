import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { fetchNearbyStores, Store } from '../utils/overpass';

// ---------------------------------------------------------------------------
// Navigation types
// ---------------------------------------------------------------------------
type RootStackParamList = {
  Home: undefined;
  StoreDetail: { store: Store };
  Map: { stores: Store[]; userLat: number; userLon: number };
};

type HomeNavProp = StackNavigationProp<RootStackParamList, 'Home'>;

// ---------------------------------------------------------------------------
// Smart search helpers
// ---------------------------------------------------------------------------
const SYNONYMS: Record<string, string[]> = {
  food:     ['restaurant', 'fast_food', 'cafe', 'bakery', 'takeaway'],
  coffee:   ['cafe', 'coffee'],
  shoes:    ['shoe_repair', 'footwear', 'shoes'],
  hair:     ['hairdresser', 'barber', 'barbershop', 'salon'],
  shop:     ['convenience', 'supermarket', 'general_store'],
  hotel:    ['hotel', 'lodge', 'guest_house'],
  drink:    ['bar', 'pub', 'brewery', 'cafe'],
  fix:      ['repair', 'service'],
  eat:      ['restaurant', 'fast_food', 'cafe', 'takeaway', 'bakery'],
  museum:   ['museum', 'gallery', 'heritage'],
  pharmacy: ['pharmacy', 'chemist', 'drug_store'],
  bank:     ['bank', 'atm', 'finance'],
  gym:      ['gym', 'fitness', 'fitness_centre', 'sport'],
};

const SYNONYM_LABELS: Record<string, string> = {
  food:     '🍽  Showing restaurants & cafes',
  coffee:   '☕  Showing cafes & coffee shops',
  shoes:    '👟  Showing shoe stores',
  hair:     '✂️  Showing hair & barber shops',
  shop:     '🏪  Showing convenience & supermarkets',
  hotel:    '🏨  Showing hotels & lodges',
  drink:    '🍺  Showing bars & pubs',
  fix:      '🔧  Showing repair & service shops',
  eat:      '🍔  Showing eateries',
  museum:   '🏛  Showing museums & galleries',
  pharmacy: '💊  Showing pharmacies & chemists',
  bank:     '🏦  Showing banks & ATMs',
  gym:      '🏋️  Showing gyms & fitness centres',
};

function smartFilter(stores: Store[], raw: string): Store[] {
  const q = raw.trim().toLowerCase();
  if (q.length < 2) return stores;

  const synonymTargets = SYNONYMS[q] ?? [];

  return stores.filter((s) => {
    const name     = s.name.toLowerCase();
    const category = s.category.toLowerCase();
    const address  = (s.address ?? '').toLowerCase();

    // 1. Fuzzy name / address substring
    if (name.includes(q) || address.includes(q)) return true;

    // 2. Category direct substring
    if (category.includes(q)) return true;

    // 3. Synonym category match
    if (synonymTargets.length > 0) {
      return synonymTargets.some((t) => category.includes(t));
    }

    return false;
  });
}

// ---------------------------------------------------------------------------
// Category icon map
// ---------------------------------------------------------------------------
const ICONS: Record<string, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  fast_food: '🍔',
  bar: '🍺',
  bakery: '🥐',
  alcohol: '🍷',
  supermarket: '🛒',
  convenience: '🏪',
  clothes: '👕',
  electronics: '📱',
  hardware: '🔧',
  beauty: '💄',
  cosmetics: '💄',
  books: '📚',
  jewelry: '💍',
  shoes: '👟',
  florist: '💐',
  pet: '🐾',
  pharmacy: '💊',
  hospital: '🏥',
  dentist: '🦷',
  fitness_centre: '🏋️',
  spa: '💆',
  hairdresser: '✂️',
  bank: '🏦',
  fuel: '⛽',
  car_repair: '🚗',
  laundry: '👔',
  hotel: '🏨',
  hostel: '🏨',
  guest_house: '🏨',
  museum: '🏛️',
  cinema: '🎬',
  store: '🏪',
};

function getCategoryIcon(category: string): string {
  return ICONS[category] ?? '🏪';
}

function formatDistance(km: number | null): string {
  if (km === null) return '';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`;
}

// ---------------------------------------------------------------------------
// Store list item
// ---------------------------------------------------------------------------
interface StoreItemProps {
  item: Store;
  onPress: () => void;
}

function StoreItem({ item, onPress }: StoreItemProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.72}>
      <View style={styles.iconWrap}>
        <Text style={styles.cardIcon}>{getCategoryIcon(item.category)}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.storeName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.storeMeta} numberOfLines={1}>
          {item.category.replace(/_/g, ' ')}
          {item.address ? `  ·  ${item.address}` : ''}
        </Text>
      </View>
      <View style={styles.cardRight}>
        {item.distanceKm !== null && (
          <Text style={styles.distance}>{formatDistance(item.distanceKm)}</Text>
        )}
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------
export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();

  const [allStores, setAllStores] = useState<Store[]>([]);
  const [filtered, setFiltered] = useState<Store[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);

  // Filter whenever query or allStores changes
  useEffect(() => {
    setFiltered(smartFilter(allStores, query));
  }, [query, allStores]);

  const suggestionLabel: string | null =
    query.trim().length >= 2 ? (SYNONYM_LABELS[query.trim().toLowerCase()] ?? null) : null;

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is required to find nearby stores.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      setUserLat(latitude);
      setUserLon(longitude);

      const stores = await fetchNearbyStores(latitude, longitude);
      setAllStores(stores);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load stores. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const openMap = useCallback(() => {
    if (userLat !== null && userLon !== null) {
      navigation.navigate('Map', { stores: allStores, userLat, userLon });
    }
  }, [navigation, allStores, userLat, userLon]);

  const renderItem: ListRenderItem<Store> = ({ item }) => (
    <StoreItem
      item={item}
      onPress={() => navigation.navigate('StoreDetail', { store: item })}
    />
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Stores Near Me</Text>
          <Text style={styles.headerSub}>
            {loading
              ? 'Locating you…'
              : error
              ? 'Could not load stores'
              : `${filtered.length} place${filtered.length !== 1 ? 's' : ''} found`}
          </Text>
        </View>
        {!loading && allStores.length > 0 && (
          <TouchableOpacity style={styles.mapBtn} onPress={openMap} activeOpacity={0.8}>
            <Text style={styles.mapBtnText}>🗺  Map</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchGlass}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search stores, categories…"
          placeholderTextColor="#444"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Text style={styles.clearX}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Synonym suggestion pill ── */}
      {suggestionLabel && (
        <View style={styles.suggestionPill}>
          <Text style={styles.suggestionText}>{suggestionLabel}</Text>
        </View>
      )}

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#C9A84C" />
          <Text style={styles.loadingLabel}>Finding nearby stores…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadStores}>
            <Text style={styles.retryLabel}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🏪</Text>
          <Text style={styles.emptyText}>
            {query ? 'No stores match your search.' : 'No stores found within 2 km.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  mapBtn: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#C9A84C',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginLeft: 12,
  },
  mapBtnText: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '600',
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  searchGlass: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    paddingVertical: 0,
  },
  clearX: {
    color: '#444',
    fontSize: 14,
    paddingHorizontal: 4,
  },

  // States
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  loadingLabel: {
    color: '#555',
    marginTop: 14,
    fontSize: 14,
  },
  errorEmoji: {
    fontSize: 44,
    marginBottom: 12,
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#C9A84C',
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  retryLabel: {
    color: '#0a0a0a',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#444',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
  },

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#1e1e1e',
    marginLeft: 72,
  },

  // Store card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  iconWrap: {
    width: 46,
    height: 46,
    backgroundColor: '#141414',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardBody: {
    flex: 1,
    marginRight: 8,
  },
  storeName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  storeMeta: {
    color: '#555',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  cardRight: {
    alignItems: 'flex-end',
    minWidth: 44,
  },
  distance: {
    color: '#C9A84C',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  chevron: {
    color: '#333',
    fontSize: 22,
    lineHeight: 22,
  },

  // Synonym suggestion
  suggestionPill: {
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: 'rgba(212,160,23,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.30)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  suggestionText: {
    color: '#D4A017',
    fontSize: 13,
    fontWeight: '500',
  },
});
