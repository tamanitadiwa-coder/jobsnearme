import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
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

// ---------------------------------------------------------------------------
// MapScreen
// ---------------------------------------------------------------------------
export default function MapScreen() {
  const route = useRoute<MapRoute>();
  const navigation = useNavigation<MapNav>();
  const { stores, userLat, userLon } = route.params;

  const mapRef = useRef<MapView>(null);
  const [selected, setSelected] = useState<Store | null>(null);

  const recenter = useCallback(() => {
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
    const url = `https://www.openstreetmap.org/?mlat=${store.lat}&mlon=${store.lon}&zoom=17`;
    Linking.openURL(url).catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        // PROVIDER_DEFAULT uses Apple Maps on iOS (no key needed).
        // On Android the map tiles may need a Google Maps API key for full rendering.
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
        {/* 2 km search radius ring */}
        <Circle
          center={{ latitude: userLat, longitude: userLon }}
          radius={2000}
          fillColor="rgba(201,168,76,0.07)"
          strokeColor="rgba(201,168,76,0.40)"
          strokeWidth={1.5}
        />

        {/* Store markers */}
        {stores.map((store) => (
          <Marker
            key={store.id}
            coordinate={{ latitude: store.lat, longitude: store.lon }}
            pinColor="#C9A84C"
            onPress={() => setSelected(store)}
          />
        ))}
      </MapView>

      {/* ── Store count badge ── */}
      <View style={styles.badge} pointerEvents="none">
        <Text style={styles.badgeText}>
          {stores.length} store{stores.length !== 1 ? 's' : ''} within 2 km
        </Text>
      </View>

      {/* ── Re-center button ── */}
      <TouchableOpacity style={styles.recenterBtn} onPress={recenter} activeOpacity={0.85}>
        <Text style={styles.recenterIcon}>⊙</Text>
      </TouchableOpacity>

      {/* ── Store callout modal ── */}
      {selected && (
        <Modal
          transparent
          animationType="slide"
          visible
          onRequestClose={() => setSelected(null)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
            <Pressable style={styles.callout} onPress={() => {}}>
              {/* Header */}
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

              {/* Address */}
              {selected.address ? (
                <Text style={styles.calloutAddress} numberOfLines={2}>
                  📍 {selected.address}
                </Text>
              ) : null}

              {/* Hours */}
              {selected.openingHours ? (
                <Text style={styles.calloutHours} numberOfLines={2}>
                  🕐 {selected.openingHours}
                </Text>
              ) : null}

              {/* Action buttons */}
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

  // Badge
  badge: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    backgroundColor: 'rgba(10,10,10,0.88)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#C9A84C',
  },
  badgeText: {
    color: '#C9A84C',
    fontSize: 13,
    fontWeight: '600',
  },

  // Recenter button
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

  // Modal callout
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
});
