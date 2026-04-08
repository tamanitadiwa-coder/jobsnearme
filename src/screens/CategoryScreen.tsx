import React from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../lib/navigation';
import { CATEGORY_GROUPS } from '../lib/categories';
import { Colors, Radius } from '../lib/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Category'>;

type CatItem = { key: string; label: string; icon: string };

type GridRow =
  | { type: 'header'; label: string; key: string }
  | { type: 'grid'; left: CatItem; right: CatItem | null; key: string };

function buildRows(): GridRow[] {
  const rows: GridRow[] = [];
  for (const g of CATEGORY_GROUPS) {
    rows.push({ type: 'header', label: g.group, key: 'h-' + g.group });
    for (let i = 0; i < g.items.length; i += 2) {
      rows.push({
        type: 'grid',
        left: g.items[i],
        right: g.items[i + 1] ?? null,
        key: 'g-' + g.group + '-' + i,
      });
    }
  }
  return rows;
}

const ROWS = buildRows();

export default function CategoryScreen({ navigation, route }: Props) {
  const { city, lat, lon } = route.params;

  function pick(item: CatItem) {
    navigation.navigate('Listings', {
      city,
      lat,
      lon,
      category: item.key,
      categoryLabel: item.label,
      categoryIcon: item.icon,
    });
  }

  function CatCard({ item }: { item: CatItem }) {
    return (
      <TouchableOpacity
        style={styles.catCard}
        onPress={function() { pick(item); }}
        activeOpacity={0.72}
      >
        <Text style={styles.catIcon}>{item.icon}</Text>
        <Text style={styles.catName}>{item.label}</Text>
      </TouchableOpacity>
    );
  }

  function renderRow({ item }: { item: GridRow }) {
    if (item.type === 'header') {
      return <Text style={styles.sectionLabel}>{item.label}</Text>;
    }
    return (
      <View style={styles.gridRow}>
        <CatCard item={item.left} />
        {item.right !== null
          ? <CatCard item={item.right} />
          : <View style={[styles.catCard, { opacity: 0 }]} />
        }
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={function() { navigation.goBack(); }}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.topMeta}>
          <Text style={styles.topTitle} numberOfLines={1}>What are you looking for?</Text>
          <Text style={styles.topSub} numberOfLines={1}>📍 {city}</Text>
        </View>
      </View>

      <FlatList
        data={ROWS}
        keyExtractor={function(item) { return item.key; }}
        renderItem={renderRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
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
    borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 7, flexShrink: 0,
  },
  backText: { fontSize: 13, color: Colors.text },
  topMeta: { flex: 1, minWidth: 0 },
  topTitle: { fontSize: 15, fontWeight: '500', color: Colors.text },
  topSub: { fontSize: 12, color: Colors.gray, marginTop: 2 },

  listContent: { padding: 16, paddingBottom: 60 },

  sectionLabel: {
    fontSize: 11, fontWeight: '600', letterSpacing: 0.9,
    textTransform: 'uppercase', color: Colors.muted,
    marginTop: 22, marginBottom: 10,
  },

  gridRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },

  catCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: 16, gap: 10,
    minHeight: 80,
    justifyContent: 'flex-end',
  },
  catIcon: { fontSize: 26 },
  catName: { fontSize: 13, fontWeight: '500', color: Colors.text, lineHeight: 18 },
});
