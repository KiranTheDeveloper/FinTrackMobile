import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from "react-native";
import { COLORS } from "../lib/constants";
import { exportClientsCSV, exportEnquiriesCSV, importClientsCSV, importEnquiriesCSV } from "../lib/csv";

type Action = "exportClients" | "exportEnquiries" | "importClients" | "importEnquiries" | null;

export function BackupScreen() {
  const [running, setRunning] = useState<Action>(null);

  const run = async (action: Action, fn: () => Promise<{ imported: number; skipped: number } | void>) => {
    setRunning(action);
    try {
      const result = await fn();
      if (result && typeof result === "object") {
        Alert.alert("Done", `Imported: ${result.imported}\nSkipped (duplicates/errors): ${result.skipped}`);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Something went wrong");
    } finally {
      setRunning(null);
    }
  };

  const busy = running !== null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Export</Text>
      <Text style={styles.sectionDesc}>Save data as CSV and share via WhatsApp, email, or Files app.</Text>

      <ActionCard
        label="Export Clients"
        sub="Saves all clients to clients.csv"
        icon="⬆️"
        loading={running === "exportClients"}
        disabled={busy}
        onPress={() => run("exportClients", exportClientsCSV)}
      />
      <ActionCard
        label="Export Enquiries"
        sub="Saves all enquiries to enquiries.csv"
        icon="⬆️"
        loading={running === "exportEnquiries"}
        disabled={busy}
        onPress={() => run("exportEnquiries", exportEnquiriesCSV)}
      />

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>Import</Text>
      <Text style={styles.sectionDesc}>
        Restore from a previously exported CSV file. Duplicate mobile numbers are skipped automatically.
      </Text>

      <ActionCard
        label="Import Clients"
        sub="Pick a clients.csv file to import"
        icon="⬇️"
        loading={running === "importClients"}
        disabled={busy}
        onPress={() => run("importClients", importClientsCSV)}
      />
      <ActionCard
        label="Import Enquiries"
        sub="Pick an enquiries.csv file to import"
        icon="⬇️"
        loading={running === "importEnquiries"}
        disabled={busy}
        onPress={() => run("importEnquiries", importEnquiriesCSV)}
      />

      <View style={styles.note}>
        <Text style={styles.noteText}>
          💡 Tip: Export regularly to keep a backup. Enquiry import requires matching clients to already exist in the app.
        </Text>
      </View>
    </ScrollView>
  );
}

function ActionCard({ label, sub, icon, loading, disabled, onPress }: {
  label: string; sub: string; icon: string;
  loading: boolean; disabled: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, disabled && !loading && styles.cardDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <View>
          <Text style={styles.cardLabel}>{label}</Text>
          <Text style={styles.cardSub}>{sub}</Text>
        </View>
      </View>
      {loading && <ActivityIndicator color={COLORS.primary} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  sectionDesc: { color: COLORS.textMuted, fontSize: 13, marginBottom: 14, lineHeight: 19 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 24 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10,
  },
  cardDisabled: { opacity: 0.4 },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  cardIcon: { fontSize: 24 },
  cardLabel: { color: COLORS.text, fontWeight: "600", fontSize: 15 },
  cardSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  note: {
    backgroundColor: "#1e293b", borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginTop: 8,
  },
  noteText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19 },
});
