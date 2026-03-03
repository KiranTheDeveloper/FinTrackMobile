import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { api, Client, Enquiry } from "../lib/api";
import { COLORS, formatDate } from "../lib/constants";
import { StatusBadge } from "../components/StatusBadge";
import { ServiceBadge } from "../components/ServiceBadge";

type ClientDetail = Client & { enquiries: Enquiry[] };

export function ClientDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.clients.get(route.params.id);
      setClient(data as ClientDetail);
    } finally {
      setLoading(false);
    }
  }, [route.params.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!client) return <View style={styles.center}><Text style={{ color: COLORS.text }}>Not found</Text></View>;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.primary} />}
    >
      {/* Client info card */}
      <View style={styles.card}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{client.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{client.name}</Text>
        <Text style={styles.mobile}>{client.mobile}</Text>
        {client.email ? <Text style={styles.muted}>{client.email}</Text> : null}
        {client.dob ? <Text style={styles.muted}>DOB: {client.dob}</Text> : null}
        <View style={[styles.typeBadge, client.type === "EXISTING_CLIENT" ? styles.existingBg : styles.prospectBg]}>
          <Text style={[client.type === "EXISTING_CLIENT" ? styles.existingText : styles.prospectText]}>
            {client.type === "EXISTING_CLIENT" ? "Existing Client" : "Prospect"}
          </Text>
        </View>
      </View>

      {/* New Enquiry button */}
      <TouchableOpacity
        style={styles.newEnquiryBtn}
        onPress={() => navigation.navigate("NewEnquiry", { clientId: client.id })}
      >
        <Text style={styles.newEnquiryText}>+ New Enquiry for this Client</Text>
      </TouchableOpacity>

      {/* Enquiries */}
      <Text style={styles.sectionTitle}>Enquiries ({client.enquiries.length})</Text>
      {client.enquiries.length === 0 ? (
        <Text style={styles.empty}>No enquiries yet</Text>
      ) : (
        client.enquiries.map((enq) => (
          <TouchableOpacity
            key={enq.id}
            style={styles.enquiryCard}
            onPress={() => navigation.navigate("EnquiryDetail", { id: enq.id })}
          >
            <View style={styles.row}>
              <ServiceBadge code={enq.service.code} />
              <StatusBadge status={enq.status} />
            </View>
            <Text style={styles.serviceName}>{enq.service.name}{enq.product ? ` · ${enq.product.name}` : ""}</Text>
            <Text style={styles.muted}>{formatDate(enq.updatedAt)}</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg },
  card: { margin: 16, backgroundColor: COLORS.card, borderRadius: 16, padding: 20, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  avatarLarge: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#334155", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarText: { fontSize: 26, fontWeight: "700", color: COLORS.textMuted },
  name: { color: COLORS.text, fontSize: 20, fontWeight: "700" },
  mobile: { color: COLORS.textMuted, fontSize: 15, marginTop: 4 },
  muted: { color: COLORS.textDim, fontSize: 13, marginTop: 3 },
  typeBadge: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  existingBg: { backgroundColor: "#0d2e1a" },
  prospectBg: { backgroundColor: "#1e293b" },
  existingText: { color: "#4ade80", fontWeight: "600" },
  prospectText: { color: "#94a3b8", fontWeight: "600" },
  newEnquiryBtn: { marginHorizontal: 16, marginBottom: 12, backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: "center" },
  newEnquiryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: "700", marginHorizontal: 16, marginBottom: 8 },
  enquiryCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  row: { flexDirection: "row", gap: 8, marginBottom: 8 },
  serviceName: { color: COLORS.textMuted, fontSize: 13 },
  empty: { color: COLORS.textDim, textAlign: "center", padding: 24 },
});
