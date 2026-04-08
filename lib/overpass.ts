export interface Store {
  id: number;
  name: string;
  category: string;
  lat: number;
  lon: number;
  phone: string | null;
  website: string | null;
  address: string | null;
  openingHours: string | null;
  distanceKm: number | null;
}

const OSM_TAGS: Record<string, string[]> = {
  restaurant:        ['amenity=restaurant'],
  cafe:              ['amenity=cafe'],
  fast_food:         ['amenity=fast_food'],
  bakery:            ['shop=bakery'],
  bar:               ['amenity=bar'],
  liquor_store:      ['shop=alcohol'],
  supermarket:       ['shop=supermarket'],
  clothing_store:    ['shop=clothes'],
  electronics_store: ['shop=electronics'],
  furniture_store:   ['shop=furniture'],
  hardware_store:    ['shop=hardware'],
  beauty_store:      ['shop=beauty'],
  book_store:        ['shop=books'],
  jewelry_store:     ['shop=jewelry'],
  shoe_store:        ['shop=shoes'],
  florist:           ['shop=florist'],
  pet_store:         ['shop=pet'],
  pharmacy:          ['amenity=pharmacy'],
  hospital:          ['amenity=hospital'],
  dentist:           ['amenity=dentist'],
  gym:               ['leisure=fitness_centre'],
  spa:               ['leisure=spa'],
  hair_care:         ['shop=hairdresser'],
  bank:              ['amenity=bank'],
  insurance_agency:  ['office=insurance'],
  laundry:           ['shop=laundry'],
  car_repair:        ['shop=car_repair'],
  gas_station:       ['amenity=fuel'],
  car_dealer:        ['shop=car'],
  real_estate_agency:['office=estate_agent'],
  lawyer:            ['office=lawyer'],
  accounting:        ['office=accountant'],
  lodging:           ['tourism=hotel'],
  travel_agency:     ['shop=travel_agency'],
  car_rental:        ['shop=car_rental'],
  school:            ['amenity=school'],
  library:           ['amenity=library'],
  place_of_worship:  ['amenity=place_of_worship'],
  museum:            ['tourism=museum'],
  movie_theater:     ['amenity=cinema'],
};

function buildQuery(lat: number, lon: number, categoryKey: string, radius: number): string {
  const tags = OSM_TAGS[categoryKey] || ['amenity=' + categoryKey];
  const nodes = tags.map(function(t) {
    const parts = t.split('=');
    return 'node["' + parts[0] + '"="' + parts[1] + '"](around:' + radius + ',' + lat + ',' + lon + ');';
  }).join('\n');
  const ways = tags.map(function(t) {
    const parts = t.split('=');
    return 'way["' + parts[0] + '"="' + parts[1] + '"](around:' + radius + ',' + lat + ',' + lon + ');';
  }).join('\n');
  return '[out:json][timeout:30];\n(\n' + nodes + '\n' + ways + '\n);\nout center body;';
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

function parsePhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const clean = raw.replace(/[^0-9+]/g, '');
  if (clean.startsWith('0') && clean.length === 10) {
    return '+27' + clean.slice(1);
  }
  return raw.trim() || null;
}

function parseElement(el: any, userLat: number, userLon: number): Store | null {
  const tags = el.tags || {};
  const name = tags.name || tags['name:en'] || null;
  if (!name) return null;
  const lat = el.lat != null ? el.lat : (el.center ? el.center.lat : null);
  const lon = el.lon != null ? el.lon : (el.center ? el.center.lon : null);
  if (!lat || !lon) return null;
  const addrParts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city'],
  ].filter(Boolean);
  return {
    id: el.id,
    name: name,
    category: tags.amenity || tags.shop || tags.tourism || tags.leisure || tags.office || 'store',
    lat: lat,
    lon: lon,
    phone: parsePhone(tags.phone || tags['contact:phone'] || undefined),
    website: tags.website || tags['contact:website'] || null,
    address: addrParts.length ? addrParts.join(', ') : null,
    openingHours: tags.opening_hours || null,
    distanceKm: haversine(userLat, userLon, lat, lon),
  };
}

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

export async function fetchNearbyStores(
  lat: number,
  lon: number,
  categoryKey: string,
  radius: number = 5000
): Promise<Store[]> {
  const query = buildQuery(lat, lon, categoryKey, radius);
  let lastErr: any = null;
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const stores: Store[] = [];
      for (const el of (data.elements || [])) {
        const s = parseElement(el, lat, lon);
        if (s) stores.push(s);
      }
      stores.sort(function(a, b) { return (a.distanceKm || 99) - (b.distanceKm || 99); });
      return stores;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('Failed to load stores');
}

export async function reverseGeocode(lat: number, lon: number): Promise<{ city: string; country: string }> {
  try {
    const res = await fetch(
      'https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lon + '&format=json',
      { headers: { 'User-Agent': 'StoresNearm/1.0' } }
    );
    const d = await res.json();
    const addr = d.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || addr.state || 'Your area';
    return { city: city, country: addr.country || '' };
  } catch {
    return { city: 'Your area', country: '' };
  }
}

export async function geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(city) + '&format=json&limit=1';
    const res = await fetch(url, { headers: { 'User-Agent': 'StoresNearm/1.0' } });
    const data = await res.json();
    if (data.length) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch {}
  return null;
}