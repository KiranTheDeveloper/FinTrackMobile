import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { api, Client } from "../lib/api";
import { COLORS, formatDate } from "../lib/constants";

export function ClientsScreen() {
  const navigation = useNavigation<any>();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.clients.list(search);
      setClients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  return (
    <View style={styles.container}>
      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("NewClient")}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or mobile..."
          placeholderTextColor={COLORS.textDim}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate("NewClient")}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(c) => c.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>No clients found</Text>}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          renderItem={({ item: c }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("ClientDetail", { id: c.id })}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{c.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.row}>
                  <Text style={styles.name}>{c.name}</Text>
                  <View style={[styles.typeBadge, c.type === "EXISTING_CLIENT" ? styles.existingBg : styles.prospectBg]}>
                    <Text style={[styles.typeText, c.type === "EXISTING_CLIENT" ? styles.existingText : styles.prospectText]}>
                      {c.type === "EXISTING_CLIENT" ? "Client" : "Prospect"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.mobile}>{c.mobile}</Text>
                <Text style={styles.date}>{formatDate(c.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchRow: { flexDirection: "row", gap: 8, padding: 12 },
  searchInput: {
    flex: 1, backgroundColor: COLORS.card, color: COLORS.text,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
    flexDirection: "row", gap: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#334155",
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { color: COLORS.textMuted, fontWeight: "700", fontSize: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  name: { color: COLORS.text, fontWeight: "700", fontSize: 15 },
  mobile: { color: COLORS.textMuted, fontSize: 13, marginTop: 3 },
  date: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  existingBg: { backgroundColor: "#0d2e1a" },
  prospectBg: { backgroundColor: "#1e293b" },
  existingText: { color: "#4ade80", fontSize: 11, fontWeight: "600" },
  prospectText: { color: "#94a3b8", fontSize: 11, fontWeight: "600" },
  empty: { color: COLORS.textDim, textAlign: "center", padding: 40 },
  typeText: { fontSize: 11, fontWeight: "600" },
  fab: {
    position: "absolute", bottom: 24, right: 20, zIndex: 10,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center", alignItems: "center",
    elevation: 6,
  },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 32 },
});
