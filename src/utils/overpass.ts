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

const RADIUS_M = 2000; // 2 km

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

function buildQuery(lat: number, lon: number): string {
  const r = RADIUS_M;
  return `[out:json][timeout:25];
(
  node["shop"](around:${r},${lat},${lon});
  way["shop"](around:${r},${lat},${lon});
  node["amenity"~"^(restaurant|cafe|fast_food|bar|pharmacy|bank|fuel|hospital|dentist|cinema)$"](around:${r},${lat},${lon});
  way["amenity"~"^(restaurant|cafe|fast_food|bar|pharmacy|bank|fuel|hospital|dentist|cinema)$"](around:${r},${lat},${lon});
  node["tourism"~"^(hotel|hostel|guest_house|museum)$"](around:${r},${lat},${lon});
  way["tourism"~"^(hotel|hostel|guest_house|museum)$"](around:${r},${lat},${lon});
  node["leisure"~"^(fitness_centre|spa)$"](around:${r},${lat},${lon});
  way["leisure"~"^(fitness_centre|spa)$"](around:${r},${lat},${lon});
);
out center body;`;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

function parseElement(el: any, userLat: number, userLon: number): Store | null {
  const tags = el.tags || {};
  const name: string = tags.name || tags['name:en'];
  if (!name) return null;

  const lat: number = el.lat ?? el.center?.lat;
  const lon: number = el.lon ?? el.center?.lon;
  if (!lat || !lon) return null;

  const addrParts = [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city'],
  ].filter(Boolean);

  const rawPhone: string | undefined =
    tags.phone || tags['contact:phone'] || tags['phone:mobile'];

  return {
    id: el.id as number,
    name,
    category:
      tags.amenity ||
      tags.shop ||
      tags.tourism ||
      tags.leisure ||
      tags.office ||
      'store',
    lat,
    lon,
    phone: rawPhone ? rawPhone.trim() : null,
    website: tags.website || tags['contact:website'] || null,
    address: addrParts.length ? addrParts.join(', ') : null,
    openingHours: tags.opening_hours || null,
    distanceKm: haversine(userLat, userLon, lat, lon),
  };
}

/**
 * Fetch shops and restaurants within 2 km of the given coordinates.
 */
export async function fetchNearbyStores(
  lat: number,
  lon: number,
): Promise<Store[]> {
  const query = buildQuery(lat, lon);
  let lastError: unknown;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const stores: Store[] = [];

      for (const el of data.elements ?? []) {
        const store = parseElement(el, lat, lon);
        if (store) stores.push(store);
      }

      // Sort by distance ascending
      stores.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
      return stores;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error('Unable to fetch nearby stores.');
}
