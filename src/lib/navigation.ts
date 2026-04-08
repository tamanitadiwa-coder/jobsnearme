import type { Store } from './overpass';

export type RootStackParamList = {
  Home: undefined;
  Location: undefined;
  Category: { city: string; lat: string; lon: string };
  Listings: {
    city: string;
    lat: string;
    lon: string;
    category: string;
    categoryLabel: string;
    categoryIcon: string;
  };
  Store: { store: Store; categoryIcon: string };
};
