import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { api, ClientType } from "../lib/api";
import { COLORS } from "../lib/constants";

export function NewClientScreen() {
  const navigation = useNavigation<any>();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [type, setType] = useState<ClientType>("PROSPECT");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!mobile.trim() || mobile.length < 10) e.mobile = "Enter valid 10-digit mobile";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    try {
      const client = await api.clients.create({ name: name.trim(), mobile: mobile.trim(), email: email || undefined, dob: dob || undefined, type });
      navigation.replace("ClientDetail", { id: client.id });
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        <Field label="Full Name *" value={name} onChange={setName} placeholder="e.g. Rajesh Kumar" error={errors.name} />
        <Field label="Mobile Number *" value={mobile} onChange={setMobile} placeholder="e.g. 9876543210" keyboardType="phone-pad" error={errors.mobile} />
        <Field label="Email Address" value={email} onChange={setEmail} placeholder="e.g. rajesh@email.com" keyboardType="email-address" />
        <Field label="Date of Birth (YYYY-MM-DD)" value={dob} onChange={setDob} placeholder="e.g. 1985-04-22" />

        <Text style={styles.label}>Client Type</Text>
        <View style={styles.typeRow}>
          {(["PROSPECT", "EXISTING_CLIENT"] as ClientType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, type === t && styles.typeBtnActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                {t === "PROSPECT" ? "Prospect" : "Existing Client"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Client</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType, error }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: any; error?: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, error && fieldStyles.inputError]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textDim}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
      {error ? <Text style={fieldStyles.error}>{error}</Text> : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  label: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: { backgroundColor: COLORS.card, color: COLORS.text, borderRadius: 10, padding: 12, fontSize: 15, borderWidth: 1, borderColor: COLORS.border },
  inputError: { borderColor: COLORS.danger },
  error: { color: COLORS.danger, fontSize: 12, marginTop: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  form: { padding: 16 },
  label: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 6 },
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  typeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeBtnText: { color: COLORS.textMuted, fontWeight: "600" },
  typeBtnTextActive: { color: "#fff" },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 15, alignItems: "center", marginBottom: 10 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn: { padding: 15, alignItems: "center" },
  cancelBtnText: { color: COLORS.textMuted, fontSize: 15 },
});
