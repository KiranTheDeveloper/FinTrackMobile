import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { api, Enquiry } from "../lib/api";
import { COLORS, formatDate } from "../lib/constants";
import { StatusBadge } from "../components/StatusBadge";
import { ServiceBadge } from "../components/ServiceBadge";

const SERVICE_TABS = [
  { code: "", label: "All" },
  { code: "LIFE", label: "Life" },
  { code: "HEALTH", label: "Health" },
  { code: "MF", label: "MF" },
  { code: "ITR", label: "ITR" },
];

export function EnquiriesScreen() {
  const navigation = useNavigation<any>();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [serviceFilter, setServiceFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.enquiries.list(serviceFilter);
      setEnquiries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [serviceFilter]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  return (
    <View style={styles.container}>
      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("NewEnquiry", {})}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* Service tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabContent}>
        {SERVICE_TABS.map((t) => (
          <TouchableOpacity
            key={t.code}
            style={[styles.tab, serviceFilter === t.code && styles.tabActive]}
            onPress={() => setServiceFilter(t.code)}
          >
            <Text style={[styles.tabText, serviceFilter === t.code && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* New button */}
      <View style={styles.headerRow}>
        <Text style={styles.count}>{enquiries.length} enquiries</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate("NewEnquiry", {})}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={enquiries}
          keyExtractor={(e) => e.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={<Text style={styles.empty}>No enquiries found</Text>}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          renderItem={({ item: enq }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("EnquiryDetail", { id: enq.id })}>
              <View style={styles.topRow}>
                <ServiceBadge code={enq.service.code} />
                <StatusBadge status={enq.status} />
              </View>
              <Text style={styles.clientName}>{enq.client.name}</Text>
              <Text style={styles.service}>{enq.service.name}{enq.product ? ` · ${enq.product.name}` : ""}</Text>
              <View style={styles.bottomRow}>
                <Text style={styles.mobile}>{enq.client.mobile}</Text>
                {enq.reminders[0] && (
                  <Text style={styles.reminder}>🔔 {formatDate(enq.reminders[0].dueDate)}</Text>
                )}
                <Text style={styles.date}>{formatDate(enq.updatedAt)}</Text>
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
  tabBar: { borderBottomWidth: 1, borderBottomColor: COLORS.border, maxHeight: 48 },
  tabContent: { paddingHorizontal: 12, gap: 4, alignItems: "center" },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { color: COLORS.textDim, fontSize: 14, fontWeight: "500" },
  tabTextActive: { color: COLORS.primary },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  count: { color: COLORS.textMuted, fontSize: 13 },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  topRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  clientName: { color: COLORS.text, fontWeight: "700", fontSize: 15 },
  service: { color: COLORS.textMuted, fontSize: 13, marginTop: 3 },
  bottomRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  mobile: { color: COLORS.textDim, fontSize: 12 },
  reminder: { color: "#f59e0b", fontSize: 12 },
  date: { color: COLORS.textDim, fontSize: 12, marginLeft: "auto" },
  empty: { color: COLORS.textDim, textAlign: "center", padding: 40 },
  fab: {
    position: "absolute", bottom: 24, right: 20, zIndex: 10,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center", alignItems: "center",
    elevation: 6,
  },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 32 },
});
