import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput, RefreshControl } from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { api, Enquiry, StatusHistory, EnquiryStatus } from "../lib/api";
import { COLORS, STATUS_LABELS, ALL_STATUSES, formatDate } from "../lib/constants";
import { StatusBadge } from "../components/StatusBadge";
import { ServiceBadge } from "../components/ServiceBadge";

type EnquiryDetail = Enquiry & { statusHistory: StatusHistory[] };

export function EnquiryDetailScreen() {
  const route = useRoute<any>();
  const [enquiry, setEnquiry] = useState<EnquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<EnquiryStatus | "">("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.enquiries.get(route.params.id);
      setEnquiry(data as EnquiryDetail);
    } finally {
      setLoading(false);
    }
  }, [route.params.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleUpdateStatus = async () => {
    if (!newStatus) return;
    setSaving(true);
    try {
      await api.enquiries.updateStatus(route.params.id, { status: newStatus as EnquiryStatus, notes });
      setShowStatusModal(false);
      setNotes("");
      setNewStatus("");
      load();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!enquiry) return <View style={styles.center}><Text style={{ color: COLORS.text }}>Not found</Text></View>;

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}
      >
        {/* Header card */}
        <View style={styles.headerCard}>
          <View style={styles.row}>
            <ServiceBadge code={enquiry.service.code} />
            <StatusBadge status={enquiry.status} />
          </View>
          <Text style={styles.clientName}>{enquiry.client.name}</Text>
          <Text style={styles.muted}>{enquiry.client.mobile}</Text>
          <Text style={styles.service}>{enquiry.service.name}{enquiry.product ? ` · ${enquiry.product.name}` : ""}</Text>
          {enquiry.notes ? <Text style={styles.notes}>{enquiry.notes}</Text> : null}

          {/* Financial details */}
          {(enquiry.premium || enquiry.sumAssured || enquiry.investmentAmount) && (
            <View style={styles.financials}>
              {enquiry.premium ? <Text style={styles.fin}>Premium: ₹{enquiry.premium.toLocaleString()}</Text> : null}
              {enquiry.sumAssured ? <Text style={styles.fin}>Sum Assured: ₹{enquiry.sumAssured.toLocaleString()}</Text> : null}
              {enquiry.investmentAmount ? <Text style={styles.fin}>Investment: ₹{enquiry.investmentAmount.toLocaleString()}</Text> : null}
            </View>
          )}

          <TouchableOpacity style={styles.updateBtn} onPress={() => setShowStatusModal(true)}>
            <Text style={styles.updateBtnText}>Update Status</Text>
          </TouchableOpacity>
        </View>

        {/* Reminders */}
        {enquiry.reminders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminders</Text>
            {enquiry.reminders.map((r) => (
              <View key={r.id} style={[styles.reminderRow, r.isCompleted && styles.reminderDone]}>
                <Text style={styles.reminderMsg}>{r.message}</Text>
                <Text style={[styles.muted, { fontSize: 12 }]}>{formatDate(r.dueDate)}{r.isCompleted ? " ✓" : ""}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Status Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Timeline</Text>
          {enquiry.statusHistory.map((h, i) => (
            <View key={h.id} style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              {i < enquiry.statusHistory.length - 1 && <View style={styles.timelineLine} />}
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <StatusBadge status={h.toStatus} />
                {h.notes ? <Text style={styles.muted}>{h.notes}</Text> : null}
                <Text style={[styles.muted, { fontSize: 11 }]}>{formatDate(h.changedAt)}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Status Update Modal */}
      <Modal visible={showStatusModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update Status</Text>
            <ScrollView style={{ maxHeight: 250 }}>
              {ALL_STATUSES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusOption, newStatus === s && styles.statusSelected]}
                  onPress={() => setNewStatus(s as EnquiryStatus)}
                >
                  <StatusBadge status={s} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={styles.notesInput}
              placeholder="Notes (optional)"
              placeholderTextColor={COLORS.textDim}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowStatusModal(false)}>
                <Text style={{ color: COLORS.textMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, !newStatus && styles.saveBtnDisabled]} onPress={handleUpdateStatus} disabled={!newStatus || saving}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>{saving ? "Saving..." : "Update"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg },
  headerCard: { margin: 16, backgroundColor: COLORS.card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: "row", gap: 8, marginBottom: 12 },
  clientName: { color: COLORS.text, fontSize: 20, fontWeight: "700" },
  muted: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  service: { color: COLORS.textMuted, fontSize: 14, marginTop: 6 },
  notes: { color: COLORS.textDim, fontSize: 13, marginTop: 8, fontStyle: "italic" },
  financials: { marginTop: 12, backgroundColor: "#0f172a", borderRadius: 8, padding: 10, gap: 4 },
  fin: { color: COLORS.textMuted, fontSize: 13 },
  updateBtn: { marginTop: 16, backgroundColor: COLORS.primary, borderRadius: 10, padding: 12, alignItems: "center" },
  updateBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  section: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: "700", marginBottom: 10 },
  reminderRow: { backgroundColor: COLORS.card, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  reminderDone: { opacity: 0.5 },
  reminderMsg: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
  timelineRow: { flexDirection: "row", marginBottom: 16, position: "relative" },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary, marginTop: 4, flexShrink: 0 },
  timelineLine: { position: "absolute", left: 5, top: 16, width: 2, height: "100%", backgroundColor: COLORS.border },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700", marginBottom: 16 },
  statusOption: { paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8 },
  statusSelected: { backgroundColor: "#1e293b" },
  notesInput: { backgroundColor: "#0f172a", color: COLORS.text, borderRadius: 10, padding: 12, marginTop: 12, minHeight: 60, borderWidth: 1, borderColor: COLORS.border },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: "center" },
  saveBtnDisabled: { opacity: 0.5 },
});
