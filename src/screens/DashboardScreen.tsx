import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { api, DashboardStats } from "../lib/api";
import { COLORS, formatDate, isOverdue } from "../lib/constants";
import { StatusBadge } from "../components/StatusBadge";

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.dashboard();
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  const stats = data?.stats;
  const statCards = [
    { label: "Total Clients", value: stats?.totalClients ?? 0, color: "#93c5fd" },
    { label: "Active Enquiries", value: stats?.activeEnquiries ?? 0, color: "#fb923c" },
    { label: "KYC Pending", value: stats?.kycPending ?? 0, color: "#fde047" },
    { label: "Deals This Month", value: stats?.dealsThisMonth ?? 0, color: "#4ade80" },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
    >
      {/* Stats */}
      <View style={styles.statsGrid}>
        {statCards.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Overdue Reminders */}
      {(data?.overdueReminders?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Overdue Reminders</Text>
          {data!.overdueReminders.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.reminderRow, { backgroundColor: "#3b0d0d" }]}
              onPress={() => navigation.navigate("EnquiryDetail", { id: r.enquiryId })}
            >
              <Text style={styles.clientName}>{r.enquiry.client.name}</Text>
              <Text style={styles.muted}>{r.enquiry.service.name} · {r.message}</Text>
              <Text style={{ color: "#f87171", fontSize: 12, marginTop: 2 }}>Due: {formatDate(r.dueDate)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Today's Reminders */}
      {(data?.todayReminders?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Today's Reminders</Text>
          {data!.todayReminders.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.reminderRow, { backgroundColor: "#1e3a5f" }]}
              onPress={() => navigation.navigate("EnquiryDetail", { id: r.enquiryId })}
            >
              <Text style={styles.clientName}>{r.enquiry.client.name}</Text>
              <Text style={styles.muted}>{r.enquiry.service.name} · {r.message}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {(data?.recentActivity?.length ?? 0) === 0 ? (
          <Text style={styles.empty}>No recent activity</Text>
        ) : (
          data!.recentActivity.map((h) => (
            <TouchableOpacity
              key={h.id}
              style={styles.activityRow}
              onPress={() => navigation.navigate("EnquiryDetail", { id: h.enquiry.id })}
            >
              <View style={styles.dot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.clientName}>
                  {h.enquiry.client.name}
                  <Text style={styles.muted}> · {h.enquiry.service.name}</Text>
                </Text>
                <StatusBadge status={h.toStatus} />
              </View>
              <Text style={[styles.muted, { fontSize: 11 }]}>{formatDate(h.changedAt)}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 10 },
  statCard: {
    flex: 1, minWidth: "45%", backgroundColor: COLORS.card,
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  statValue: { fontSize: 28, fontWeight: "700" },
  statLabel: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  section: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: "700", marginBottom: 10 },
  reminderRow: { padding: 12, borderRadius: 10, marginBottom: 8 },
  clientName: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
  muted: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  activityRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  empty: { color: COLORS.textDim, textAlign: "center", padding: 16 },
});
