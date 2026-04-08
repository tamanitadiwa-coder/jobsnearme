import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'sn_view_count';
const AD_EVERY = 3;

export async function checkAndIncrementAdGate(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const count = parseInt(raw || '0', 10) + 1;
    await AsyncStorage.setItem(KEY, String(count));
    return count % AD_EVERY === 0;
  } catch {
    return false;
  }
}

export async function resetAdCounter(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '0');
  } catch {}
}