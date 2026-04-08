import { useRouter } from 'expo-router';
import * as ExpoLocation from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { reverseGeocode } from '../lib/overpass';
import { Colors, Radius } from '../lib/theme';

interface Row {
  key: string;
  name: string;
  isHeader?: boolean;
}

const CITY_DATA: Record<string, string[]> = {
  'Western Cape': [
    'Cape Town CBD', 'Sea Point', 'Green Point', 'Bo-Kaap', 'V&A Waterfront', 'Gardens',
    'Observatory', 'Woodstock', 'Salt River', 'Claremont', 'Rondebosch', 'Newlands',
    'Kenilworth', 'Wynberg', 'Tokai', 'Constantia', 'Hout Bay', 'Camps Bay', 'Clifton',
    'Bellville', 'Parow', 'Goodwood', 'Durbanville', 'Brackenfell', 'Kraaifontein',
    'Khayelitsha', 'Mitchells Plain', 'Athlone', 'Table View', 'Bloubergstrand', 'Milnerton',
    'Stellenbosch', 'Franschhoek', 'Paarl', 'Worcester', 'George', 'Knysna', 'Mossel Bay',
    'Somerset West', 'Strand', 'Hermanus',
  ],
  'Gauteng': [
    'Johannesburg CBD', 'Sandton', 'Rosebank', 'Fourways', 'Midrand', 'Randburg',
    'Roodepoort', 'Soweto', 'Kempton Park', 'Edenvale', 'Pretoria CBD', 'Hatfield',
    'Arcadia', 'Menlyn', 'Brooklyn', 'Centurion', 'Benoni', 'Boksburg', 'Germiston',
  ],
  'KwaZulu-Natal': [
    'Durban CBD', 'Berea', 'Morningside', 'Musgrave', 'Umhlanga', 'Ballito',
    'Pinetown', 'Westville', 'Chatsworth', 'Hillcrest', 'Pietermaritzburg',
  ],
  'Eastern Cape': ['Port Elizabeth', 'East London', 'Mthatha'],
  'Free State': ['Bloemfontein', 'Welkom'],
  'Limpopo': ['Polokwane', 'Tzaneen'],
  'Mpumalanga': ['Nelspruit', 'Witbank'],
  'North West': ['Rustenburg', 'Potchefstroom'],
  'Northern Cape': ['Kimberley', 'Upington'],
  'Zimbabwe': ['Harare CBD', 'Avondale', 'Borrowdale', 'Highlands', 'Bulawayo', 'Gweru', 'Mutare', 'Masvingo'],
  'Zambia': ['Lusaka', 'Kitwe', 'Ndola', 'Livingstone'],
  'Botswana': ['Gaborone', 'Francistown'],
  'Namibia': ['Windhoek', 'Swakopmund', 'Walvis Bay'],
  'Mozambique': ['Maputo', 'Beira'],
  'Nigeria': ['Lagos', 'Abuja', 'Port Harcourt', 'Kano'],
  'Kenya': ['Nairobi', 'Mombasa', 'Kisumu'],
  'Ghana': ['Accra', 'Kumasi'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Edinburgh'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'Atlanta', 'Dallas', 'San Francisco'],
  'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
  'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
  'UAE': ['Dubai', 'Abu Dhabi', 'Sharjah'],
  'India': ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune'],
  'Germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt'],
  'France': ['Paris', 'Lyon', 'Marseille'],
  'Singapore': ['Singapore'],
};

function buildRows(filter: string): Row[] {
  const q = filter.toLowerCase().trim();
  const rows: Row[] = [];
  for (const region of Object.keys(CITY_DATA)) {
    const cities = CITY_DATA[region];
    const matched = q ? cities.filter(function(c) { return c.toLowerCase().includes(q); }) : cities;
    if (!matched.length) continue;
    rows.push({ key: 'h-' + region, name: region, isHeader: true });
    matched.forEach(function(city) {
      rows.push({ key: city, name: city });
    });
  }
  return rows;
}

export default function LocationScreen() {
  const router = useRouter();
  const [search, setSearch]         = useState('');
  const [rows, setRows]             = useState<Row[]>([]);
  const [gpsCity, setGpsCity]       = useState<string | null>(null);
  const [gpsCountry, setGpsCountry] = useState('');
  const [gpsLat, setGpsLat]         = useState<number | null>(null);
  const [gpsLon, setGpsLon]         = useState<number | null>(null);
  const [gpsState, setGpsState]     = useState<'loading' | 'found' | 'denied'>('loading');

  useEffect(function() {
    setRows(buildRows(''));
    detectGPS();
  }, []);

  async function detectGPS() {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setGpsState('denied'); return; }
      const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
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

  function handleSearch(text: string) {
    setSearch(text);
    setRows(buildRows(text));
  }

  function pick(cityName: string, lat?: number | null, lon?: number | null) {
    Keyboard.dismiss();
    router.push({
      pathname: '/category',
      params: {
        city: cityName,
        lat: lat != null ? String(lat) : '',
        lon: lon != null ? String(lon) : '',
      },
    });
  }

  function renderRow({ item }: { item: Row }) {
    if (item.isHeader) {
      return <Text style={styles.sectionLabel}>{item.name}</Text>;
    }
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={function() { pick(item.name); }}
        activeOpacity={0.7}
      >
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowArrow}>{'>'}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={function() { router.back(); }}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Select location</Text>
      </View>

      {/* GPS card */}
      <View style={styles.gpsCard}>
        {gpsState === 'loading' && (
          <View style={styles.gpsRow}>
            <ActivityIndicator size="small" color={Colors.black} />
            <Text style={styles.gpsText}>Detecting your location...</Text>
          </View>
        )}
        {gpsState === 'denied' && (
          <View style={styles.gpsDenied}>
            <Text style={styles.gpsDeniedText}>Location access denied — search below or pick manually.</Text>
          </View>
        )}
        {gpsState === 'found' && gpsCity && (
          <TouchableOpacity
            style={styles.gpsFound}
            onPress={function() { pick(gpsCity, gpsLat, gpsLon); }}
            activeOpacity={0.8}
          >
            <View style={styles.gpsFoundTop}>
              <Text style={styles.gpsTag}>Your location</Text>
              <TouchableOpacity
                style={styles.useBtn}
                onPress={function() { pick(gpsCity, gpsLat, gpsLon); }}
              >
                <Text style={styles.useBtnText}>Use this</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.gpsCity}>{gpsCity}</Text>
            <Text style={styles.gpsSub}>{gpsCountry ? gpsCountry + ' · Tap to confirm' : 'Tap to confirm'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search any city worldwide..."
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={handleSearch}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={rows}
        keyExtractor={function(item) { return item.key; }}
        renderItem={renderRow}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>No locations found</Text>}
      />
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
    paddingHorizontal: 14, paddingVertical: 7,
  },
  backText: { fontSize: 13, color: Colors.black },
  topTitle: { fontSize: 15, fontWeight: '500', color: Colors.black },

  gpsCard: {
    marginHorizontal: 16, marginTop: 14,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  gpsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 15, backgroundColor: Colors.light,
  },
  gpsText: { fontSize: 13, color: Colors.gray },
  gpsDenied: { padding: 13, backgroundColor: '#fffbf0' },
  gpsDeniedText: { fontSize: 13, color: '#7a6200' },
  gpsFound: { padding: 15, backgroundColor: Colors.white },
  gpsFoundTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  gpsTag: { fontSize: 11, color: Colors.muted, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  useBtn: { backgroundColor: Colors.black, borderRadius: Radius.pill, paddingHorizontal: 13, paddingVertical: 5 },
  useBtnText: { color: Colors.white, fontSize: 12, fontWeight: '500' },
  gpsCity: { fontSize: 17, fontWeight: '500', color: Colors.black },
  gpsSub: { fontSize: 12, color: Colors.gray, marginTop: 2 },

  searchWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  searchInput: {
    backgroundColor: Colors.light, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14, color: Colors.black,
  },
  listContent: { paddingBottom: 60 },
  sectionLabel: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
    fontSize: 11, fontWeight: '500', letterSpacing: 0.8,
    textTransform: 'uppercase', color: Colors.muted,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowName: { fontSize: 15, color: Colors.black },
  rowArrow: { fontSize: 18, color: Colors.muted },
  empty: { textAlign: 'center', padding: 40, color: Colors.gray, fontSize: 14 },
});