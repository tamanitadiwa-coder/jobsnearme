import { useRouter, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CATEGORY_GROUPS } from '../lib/categories';
import { Colors, Radius } from '../lib/theme';

type GridRow = { type: 'header'; label: string; key: string } | { type: 'grid'; items: typeof CATEGORY_GROUPS[0]['items']; key: string };

function buildRows(): GridRow[] {
  const rows: GridRow[] = [];
  CATEGORY_GROUPS.forEach(function(g) {
    rows.push({ type: 'header', label: g.group, key: 'h-' + g.group });
    for (let i = 0; i < g.items.length; i += 2) {
      rows.push({ type: 'grid', items: g.items.slice(i, i + 2), key: 'g-' + g.group + '-' + i });
    }
  });
  return rows;
}

const ROWS = buildRows();

export default function CategoryScreen() {
  const router = useRouter();
  const { city, lat, lon } = useLocalSearchParams<{ city: string; lat: string; lon: string }>();

  function pick(key: string, label: string) {
    router.push({
      pathname: '/listings',
      params: { city: city, lat: lat, lon: lon, category: key, categoryLabel: label },
    });
  }

  function renderRow({ item }: { item: GridRow }) {
    if (item.type === 'header') {
      return <Text style={styles.sectionLabel}>{item.label}</Text>;
    }
    return (
      <View style={styles.gridRow}>
        {item.items.map(function(cat) {
          return (
            <TouchableOpacity
              key={cat.key}
              style={styles.catCard}
              onPress={function() { pick(cat.key, cat.label); }}
              activeOpacity={0.75}
            >
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text style={styles.catName}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
        {item.items.length === 1 && <View style={[styles.catCard, { opacity: 0 }]} />}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={function() { router.back(); }}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
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
  safe: { flex: 1, backgroundColor: Colors.white },
  topbar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.pill,
    paddingHorizontal: 14, paddingVertical: 7, flexShrink: 0,
  },
  backText: { fontSize: 13, color: Colors.black },
  topTitle: { fontSize: 15, fontWeight: '500', color: Colors.black },
  topSub: { fontSize: 12, color: Colors.gray, marginTop: 1 },
  listContent: { padding: 16, paddingBottom: 60 },
  sectionLabel: {
    fontSize: 11, fontWeight: '500', letterSpacing: 0.8,
    textTransform: 'uppercase', color: Colors.muted,
    marginTop: 20, marginBottom: 10,
  },
  gridRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  catCard: {
    flex: 1, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg,
    padding: 16, gap: 8,
  },
  catIcon: { fontSize: 22 },
  catName: { fontSize: 13, fontWeight: '500', color: Colors.black, lineHeight: 18 },
});