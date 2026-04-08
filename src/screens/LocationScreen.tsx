import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, ActivityIndicator,
  Platform, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ExpoLocation from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../lib/navigation';
import { reverseGeocode } from '../lib/overpass';
import { Colors, Radius } from '../lib/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Location'>;

interface CityEntry {
  name: string;
  region: string;
  lat: number;
  lon: number;
}

type ListRow =
  | { kind: 'section'; label: string; key: string }
  | { kind: 'city'; city: CityEntry; distKm?: number; key: string };

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CITIES: CityEntry[] = [
  // Western Cape
  { name: 'Cape Town CBD',    region: 'Western Cape', lat: -33.925, lon: 18.424 },
  { name: 'Sea Point',        region: 'Western Cape', lat: -33.921, lon: 18.396 },
  { name: 'Green Point',      region: 'Western Cape', lat: -33.906, lon: 18.409 },
  { name: 'Bo-Kaap',          region: 'Western Cape', lat: -33.920, lon: 18.412 },
  { name: 'V&A Waterfront',   region: 'Western Cape', lat: -33.903, lon: 18.420 },
  { name: 'Gardens',          region: 'Western Cape', lat: -33.934, lon: 18.415 },
  { name: 'Observatory',      region: 'Western Cape', lat: -33.937, lon: 18.472 },
  { name: 'Woodstock',        region: 'Western Cape', lat: -33.928, lon: 18.445 },
  { name: 'Salt River',       region: 'Western Cape', lat: -33.930, lon: 18.451 },
  { name: 'Claremont',        region: 'Western Cape', lat: -33.980, lon: 18.464 },
  { name: 'Rondebosch',       region: 'Western Cape', lat: -33.969, lon: 18.474 },
  { name: 'Newlands',         region: 'Western Cape', lat: -33.975, lon: 18.469 },
  { name: 'Kenilworth',       region: 'Western Cape', lat: -33.993, lon: 18.472 },
  { name: 'Wynberg',          region: 'Western Cape', lat: -34.001, lon: 18.465 },
  { name: 'Tokai',            region: 'Western Cape', lat: -34.049, lon: 18.441 },
  { name: 'Constantia',       region: 'Western Cape', lat: -34.025, lon: 18.437 },
  { name: 'Hout Bay',         region: 'Western Cape', lat: -34.042, lon: 18.352 },
  { name: 'Camps Bay',        region: 'Western Cape', lat: -33.950, lon: 18.376 },
  { name: 'Clifton',          region: 'Western Cape', lat: -33.942, lon: 18.373 },
  { name: 'Bellville',        region: 'Western Cape', lat: -33.902, lon: 18.631 },
  { name: 'Parow',            region: 'Western Cape', lat: -33.900, lon: 18.601 },
  { name: 'Goodwood',         region: 'Western Cape', lat: -33.895, lon: 18.548 },
  { name: 'Durbanville',      region: 'Western Cape', lat: -33.834, lon: 18.655 },
  { name: 'Brackenfell',      region: 'Western Cape', lat: -33.874, lon: 18.695 },
  { name: 'Kraaifontein',     region: 'Western Cape', lat: -33.849, lon: 18.724 },
  { name: 'Khayelitsha',      region: 'Western Cape', lat: -34.035, lon: 18.675 },
  { name: 'Mitchells Plain',  region: 'Western Cape', lat: -34.047, lon: 18.618 },
  { name: 'Athlone',          region: 'Western Cape', lat: -33.960, lon: 18.508 },
  { name: 'Table View',       region: 'Western Cape', lat: -33.823, lon: 18.489 },
  { name: 'Bloubergstrand',   region: 'Western Cape', lat: -33.802, lon: 18.464 },
  { name: 'Milnerton',        region: 'Western Cape', lat: -33.867, lon: 18.496 },
  { name: 'Stellenbosch',     region: 'Western Cape', lat: -33.935, lon: 18.861 },
  { name: 'Franschhoek',      region: 'Western Cape', lat: -33.914, lon: 19.122 },
  { name: 'Paarl',            region: 'Western Cape', lat: -33.734, lon: 18.960 },
  { name: 'Worcester',        region: 'Western Cape', lat: -33.646, lon: 19.448 },
  { name: 'George',           region: 'Western Cape', lat: -33.963, lon: 22.461 },
  { name: 'Knysna',           region: 'Western Cape', lat: -34.035, lon: 23.047 },
  { name: 'Mossel Bay',       region: 'Western Cape', lat: -34.182, lon: 22.144 },
  { name: 'Somerset West',    region: 'Western Cape', lat: -34.075, lon: 18.845 },
  { name: 'Strand',           region: 'Western Cape', lat: -34.115, lon: 18.824 },
  { name: 'Hermanus',         region: 'Western Cape', lat: -34.421, lon: 19.234 },
  // Gauteng
  { name: 'Johannesburg CBD', region: 'Gauteng', lat: -26.204, lon: 28.046 },
  { name: 'Sandton',          region: 'Gauteng', lat: -26.107, lon: 28.056 },
  { name: 'Rosebank',         region: 'Gauteng', lat: -26.147, lon: 28.044 },
  { name: 'Fourways',         region: 'Gauteng', lat: -26.019, lon: 28.012 },
  { name: 'Midrand',          region: 'Gauteng', lat: -25.991, lon: 28.123 },
  { name: 'Randburg',         region: 'Gauteng', lat: -26.090, lon: 27.982 },
  { name: 'Roodepoort',       region: 'Gauteng', lat: -26.163, lon: 27.870 },
  { name: 'Soweto',           region: 'Gauteng', lat: -26.267, lon: 27.858 },
  { name: 'Kempton Park',     region: 'Gauteng', lat: -26.100, lon: 28.230 },
  { name: 'Edenvale',         region: 'Gauteng', lat: -26.135, lon: 28.157 },
  { name: 'Pretoria CBD',     region: 'Gauteng', lat: -25.745, lon: 28.188 },
  { name: 'Hatfield',         region: 'Gauteng', lat: -25.748, lon: 28.238 },
  { name: 'Arcadia',          region: 'Gauteng', lat: -25.740, lon: 28.205 },
  { name: 'Menlyn',           region: 'Gauteng', lat: -25.782, lon: 28.276 },
  { name: 'Brooklyn',         region: 'Gauteng', lat: -25.770, lon: 28.235 },
  { name: 'Centurion',        region: 'Gauteng', lat: -25.861, lon: 28.189 },
  { name: 'Benoni',           region: 'Gauteng', lat: -26.188, lon: 28.318 },
  { name: 'Boksburg',         region: 'Gauteng', lat: -26.214, lon: 28.262 },
  { name: 'Germiston',        region: 'Gauteng', lat: -26.218, lon: 28.157 },
  // KwaZulu-Natal
  { name: 'Durban CBD',       region: 'KwaZulu-Natal', lat: -29.858, lon: 31.029 },
  { name: 'Berea',            region: 'KwaZulu-Natal', lat: -29.847, lon: 31.013 },
  { name: 'Morningside',      region: 'KwaZulu-Natal', lat: -29.836, lon: 31.014 },
  { name: 'Musgrave',         region: 'KwaZulu-Natal', lat: -29.858, lon: 31.003 },
  { name: 'Umhlanga',         region: 'KwaZulu-Natal', lat: -29.728, lon: 31.077 },
  { name: 'Ballito',          region: 'KwaZulu-Natal', lat: -29.537, lon: 31.215 },
  { name: 'Pinetown',         region: 'KwaZulu-Natal', lat: -29.819, lon: 30.858 },
  { name: 'Westville',        region: 'KwaZulu-Natal', lat: -29.830, lon: 30.938 },
  { name: 'Chatsworth',       region: 'KwaZulu-Natal', lat: -29.889, lon: 30.941 },
  { name: 'Hillcrest',        region: 'KwaZulu-Natal', lat: -29.770, lon: 30.768 },
  { name: 'Pietermaritzburg', region: 'KwaZulu-Natal', lat: -29.617, lon: 30.392 },
  // Eastern Cape
  { name: 'Port Elizabeth',   region: 'Eastern Cape', lat: -33.961, lon: 25.600 },
  { name: 'East London',      region: 'Eastern Cape', lat: -32.984, lon: 27.868 },
  { name: 'Mthatha',          region: 'Eastern Cape', lat: -31.590, lon: 28.784 },
  // Free State
  { name: 'Bloemfontein',     region: 'Free State', lat: -29.116, lon: 26.215 },
  { name: 'Welkom',           region: 'Free State', lat: -27.976, lon: 26.742 },
  // Limpopo
  { name: 'Polokwane',        region: 'Limpopo', lat: -23.897, lon: 29.447 },
  { name: 'Tzaneen',          region: 'Limpopo', lat: -23.828, lon: 30.162 },
  // Mpumalanga
  { name: 'Nelspruit',        region: 'Mpumalanga', lat: -25.474, lon: 30.970 },
  { name: 'Witbank',          region: 'Mpumalanga', lat: -25.874, lon: 29.242 },
  // North West
  { name: 'Rustenburg',       region: 'North West', lat: -25.667, lon: 27.242 },
  { name: 'Potchefstroom',    region: 'North West', lat: -26.713, lon: 27.100 },
  // Northern Cape
  { name: 'Kimberley',        region: 'Northern Cape', lat: -28.744, lon: 24.772 },
  { name: 'Upington',         region: 'Northern Cape', lat: -28.451, lon: 21.256 },
  // Zimbabwe
  { name: 'Harare CBD',       region: 'Zimbabwe', lat: -17.829, lon: 31.052 },
  { name: 'Avondale',         region: 'Zimbabwe', lat: -17.793, lon: 31.029 },
  { name: 'Borrowdale',       region: 'Zimbabwe', lat: -17.762, lon: 31.099 },
  { name: 'Highlands',        region: 'Zimbabwe', lat: -17.807, lon: 31.086 },
  { name: 'Bulawayo',         region: 'Zimbabwe', lat: -20.155, lon: 28.580 },
  { name: 'Gweru',            region: 'Zimbabwe', lat: -19.458, lon: 29.815 },
  { name: 'Mutare',           region: 'Zimbabwe', lat: -18.971, lon: 32.663 },
  { name: 'Masvingo',         region: 'Zimbabwe', lat: -20.063, lon: 30.832 },
  // Zambia
  { name: 'Lusaka',           region: 'Zambia', lat: -15.417, lon: 28.283 },
  { name: 'Kitwe',            region: 'Zambia', lat: -12.802, lon: 28.213 },
  { name: 'Ndola',            region: 'Zambia', lat: -12.958, lon: 28.637 },
  { name: 'Livingstone',      region: 'Zambia', lat: -17.842, lon: 25.854 },
  // Botswana
  { name: 'Gaborone',         region: 'Botswana', lat: -24.654, lon: 25.906 },
  { name: 'Francistown',      region: 'Botswana', lat: -21.164, lon: 27.506 },
  // Namibia
  { name: 'Windhoek',         region: 'Namibia', lat: -22.560, lon: 17.083 },
  { name: 'Swakopmund',       region: 'Namibia', lat: -22.677, lon: 14.527 },
  { name: 'Walvis Bay',       region: 'Namibia', lat: -22.963, lon: 14.506 },
  // Mozambique
  { name: 'Maputo',           region: 'Mozambique', lat: -25.966, lon: 32.590 },
  { name: 'Beira',            region: 'Mozambique', lat: -19.849, lon: 34.840 },
  // Nigeria
  { name: 'Lagos',            region: 'Nigeria', lat: 6.524, lon: 3.379 },
  { name: 'Abuja',            region: 'Nigeria', lat: 9.057, lon: 7.493 },
  { name: 'Port Harcourt',    region: 'Nigeria', lat: 4.819, lon: 7.023 },
  { name: 'Kano',             region: 'Nigeria', lat: 12.002, lon: 8.592 },
  // Kenya
  { name: 'Nairobi',          region: 'Kenya', lat: -1.286, lon: 36.820 },
  { name: 'Mombasa',          region: 'Kenya', lat: -4.043, lon: 39.668 },
  { name: 'Kisumu',           region: 'Kenya', lat: -0.103, lon: 34.762 },
  // Ghana
  { name: 'Accra',            region: 'Ghana', lat: 5.560, lon: -0.205 },
  { name: 'Kumasi',           region: 'Ghana', lat: 6.688, lon: -1.624 },
  // United Kingdom
  { name: 'London',           region: 'United Kingdom', lat: 51.509, lon: -0.118 },
  { name: 'Manchester',       region: 'United Kingdom', lat: 53.483, lon: -2.244 },
  { name: 'Birmingham',       region: 'United Kingdom', lat: 52.480, lon: -1.902 },
  { name: 'Leeds',            region: 'United Kingdom', lat: 53.800, lon: -1.549 },
  { name: 'Glasgow',          region: 'United Kingdom', lat: 55.864, lon: -4.252 },
  { name: 'Edinburgh',        region: 'United Kingdom', lat: 55.953, lon: -3.188 },
  // United States
  { name: 'New York',         region: 'United States', lat: 40.713, lon: -74.006 },
  { name: 'Los Angeles',      region: 'United States', lat: 34.052, lon: -118.244 },
  { name: 'Chicago',          region: 'United States', lat: 41.878, lon: -87.630 },
  { name: 'Houston',          region: 'United States', lat: 29.760, lon: -95.370 },
  { name: 'Miami',            region: 'United States', lat: 25.774, lon: -80.194 },
  { name: 'Atlanta',          region: 'United States', lat: 33.749, lon: -84.388 },
  { name: 'Dallas',           region: 'United States', lat: 32.779, lon: -96.808 },
  { name: 'San Francisco',    region: 'United States', lat: 37.774, lon: -122.419 },
  // Canada
  { name: 'Toronto',          region: 'Canada', lat: 43.653, lon: -79.383 },
  { name: 'Vancouver',        region: 'Canada', lat: 49.246, lon: -123.116 },
  { name: 'Montreal',         region: 'Canada', lat: 45.502, lon: -73.569 },
  { name: 'Calgary',          region: 'Canada', lat: 51.045, lon: -114.058 },
  // Australia
  { name: 'Sydney',           region: 'Australia', lat: -33.868, lon: 151.209 },
  { name: 'Melbourne',        region: 'Australia', lat: -37.813, lon: 144.963 },
  { name: 'Brisbane',         region: 'Australia', lat: -27.470, lon: 153.021 },
  { name: 'Perth',            region: 'Australia', lat: -31.950, lon: 115.859 },
  { name: 'Adelaide',         region: 'Australia', lat: -34.928, lon: 138.601 },
  // UAE
  { name: 'Dubai',            region: 'UAE', lat: 25.204, lon: 55.270 },
  { name: 'Abu Dhabi',        region: 'UAE', lat: 24.453, lon: 54.377 },
  { name: 'Sharjah',          region: 'UAE', lat: 25.338, lon: 55.421 },
  // India
  { name: 'Mumbai',           region: 'India', lat: 19.076, lon: 72.878 },
  { name: 'Delhi',            region: 'India', lat: 28.704, lon: 77.103 },
  { name: 'Bangalore',        region: 'India', lat: 12.972, lon: 77.594 },
  { name: 'Chennai',          region: 'India', lat: 13.083, lon: 80.270 },
  { name: 'Hyderabad',        region: 'India', lat: 17.385, lon: 78.487 },
  { name: 'Pune',             region: 'India', lat: 18.521, lon: 73.856 },
  // Germany
  { name: 'Berlin',           region: 'Germany', lat: 52.520, lon: 13.405 },
  { name: 'Munich',           region: 'Germany', lat: 48.135, lon: 11.582 },
  { name: 'Hamburg',          region: 'Germany', lat: 53.551, lon: 9.994 },
  { name: 'Frankfurt',        region: 'Germany', lat: 50.110, lon: 8.682 },
  // France
  { name: 'Paris',            region: 'France', lat: 48.857, lon: 2.352 },
  { name: 'Lyon',             region: 'France', lat: 45.748, lon: 4.847 },
  { name: 'Marseille',        region: 'France', lat: 43.296, lon: 5.370 },
  // Singapore
  { name: 'Singapore',        region: 'Singapore', lat: 1.352, lon: 103.820 },
];

function buildListRows(
  search: string,
  gpsLat: number | null,
  gpsLon: number | null,
): ListRow[] {
  const q = search.toLowerCase().trim();
  const rows: ListRow[] = [];

  // Nearby section — only when GPS is available and no search query
  if (!q && gpsLat !== null && gpsLon !== null) {
    const nearby = CITIES
      .map(function(c) {
        return { city: c, dist: haversineKm(gpsLat, gpsLon, c.lat, c.lon) };
      })
      .sort(function(a, b) { return a.dist - b.dist; })
      .slice(0, 8);

    rows.push({ kind: 'section', label: 'Nearby', key: '_h_nearby' });
    nearby.forEach(function(item) {
      rows.push({
        kind: 'city',
        city: item.city,
        distKm: parseFloat(item.dist.toFixed(1)),
        key: '_nb_' + item.city.name,
      });
    });
    rows.push({ kind: 'section', label: 'All Locations', key: '_h_all' });
  }

  // Grouped region list
  const grouped: Record<string, CityEntry[]> = {};
  for (const city of CITIES) {
    if (q && !city.name.toLowerCase().includes(q)) continue;
    if (!grouped[city.region]) grouped[city.region] = [];
    grouped[city.region].push(city);
  }

  for (const region of Object.keys(grouped)) {
    rows.push({ kind: 'section', label: region, key: '_h_' + region });
    for (const city of grouped[region]) {
      rows.push({ kind: 'city', city, key: '_c_' + city.name });
    }
  }

  return rows;
}

export default function LocationScreen({ navigation }: Props) {
  const [search, setSearch] = useState('');
  const [gpsCity, setGpsCity]       = useState<string | null>(null);
  const [gpsCountry, setGpsCountry] = useState('');
  const [gpsLat, setGpsLat]         = useState<number | null>(null);
  const [gpsLon, setGpsLon]         = useState<number | null>(null);
  const [gpsState, setGpsState]     = useState<'loading' | 'found' | 'denied'>('loading');

  const listData = useMemo(
    function() { return buildListRows(search, gpsLat, gpsLon); },
    [search, gpsLat, gpsLon],
  );

  useEffect(function() { detectGPS(); }, []);

  async function detectGPS() {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setGpsState('denied'); return; }
      const pos = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      setGpsLat(latitude);
      setGpsLon(longitude);
      const { city, country } = await reverseGeocode(latitude, longitude);
      setGpsCity(city);
      setGpsCountry(country);
      setGpsState('found');
    } catch {
      setGpsState('denied');
    }
  }

  function pick(city: CityEntry) {
    Keyboard.dismiss();
    navigation.navigate('Category', {
      city: city.name,
      lat: String(city.lat),
      lon: String(city.lon),
    });
  }

  function pickGps() {
    if (!gpsCity || gpsLat === null || gpsLon === null) return;
    Keyboard.dismiss();
    navigation.navigate('Category', {
      city: gpsCity,
      lat: String(gpsLat),
      lon: String(gpsLon),
    });
  }

  function renderRow({ item }: { item: ListRow }) {
    if (item.kind === 'section') {
      return <Text style={styles.sectionLabel}>{item.label}</Text>;
    }
    return (
      <TouchableOpacity
        style={styles.cityRow}
        onPress={function() { pick(item.city); }}
        activeOpacity={0.7}
      >
        <View style={styles.cityRowLeft}>
          <Text style={styles.cityName}>{item.city.name}</Text>
          <Text style={styles.cityRegion}>{item.city.region}</Text>
        </View>
        {item.distKm !== undefined
          ? <Text style={styles.cityDist}>{item.distKm < 1 ? '<1 km' : item.distKm + ' km'}</Text>
          : <Text style={styles.cityArrow}>›</Text>
        }
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={function() { navigation.goBack(); }}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Select location</Text>
      </View>

      {/* GPS card */}
      <View style={styles.gpsCard}>
        {gpsState === 'loading' && (
          <View style={styles.gpsRow}>
            <ActivityIndicator size="small" color={Colors.accent} />
            <Text style={styles.gpsText}>Detecting your location...</Text>
          </View>
        )}
        {gpsState === 'denied' && (
          <View style={styles.gpsRow}>
            <Text style={styles.gpsDeniedIcon}>⚠️</Text>
            <Text style={styles.gpsText}>Location access denied — search below or pick manually.</Text>
          </View>
        )}
        {gpsState === 'found' && gpsCity !== null && (
          <View style={styles.gpsFound}>
            <View style={styles.gpsFoundTop}>
              <View>
                <Text style={styles.gpsTag}>📍 Your location</Text>
                <Text style={styles.gpsCity}>{gpsCity}</Text>
                <Text style={styles.gpsSub}>{gpsCountry}</Text>
              </View>
              <TouchableOpacity style={styles.useBtn} onPress={pickGps}>
                <Text style={styles.useBtnText}>Use this</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search any city worldwide..."
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* City list */}
      <FlatList
        data={listData}
        keyExtractor={function(item) { return item.key; }}
        renderItem={renderRow}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No cities found for "{search}"</Text>
          </View>
        }
      />
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
    borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 7,
  },
  backText: { fontSize: 13, color: Colors.text },
  topTitle: { fontSize: 15, fontWeight: '500', color: Colors.text },

  gpsCard: {
    marginHorizontal: 16, marginTop: 14,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  gpsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, backgroundColor: Colors.surface,
  },
  gpsDeniedIcon: { fontSize: 15 },
  gpsText: { fontSize: 13, color: Colors.gray, flex: 1 },
  gpsFound: { padding: 14, backgroundColor: Colors.surface },
  gpsFoundTop: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  gpsTag: { fontSize: 11, color: Colors.accent, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  gpsCity: { fontSize: 18, fontWeight: '500', color: Colors.text },
  gpsSub: { fontSize: 12, color: Colors.gray, marginTop: 2 },
  useBtn: {
    backgroundColor: Colors.accent, borderRadius: Radius.pill,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  useBtnText: { color: '#0a0a0a', fontSize: 13, fontWeight: '700' },

  searchWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  searchInput: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14, color: Colors.text,
  },

  listContent: { paddingBottom: 60 },
  sectionLabel: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
    fontSize: 11, fontWeight: '600', letterSpacing: 0.9,
    textTransform: 'uppercase', color: Colors.muted,
  },
  cityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cityRowLeft: { flex: 1, minWidth: 0 },
  cityName: { fontSize: 15, color: Colors.text },
  cityRegion: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  cityDist: {
    fontSize: 12, color: Colors.accent, fontWeight: '600',
    marginLeft: 8, flexShrink: 0,
  },
  cityArrow: { fontSize: 20, color: Colors.muted, marginLeft: 8 },

  emptyWrap: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.gray, textAlign: 'center' },
});
