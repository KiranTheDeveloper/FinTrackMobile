import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { getDB } from "./src/lib/db";
import { COLORS } from "./src/lib/constants";

import { DashboardScreen } from "./src/screens/DashboardScreen";
import { ClientsScreen } from "./src/screens/ClientsScreen";
import { ClientDetailScreen } from "./src/screens/ClientDetailScreen";
import { EnquiriesScreen } from "./src/screens/EnquiriesScreen";
import { EnquiryDetailScreen } from "./src/screens/EnquiryDetailScreen";
import { RemindersScreen } from "./src/screens/RemindersScreen";
import { NewClientScreen } from "./src/screens/NewClientScreen";
import { NewEnquiryScreen } from "./src/screens/NewEnquiryScreen";
import { BackupScreen } from "./src/screens/BackupScreen";

// ─── Tab Navigator ────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: COLORS.card },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
        },
        tabBarItemStyle: { paddingVertical: 6 },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textDim,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Dashboard: focused ? "grid" : "grid-outline",
            Clients: focused ? "people" : "people-outline",
            Enquiries: focused ? "document-text" : "document-text-outline",
            Reminders: focused ? "alarm" : "alarm-outline",
            Backup: focused ? "cloud-upload" : "cloud-upload-outline",
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Clients" component={ClientsScreen} />
      <Tab.Screen name="Enquiries" component={EnquiriesScreen} />
      <Tab.Screen name="Reminders" component={RemindersScreen} />
      <Tab.Screen name="Backup" component={BackupScreen} />
    </Tab.Navigator>
  );
}

// ─── Root Stack Navigator ─────────────────────────────────────────────────────
const Stack = createNativeStackNavigator();

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    getDB()
      .then(() => setDbReady(true))
      .catch(console.error);
  }, []);

  if (!dbReady) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.bg }}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: COLORS.card },
            headerTintColor: COLORS.text,
            headerTitleStyle: { fontWeight: "700" },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: COLORS.bg },
          }}
        >
          <Stack.Screen
            name="Main"
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ClientDetail"
            component={ClientDetailScreen}
            options={{ title: "Client" }}
          />
          <Stack.Screen
            name="EnquiryDetail"
            component={EnquiryDetailScreen}
            options={{ title: "Enquiry" }}
          />
          <Stack.Screen
            name="NewClient"
            component={NewClientScreen}
            options={{ title: "New Client", presentation: "modal" }}
          />
          <Stack.Screen
            name="NewEnquiry"
            component={NewEnquiryScreen}
            options={{ title: "New Enquiry", presentation: "modal" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
