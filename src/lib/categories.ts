export interface Category {
  key: string;
  label: string;
  icon: string;
}

export interface CategoryGroup {
  group: string;
  items: Category[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    group: 'Food & Drink',
    items: [
      { key: 'restaurant',   label: 'Restaurants',    icon: '\u{1F37D}\uFE0F' },
      { key: 'cafe',         label: 'Cafes & Coffee', icon: '\u2615' },
      { key: 'fast_food',    label: 'Fast Food',      icon: '\u{1F354}' },
      { key: 'bakery',       label: 'Bakeries',       icon: '\u{1F950}' },
      { key: 'bar',          label: 'Bars & Pubs',    icon: '\u{1F37A}' },
      { key: 'liquor_store', label: 'Liquor Stores',  icon: '\u{1F377}' },
    ],
  },
  {
    group: 'Shopping',
    items: [
      { key: 'supermarket',        label: 'Supermarkets',       icon: '\u{1F6D2}' },
      { key: 'clothing_store',     label: 'Clothing & Fashion', icon: '\u{1F455}' },
      { key: 'electronics_store',  label: 'Electronics',        icon: '\u{1F4F1}' },
      { key: 'furniture_store',    label: 'Furniture & Home',   icon: '\u{1F6CB}\uFE0F' },
      { key: 'hardware_store',     label: 'Hardware Stores',    icon: '\u{1F527}' },
      { key: 'beauty_store',       label: 'Beauty & Cosmetics', icon: '\u{1F484}' },
      { key: 'book_store',         label: 'Bookshops',          icon: '\u{1F4DA}' },
      { key: 'jewelry_store',      label: 'Jewellery',          icon: '\u{1F48D}' },
      { key: 'shoe_store',         label: 'Shoe Stores',        icon: '\u{1F45F}' },
      { key: 'florist',            label: 'Florists',           icon: '\u{1F490}' },
      { key: 'pet_store',          label: 'Pet Shops',          icon: '\u{1F43E}' },
    ],
  },
  {
    group: 'Health & Wellness',
    items: [
      { key: 'pharmacy',  label: 'Pharmacies',          icon: '\u{1F48A}' },
      { key: 'hospital',  label: 'Hospitals & Clinics', icon: '\u{1F3E5}' },
      { key: 'dentist',   label: 'Dentists',            icon: '\u{1F9B7}' },
      { key: 'gym',       label: 'Gyms & Fitness',      icon: '\u{1F3CB}\uFE0F' },
      { key: 'spa',       label: 'Spas & Wellness',     icon: '\u{1F486}' },
      { key: 'hair_care', label: 'Hair & Nail Salons',  icon: '\u2702\uFE0F' },
    ],
  },
  {
    group: 'Services & Finance',
    items: [
      { key: 'bank',               label: 'Banks & ATMs',       icon: '\u{1F3E6}' },
      { key: 'insurance_agency',   label: 'Insurance',          icon: '\u{1F6E1}\uFE0F' },
      { key: 'laundry',            label: 'Laundry',            icon: '\u{1F454}' },
      { key: 'car_repair',         label: 'Car Repair & Wash',  icon: '\u{1F697}' },
      { key: 'gas_station',        label: 'Petrol Stations',    icon: '\u26FD' },
      { key: 'car_dealer',         label: 'Car Dealerships',    icon: '\u{1F698}' },
      { key: 'real_estate_agency', label: 'Estate Agents',      icon: '\u{1F3E0}' },
      { key: 'lawyer',             label: 'Legal Services',     icon: '\u2696\uFE0F' },
      { key: 'accounting',         label: 'Accountants',        icon: '\u{1F9FE}' },
    ],
  },
  {
    group: 'Hotels & Travel',
    items: [
      { key: 'lodging',       label: 'Hotels & B&Bs',   icon: '\u{1F3E8}' },
      { key: 'travel_agency', label: 'Travel Agencies', icon: '\u2708\uFE0F' },
      { key: 'car_rental',    label: 'Car Rental',      icon: '\u{1F511}' },
    ],
  },
  {
    group: 'Education & More',
    items: [
      { key: 'school',           label: 'Schools',           icon: '\u{1F393}' },
      { key: 'library',          label: 'Libraries',         icon: '\u{1F4D6}' },
      { key: 'place_of_worship', label: 'Places of Worship', icon: '\u{1F64F}' },
      { key: 'museum',           label: 'Museums',           icon: '\u{1F3DB}\uFE0F' },
      { key: 'movie_theater',    label: 'Cinemas',           icon: '\u{1F3AC}' },
    ],
  },
];

export function getCategoryByKey(key: string): Category | undefined {
  for (const group of CATEGORY_GROUPS) {
    const found = group.items.find(function(i) { return i.key === key; });
    if (found) return found;
  }
  return undefined;
}
