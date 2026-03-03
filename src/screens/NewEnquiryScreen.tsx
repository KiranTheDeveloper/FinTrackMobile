import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { api, Client, Service } from "../lib/api";
import { COLORS } from "../lib/constants";

export function NewEnquiryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const preselectedClientId = route.params?.clientId ?? "";

  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clientId, setClientId] = useState(preselectedClientId);
  const [serviceId, setServiceId] = useState("");
  const [productId, setProductId] = useState("");
  const [notes, setNotes] = useState("");
  const [premium, setPremium] = useState("");
  const [sumAssured, setSumAssured] = useState("");
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([api.clients.list(), api.masters()]).then(([c, s]) => {
      setClients(c);
      setServices(s);
      setLoadingData(false);
    });
  }, []);

  const selectedService = services.find((s) => s.id === serviceId);
  const isLifeOrHealth = selectedService?.code === "LIFE" || selectedService?.code === "HEALTH";
  const isMF = selectedService?.code === "MF";

  const handleSave = async () => {
    if (!clientId) { Alert.alert("Validation", "Please select a client"); return; }
    if (!serviceId) { Alert.alert("Validation", "Please select a service"); return; }

    setSaving(true);
    try {
      const enquiry = await api.enquiries.create({
        clientId,
        serviceId,
        productId: productId || undefined,
        notes: notes || undefined,
        premium: premium ? parseFloat(premium) : undefined,
        sumAssured: sumAssured ? parseFloat(sumAssured) : undefined,
        investmentAmount: investmentAmount ? parseFloat(investmentAmount) : undefined,
      });
      navigation.replace("EnquiryDetail", { id: enquiry.id });
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        {/* Client */}
        <Text style={styles.label}>Client *</Text>
        <ScrollView style={styles.picker} nestedScrollEnabled>
          {clients.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.option, clientId === c.id && styles.optionSelected]}
              onPress={() => setClientId(c.id)}
            >
              <Text style={[styles.optionText, clientId === c.id && styles.optionTextSelected]}>
                {c.name} ({c.mobile})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Service */}
        <Text style={styles.label}>Service *</Text>
        <View style={styles.row}>
          {services.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.serviceBtn, serviceId === s.id && styles.serviceBtnActive]}
              onPress={() => { setServiceId(s.id); setProductId(""); }}
            >
              <Text style={[styles.serviceBtnText, serviceId === s.id && styles.serviceBtnTextActive]}>{s.code}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Product */}
        {selectedService && selectedService.products.length > 0 && (
          <>
            <Text style={styles.label}>Product / Provider</Text>
            <View style={styles.productsRow}>
              {selectedService.products.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.productBtn, productId === p.id && styles.productBtnActive]}
                  onPress={() => setProductId(productId === p.id ? "" : p.id)}
                >
                  <Text style={[styles.productBtnText, productId === p.id && styles.productBtnTextActive]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Financial fields */}
        {isLifeOrHealth && (
          <View style={styles.financialRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Premium (₹)</Text>
              <TextInput style={styles.input} value={premium} onChangeText={setPremium} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textDim} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Sum Assured (₹)</Text>
              <TextInput style={styles.input} value={sumAssured} onChangeText={setSumAssured} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textDim} />
            </View>
          </View>
        )}
        {isMF && (
          <>
            <Text style={styles.label}>Investment Amount (₹)</Text>
            <TextInput style={styles.input} value={investmentAmount} onChangeText={setInvestmentAmount} keyboardType="numeric" placeholder="0" placeholderTextColor={COLORS.textDim} />
          </>
        )}

        {/* Notes */}
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional notes..."
          placeholderTextColor={COLORS.textDim}
          multiline
        />

        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create Enquiry</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg },
  form: { padding: 16 },
  label: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 8 },
  picker: { maxHeight: 160, backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  option: { padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  optionSelected: { backgroundColor: COLORS.primaryDark },
  optionText: { color: COLORS.textMuted, fontSize: 14 },
  optionTextSelected: { color: "#fff", fontWeight: "600" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  serviceBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  serviceBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  serviceBtnText: { color: COLORS.textMuted, fontWeight: "600" },
  serviceBtnTextActive: { color: "#fff" },
  productsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  productBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
  productBtnActive: { backgroundColor: "#1d4ed8", borderColor: "#3b82f6" },
  productBtnText: { color: COLORS.textMuted, fontSize: 13 },
  productBtnTextActive: { color: "#fff" },
  financialRow: { flexDirection: "row", gap: 10 },
  input: { backgroundColor: COLORS.card, color: COLORS.text, borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 15, alignItems: "center", marginTop: 8, marginBottom: 10 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn: { padding: 15, alignItems: "center" },
  cancelBtnText: { color: COLORS.textMuted, fontSize: 15 },
  primaryDark: { backgroundColor: "#1d4ed8" },
});
