import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Linking,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { Store } from '../utils/overpass';

// ---------------------------------------------------------------------------
// Navigation types
// ---------------------------------------------------------------------------
type RootStackParamList = {
  Home: undefined;
  StoreDetail: { store: Store };
  Map: { stores: Store[]; userLat: number; userLon: number };
};

type MapRoute = RouteProp<RootStackParamList, 'Map'>;
type MapNav = StackNavigationProp<RootStackParamList, 'Map'>;

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
  hotel: '🏨',
  museum: '🏛️',
  cinema: '🎬',
};

function getCategoryIcon(category: string): string {
  return ICONS[category] ?? '🏪';
}

function formatDistance(km: number | null): string {
  if (km === null) return '';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`;
}

function openStoreDirections(store: Store) {
  const url = `https://www.openstreetmap.org/?mlat=${store.lat}&mlon=${store.lon}&zoom=17`;
  Linking.openURL(url).catch(() => {});
}

// Try common image field names without forcing Store type changes
function getStoreImage(store: Store): string | null {
  const s = store as Store & {
    image?: string | null;
    imageUrl?: string | null;
    photo?: string | null;
    photoUrl?: string | null;
    picture?: string | null;
    pictureUrl?: string | null;
    thumbnail?: string | null;
    thumbnailUrl?: string | null;
  };

  const candidates = [
    s.image,
    s.imageUrl,
    s.photo,
    s.photoUrl,
    s.picture,
    s.pictureUrl,
    s.thumbnail,
    s.thumbnailUrl,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// MapScreen
// ---------------------------------------------------------------------------
export default function MapScreen() {
  const route = useRoute<MapRoute>();
  const navigation = useNavigation<MapNav>();
  const { stores, userLat, userLon } = route.params;

  const [selected, setSelected] = useState<Store | null>(null);
  const mapRef = useRef<any>(null);

  const recenter = useCallback(() => {
    if (Platform.OS === 'web') return;

    mapRef.current?.animateToRegion(
      {
        latitude: userLat,
        longitude: userLon,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      },
      350,
    );
  }, [userLat, userLon]);

  const openDirections = useCallback((store: Store) => {
    openStoreDirections(store);
  }, []);

  // -------------------------------------------------------------------------
  // Web fallback
  // -------------------------------------------------------------------------
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.webHeader}>
          <Text style={styles.webTitle}>Nearby stores</Text>
          <Text style={styles.webSubtitle}>
            Interactive map is available in the mobile app.
          </Text>
        </View>

        <View style={styles.webBadgeWrap}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {stores.length} store{stores.length !== 1 ? 's' : ''} within 2 km
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.webMapsBtn}
          onPress={() =>
            Linking.openURL(
              `https://www.openstreetmap.org/#map=15/${userLat}/${userLon}`
            ).catch(() => {})
          }
          activeOpacity={0.85}
        >
          <Text style={styles.webMapsBtnText}>Open area in browser map</Text>
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.webListContent}
          showsVerticalScrollIndicator={false}
        >
          {stores.map((store) => {
            const storeImage = getStoreImage(store);

            return (
              <View key={store.id} style={styles.webCard}>
                {storeImage ? (
                  <Image
                    source={{ uri: storeImage }}
                    style={styles.webCardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.webCardImageFallback}>
                    <Text style={styles.webCardImageFallbackIcon}>
                      {getCategoryIcon(store.category)}
                    </Text>
                  </View>
                )}

                <View style={styles.webCardHeader}>
                  <Text style={styles.webCardIcon}>
                    {getCategoryIcon(store.category)}
                  </Text>

                  <View style={styles.webCardMeta}>
                    <Text style={styles.webCardName} numberOfLines={2}>
                      {store.name}
                    </Text>
                    <Text style={styles.webCardCategory}>
                      {store.category.replace(/_/g, ' ')}
                    </Text>
                  </View>

                  {store.distanceKm !== null ? (
                    <Text style={styles.webCardDistance}>
                      {formatDistance(store.distanceKm)}
                    </Text>
                  ) : null}
                </View>

                {store.address ? (
                  <Text style={styles.webCardAddress} numberOfLines={2}>
                    📍 {store.address}
                  </Text>
                ) : null}

                {store.openingHours ? (
                  <Text style={styles.webCardHours} numberOfLines={2}>
                    🕐 {store.openingHours}
                  </Text>
                ) : null}

                <View style={styles.webCardActions}>
                  <TouchableOpacity
                    style={styles.calloutBtn}
                    onPress={() => navigation.navigate('StoreDetail', { store })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.calloutBtnPrimary}>View Details</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.calloutBtn, styles.calloutBtnSecondary]}
                    onPress={() => openDirections(store)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.calloutBtnSecondaryText}>Directions</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {stores.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No stores found</Text>
              <Text style={styles.emptyStateText}>
                Try a different category or search area.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Native map (Android / iOS only)
  // -------------------------------------------------------------------------
  const Maps = require('react-native-maps');
  const MapView = Maps.default;
  const Marker = Maps.Marker;
  const Circle = Maps.Circle;
  const PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={{
          latitude: userLat,
          longitude: userLon,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
        rotateEnabled={false}
      >
        <Circle
          center={{ latitude: userLat, longitude: userLon }}
          radius={2000}
          fillColor="rgba(201,168,76,0.07)"
          strokeColor="rgba(201,168,76,0.40)"
          strokeWidth={1.5}
        />

        {stores.map((store: Store) => (
          <Marker
            key={store.id}
            coordinate={{ latitude: store.lat, longitude: store.lon }}
            pinColor="#C9A84C"
            onPress={() => setSelected(store)}
          />
        ))}
      </MapView>

      <View style={styles.badgeNative} pointerEvents="none">
        <Text style={styles.badgeText}>
          {stores.length} store{stores.length !== 1 ? 's' : ''} within 2 km
        </Text>
      </View>

      <TouchableOpacity style={styles.recenterBtn} onPress={recenter} activeOpacity={0.85}>
        <Text style={styles.recenterIcon}>⊙</Text>
      </TouchableOpacity>

      {selected && (
        <Modal
          transparent
          animationType="slide"
          visible
          onRequestClose={() => setSelected(null)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
            <Pressable style={styles.callout} onPress={() => {}}>
              <View style={styles.calloutHeader}>
                <Text style={styles.calloutIcon}>
                  {getCategoryIcon(selected.category)}
                </Text>
                <View style={styles.calloutMeta}>
                  <Text style={styles.calloutName} numberOfLines={2}>
                    {selected.name}
                  </Text>
                  <Text style={styles.calloutCategory}>
                    {selected.category.replace(/_/g, ' ')}
                  </Text>
                </View>
                {selected.distanceKm !== null && (
                  <Text style={styles.calloutDistance}>
                    {formatDistance(selected.distanceKm)}
                  </Text>
                )}
              </View>

              {selected.address ? (
                <Text style={styles.calloutAddress} numberOfLines={2}>
                  📍 {selected.address}
                </Text>
              ) : null}

              {selected.openingHours ? (
                <Text style={styles.calloutHours} numberOfLines={2}>
                  🕐 {selected.openingHours}
                </Text>
              ) : null}

              <View style={styles.calloutActions}>
                <TouchableOpacity
                  style={styles.calloutBtn}
                  onPress={() => {
                    setSelected(null);
                    navigation.navigate('StoreDetail', { store: selected });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.calloutBtnPrimary}>View Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.calloutBtn, styles.calloutBtnSecondary]}
                  onPress={() => openDirections(selected)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.calloutBtnSecondaryText}>Directions</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  map: {
    flex: 1,
  },

  badge: {
    backgroundColor: 'rgba(10,10,10,0.88)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#C9A84C',
    zIndex: 2,
  },
  badgeNative: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    backgroundColor: 'rgba(10,10,10,0.88)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#C9A84C',
    zIndex: 2,
  },
  webBadgeWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  badgeText: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '600',
  },

  recenterBtn: {
    position: 'absolute',
    bottom: 44,
    right: 20,
    width: 50,
    height: 50,
    backgroundColor: '#0a0a0a',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C9A84C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 8,
  },
  recenterIcon: {
    color: '#C9A84C',
    fontSize: 22,
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  callout: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderColor: '#222',
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  calloutIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  calloutMeta: {
    flex: 1,
  },
  calloutName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  calloutCategory: {
    color: '#555',
    fontSize: 13,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  calloutDistance: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  calloutAddress: {
    color: '#888',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  calloutHours: {
    color: '#888',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  calloutActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  calloutBtn: {
    flex: 1,
    backgroundColor: '#C9A84C',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  calloutBtnPrimary: {
    color: '#0a0a0a',
    fontWeight: '700',
    fontSize: 14,
  },
  calloutBtnSecondary: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
  },
  calloutBtnSecondaryText: {
    color: '#C9A84C',
    fontWeight: '600',
    fontSize: 14,
  },

  webHeader: {
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  webTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  webSubtitle: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  webMapsBtn: {
    marginTop: 16,
    marginHorizontal: 20,
    backgroundColor: '#C9A84C',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  webMapsBtnText: {
    color: '#0a0a0a',
    fontWeight: '700',
    fontSize: 14,
  },
  webListContent: {
    padding: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  webCard: {
    backgroundColor: '#111111',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#222',
    overflow: 'hidden',
  },
  webCardImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginBottom: 14,
    backgroundColor: '#1a1a1a',
  },
  webCardImageFallback: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginBottom: 14,
    backgroundColor: '#171717',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  webCardImageFallbackIcon: {
    fontSize: 42,
  },
  webCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  webCardIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  webCardMeta: {
    flex: 1,
  },
  webCardName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  webCardCategory: {
    color: '#666',
    fontSize: 13,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  webCardDistance: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  webCardAddress: {
    color: '#888',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  webCardHours: {
    color: '#888',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 6,
  },
  webCardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  emptyState: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  emptyStateTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyStateText: {
    color: '#777',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
});