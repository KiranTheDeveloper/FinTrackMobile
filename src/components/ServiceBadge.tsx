import { View, Text, StyleSheet } from "react-native";
import { SERVICE_COLORS } from "../lib/constants";

export function ServiceBadge({ code }: { code: string }) {
  const colors = SERVICE_COLORS[code] ?? { bg: "#1e293b", text: "#94a3b8", border: "#334155" };
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.text }]}>{code}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
  },
});
