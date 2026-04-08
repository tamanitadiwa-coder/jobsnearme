import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import StoreDetailScreen from './src/screens/StoreDetailScreen';
import MapScreen from './src/screens/MapScreen';
import SplashScreen from './src/screens/SplashScreen';
import type { Store } from './src/utils/overpass';

export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  StoreDetail: { store: Store };
  Map: { stores: Store[]; userLat: number; userLon: number };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#111111' },
            headerTintColor: '#C9A84C',
            headerTitleStyle: { color: '#ffffff', fontWeight: '600' },
            cardStyle: { backgroundColor: '#0a0a0a' },
          }}
        >
          <Stack.Screen
            name="Splash"
            component={SplashScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="StoreDetail"
            component={StoreDetailScreen}
            options={({ route }) => ({
              title: route.params.store.name,
              headerStyle: { backgroundColor: '#000000' },
              headerShadowVisible: false,
              headerTintColor: '#D4A017',
              headerTitleStyle: { color: '#ffffff', fontWeight: '700', fontSize: 17 },
              headerBackTitleVisible: false,
            })}
          />
          <Stack.Screen
            name="Map"
            component={MapScreen}
            options={{ title: 'Nearby Stores' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
