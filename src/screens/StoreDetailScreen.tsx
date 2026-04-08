import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { Store } from '../utils/overpass';
import { Ionicons } from '@expo/vector-icons';

// ---------------------------------------------------------------------------
// Navigation types
// ---------------------------------------------------------------------------
type RootStackParamList = {
  StoreDetail: { store: Store };
};

type StoreDetailRoute = RouteProp<RootStackParamList, 'StoreDetail'>;

// ---------------------------------------------------------------------------
// Helpers
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
};

function getCategoryIcon(category: string): string {
  return ICONS[category] ?? '🏪';
}

function formatDistance(km: number | null): string {
  if (km === null) return '';
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km} km away`;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

async function fetchOsmPhotoUrls(osmId: number): Promise<string[]> {
  const query = `[out:json];(node(${osmId});way(${osmId}););out tags;`;
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const tags = data.elements?.[0]?.tags ?? {};
    const urls: string[] = [];
    if (tags.image) urls.push(tags.image);
    if (typeof tags.wikimedia_commons === 'string' && tags.wikimedia_commons.startsWith('File:')) {
      const fname = encodeURIComponent(tags.wikimedia_commons.replace('File:', ''));
      urls.push(`https://commons.wikimedia.org/wiki/Special:FilePath/${fname}?width=600`);
    }
    return urls;
  } catch {
    return [];
  }
}

async function fetchWikimediaPhotos(storeName: string): Promise<string[]> {
  try {
    const q = encodeURIComponent(`${storeName} Cape Town`);
    const searchRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${q}&srnamespace=6&srlimit=5&format=json&origin=*`,
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const titles: string[] = (searchData.query?.search ?? [])
      .slice(0, 3)
      .map((r: any) => r.title as string);
    if (!titles.length) return [];
    const titlesParam = titles.map(encodeURIComponent).join('|');
    const infoRes = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=${titlesParam}&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`,
    );
    if (!infoRes.ok) return [];
    const infoData = await infoRes.json();
    const pages = infoData.query?.pages ?? {};
    return (Object.values(pages) as any[])
      .map((p) => p.imageinfo?.[0]?.url as string | undefined)
      .filter((u): u is string => Boolean(u));
  } catch {
    return [];
  }
}

function openUrl(url: string, label: string) {
  Linking.canOpenURL(url)
    .then((ok) => {
      if (ok) return Linking.openURL(url);
      Alert.alert('Cannot Open', `Unable to open ${label}.`);
    })
    .catch(() => Alert.alert('Error', `Failed to open ${label}.`));
}

// ---------------------------------------------------------------------------
// InfoRow component
// ---------------------------------------------------------------------------
interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
  isLink?: boolean;
  last?: boolean;
}

function InfoRow({ icon, label, value, onPress, isLink, last }: InfoRowProps) {
  const row = (
    <View style={[rowStyles.row, last && rowStyles.rowLast]}>
      <Text style={rowStyles.rowIcon}>{icon}</Text>
      <View style={rowStyles.rowBody}>
        <Text style={rowStyles.rowLabel}>{label}</Text>
        <Text
          style={[rowStyles.rowValue, isLink && rowStyles.rowLink]}
          numberOfLines={4}
        >
          {value}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {row}
      </TouchableOpacity>
    );
  }
  return row;
}

// ---------------------------------------------------------------------------
// StoreDetailScreen
// ---------------------------------------------------------------------------
export default function StoreDetailScreen() {
  const route = useRoute<StoreDetailRoute>();
  const { store } = route.params;

  const icon = getCategoryIcon(store.category);
  const categoryLabel = store.category.replace(/_/g, ' ');

  const [photos, setPhotos] = useState<string[]>([]);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPhotoLoading(true);
      let urls = await fetchOsmPhotoUrls(store.id);
      if (!urls.length) urls = await fetchWikimediaPhotos(store.name);
      if (!cancelled) { setPhotos(urls); setPhotoLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [store.id, store.name]);

  // Action handlers
  const handleCall = () => {
    if (!store.phone) return;
    const tel = `tel:${store.phone.replace(/\s/g, '')}`;
    openUrl(tel, 'phone dialler');
  };

  const handleWebsite = () => {
    if (!store.website) return;
    const url = store.website.startsWith('http')
      ? store.website
      : `https://${store.website}`;
    openUrl(url, 'website');
  };

  const handleDirections = () => {
    // Opens OpenStreetMap — no API key required
    const url = `https://www.openstreetmap.org/?mlat=${store.lat}&mlon=${store.lon}&zoom=17`;
    openUrl(url, 'map');
  };

  // Build visible info rows
  const rows: Array<InfoRowProps & { key: string }> = [];

  if (store.address) {
    rows.push({ key: 'address', icon: '📍', label: 'Address', value: store.address });
  }
  if (store.phone) {
    rows.push({
      key: 'phone',
      icon: '📞',
      label: 'Phone',
      value: store.phone,
      onPress: handleCall,
      isLink: true,
    });
  }
  if (store.website) {
    rows.push({
      key: 'website',
      icon: '🌐',
      label: 'Website',
      value: store.website,
      onPress: handleWebsite,
      isLink: true,
    });
  }
  if (store.openingHours) {
    rows.push({
      key: 'hours',
      icon: '🕐',
      label: 'Opening Hours',
      value: store.openingHours,
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Photo Gallery ── */}
        <View style={styles.gallery}>
          {photoLoading ? (
            <View style={styles.galleryPlaceholder}>
              <ActivityIndicator color="#D4A017" size="large" />
            </View>
          ) : photos.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={(e) => {
                  setActiveDot(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
                }}
              >
                {photos.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.galleryImage} resizeMode="cover" />
                ))}
              </ScrollView>
              {photos.length > 1 && (
                <View style={styles.dots}>
                  {photos.map((_, i) => (
                    <View key={i} style={[styles.dot, i === activeDot && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.galleryPlaceholder}>
              <Text style={styles.galleryFallbackIcon}>{icon}</Text>
            </View>
          )}
        </View>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Text style={styles.heroName}>{store.name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
          </View>
          <View style={styles.heroMeta}>
            {store.address ? (
              <View style={styles.metaRow}>
                <Ionicons name="location" size={13} color="#D4A017" />
                <Text style={styles.metaAddress} numberOfLines={1}>{store.address}</Text>
              </View>
            ) : null}
            {store.distanceKm !== null && (
              <View style={styles.metaRow}>
                <Ionicons name="walk" size={13} color="#D4A017" />
                <Text style={styles.metaDistance}>{formatDistance(store.distanceKm)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Quick actions ── */}
        <View style={styles.actions}>
          {store.phone && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleCall}
              activeOpacity={0.8}
            >
              <Ionicons name="call-outline" size={20} color="#D4A017" />
              <Text style={styles.actionBtnLabel}>Call</Text>
            </TouchableOpacity>
          )}
          {store.website && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleWebsite}
              activeOpacity={0.8}
            >
              <Ionicons name="globe-outline" size={20} color="#D4A017" />
              <Text style={styles.actionBtnLabel}>Website</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleDirections}
            activeOpacity={0.8}
          >
            <Ionicons name="map-outline" size={20} color="#D4A017" />
            <Text style={styles.actionBtnLabel}>Directions</Text>
          </TouchableOpacity>
        </View>

        {/* ── Info rows ── */}
        {rows.length > 0 ? (
          <View style={styles.section}>
            {rows.map((row, i) => (
              <InfoRow
                key={row.key}
                icon={row.icon}
                label={row.label}
                value={row.value}
                onPress={row.onPress}
                isLink={row.isLink}
                last={i === rows.length - 1}
              />
            ))}
          </View>
        ) : (
          <View style={styles.noInfoWrap}>
            <Text style={styles.noInfoText}>
              No additional details available for this store.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e1e1e',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    fontSize: 18,
    width: 26,
    textAlign: 'center',
    marginRight: 14,
    marginTop: 1,
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    color: '#444',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  rowValue: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
  },
  rowLink: {
    color: '#C9A84C',
    textDecorationLine: 'underline',
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingBottom: 52,
  },

  // Gallery
  gallery: {
    width: SCREEN_WIDTH,
    height: 220,
    backgroundColor: '#111111',
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: 220,
  },
  galleryPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  galleryFallbackIcon: {
    fontSize: 56,
  },
  dots: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: '#D4A017',
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 28,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e1e1e',
  },
  heroName: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  categoryBadge: {
    borderWidth: 1,
    borderColor: '#D4A017',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 14,
  },
  categoryBadgeText: {
    color: '#D4A017',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  heroMeta: {
    gap: 6,
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaAddress: {
    color: '#999999',
    fontSize: 13,
    maxWidth: SCREEN_WIDTH - 80,
  },
  metaDistance: {
    color: '#D4A017',
    fontSize: 13,
    fontWeight: '600',
  },

  // Quick actions
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e1e1e',
    gap: 12,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#D4A017',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 22,
    minWidth: 84,
    gap: 4,
  },
  actionBtnLabel: {
    color: '#D4A017',
    fontSize: 12,
    fontWeight: '600',
  },

  // Info section
  section: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  noInfoWrap: {
    paddingTop: 40,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  noInfoText: {
    color: '#333',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
  },
});
