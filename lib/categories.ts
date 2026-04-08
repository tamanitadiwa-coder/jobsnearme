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
      { key: 'restaurant',   label: 'Restaurants',    icon: '🍽️' },
      { key: 'cafe',         label: 'Cafes & Coffee', icon: '☕' },
      { key: 'fast_food',    label: 'Fast Food',      icon: '🍔' },
      { key: 'bakery',       label: 'Bakeries',       icon: '🥐' },
      { key: 'bar',          label: 'Bars & Pubs',    icon: '🍺' },
      { key: 'liquor_store', label: 'Liquor Stores',  icon: '🍷' },
    ],
  },
  {
    group: 'Shopping',
    items: [
      { key: 'supermarket',        label: 'Supermarkets',       icon: '🛒' },
      { key: 'clothing_store',     label: 'Clothing & Fashion', icon: '👕' },
      { key: 'electronics_store',  label: 'Electronics',        icon: '📱' },
      { key: 'furniture_store',    label: 'Furniture & Home',   icon: '🛋️' },
      { key: 'hardware_store',     label: 'Hardware Stores',    icon: '🔧' },
      { key: 'beauty_store',       label: 'Beauty & Cosmetics', icon: '💄' },
      { key: 'book_store',         label: 'Bookshops',          icon: '📚' },
      { key: 'jewelry_store',      label: 'Jewellery',          icon: '💍' },
      { key: 'shoe_store',         label: 'Shoe Stores',        icon: '👟' },
      { key: 'florist',            label: 'Florists',           icon: '💐' },
      { key: 'pet_store',          label: 'Pet Shops',          icon: '🐾' },
    ],
  },
  {
    group: 'Health & Wellness',
    items: [
      { key: 'pharmacy',  label: 'Pharmacies',          icon: '💊' },
      { key: 'hospital',  label: 'Hospitals & Clinics', icon: '🏥' },
      { key: 'dentist',   label: 'Dentists',            icon: '🦷' },
      { key: 'gym',       label: 'Gyms & Fitness',      icon: '🏋️' },
      { key: 'spa',       label: 'Spas & Wellness',     icon: '💆' },
      { key: 'hair_care', label: 'Hair & Nail Salons',  icon: '✂️' },
    ],
  },
  {
    group: 'Services & Finance',
    items: [
      { key: 'bank',               label: 'Banks & ATMs',       icon: '🏦' },
      { key: 'insurance_agency',   label: 'Insurance',          icon: '🛡️' },
      { key: 'laundry',            label: 'Laundry',            icon: '👔' },
      { key: 'car_repair',         label: 'Car Repair & Wash',  icon: '🚗' },
      { key: 'gas_station',        label: 'Petrol Stations',    icon: '⛽' },
      { key: 'car_dealer',         label: 'Car Dealerships',    icon: '🚘' },
      { key: 'real_estate_agency', label: 'Estate Agents',      icon: '🏠' },
      { key: 'lawyer',             label: 'Legal Services',     icon: '⚖️' },
      { key: 'accounting',         label: 'Accountants',        icon: '🧾' },
    ],
  },
  {
    group: 'Hotels & Travel',
    items: [
      { key: 'lodging',       label: 'Hotels & B&Bs',   icon: '🏨' },
      { key: 'travel_agency', label: 'Travel Agencies', icon: '✈️' },
      { key: 'car_rental',    label: 'Car Rental',      icon: '🔑' },
    ],
  },
  {
    group: 'Education & More',
    items: [
      { key: 'school',           label: 'Schools',           icon: '🎓' },
      { key: 'library',          label: 'Libraries',         icon: '📖' },
      { key: 'place_of_worship', label: 'Places of Worship', icon: '🙏' },
      { key: 'museum',           label: 'Museums',           icon: '🏛️' },
      { key: 'movie_theater',    label: 'Cinemas',           icon: '🎬' },
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