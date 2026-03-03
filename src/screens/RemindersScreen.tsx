import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { api, Reminder, Enquiry } from "../lib/api";
import { COLORS, formatDate, isOverdue } from "../lib/constants";
import { StatusBadge } from "../components/StatusBadge";

type ReminderWithEnquiry = Reminder & { enquiry: Enquiry };

export function RemindersScreen() {
  const navigation = useNavigation<any>();
  const [reminders, setReminders] = useState<ReminderWithEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.reminders.list();
      setReminders(data as ReminderWithEnquiry[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleComplete = async (id: string) => {
    Alert.alert("Mark Complete", "Mark this reminder as done?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete", onPress: async () => {
          await api.reminders.complete(id);
          load();
        }
      },
    ]);
  };

  const active = reminders.filter((r) => !r.isCompleted);
  const done = reminders.filter((r) => r.isCompleted).slice(0, 10);

  const renderItem = ({ item: r }: { item: ReminderWithEnquiry }) => {
    const overdue = !r.isCompleted && isOverdue(r.dueDate);
    return (
      <TouchableOpacity
        style={[styles.card, overdue ? styles.overdueCard : r.isCompleted ? styles.doneCard : styles.normalCard]}
        onPress={() => navigation.navigate("EnquiryDetail", { id: r.enquiryId })}
      >
        <View style={styles.topRow}>
          <Text style={styles.clientName}>{r.enquiry.client.name}</Text>
          <StatusBadge status={r.enquiry.status} />
        </View>
        <Text style={styles.service}>{r.enquiry.service.name}</Text>
        <Text style={[styles.message]}>{r.message}</Text>
        <View style={styles.bottomRow}>
          <Text style={[styles.date, overdue && styles.overdueText]}>
            {overdue ? "⚠️ " : ""}{formatDate(r.dueDate)}{overdue ? " — Overdue" : ""}
          </Text>
          {!r.isCompleted && (
            <TouchableOpacity style={styles.completeBtn} onPress={() => handleComplete(r.id)}>
              <Text style={styles.completeBtnText}>✓ Done</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  return (
    <FlatList
      style={styles.container}
      data={[...active, ...done]}
      keyExtractor={(r) => r.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
      ListEmptyComponent={<Text style={styles.empty}>No reminders</Text>}
      ListHeaderComponent={
        active.length > 0 ? <Text style={styles.sectionHeader}>Active ({active.length})</Text> : null
      }
      renderItem={renderItem}
      contentContainerStyle={{ padding: 12, gap: 8 }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg },
  card: { borderRadius: 12, padding: 14, borderWidth: 1 },
  overdueCard: { backgroundColor: "#3b0d0d", borderColor: "#7f1d1d" },
  normalCard: { backgroundColor: COLORS.card, borderColor: COLORS.border },
  doneCard: { backgroundColor: "#1a1a2e", borderColor: COLORS.border, opacity: 0.6 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  clientName: { color: COLORS.text, fontWeight: "700", fontSize: 15, flex: 1 },
  service: { color: COLORS.textMuted, fontSize: 13, marginBottom: 4 },
  message: { color: COLORS.text, fontSize: 14 },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  date: { color: COLORS.textMuted, fontSize: 12 },
  overdueText: { color: "#f87171" },
  completeBtn: { backgroundColor: "#14532d", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  completeBtnText: { color: "#4ade80", fontWeight: "600", fontSize: 13 },
  sectionHeader: { color: COLORS.text, fontSize: 14, fontWeight: "700", marginBottom: 8 },
  empty: { color: COLORS.textDim, textAlign: "center", padding: 40 },
});
