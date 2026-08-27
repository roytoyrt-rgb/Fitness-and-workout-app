import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DB_NAME, migrateDbIfNeeded } from '@/lib/db';
import '@/lib/notifications';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = response.notification.request.content.data?.screen;
      if (screen === 'plan') {
        router.push('/(tabs)/plan');
      }
    });
    return () => subscription.remove();
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName={DB_NAME} onInit={migrateDbIfNeeded}>
        <StatusBar style="auto" />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="add-food" options={{ presentation: 'modal', title: 'Add Food' }} />
          <Stack.Screen name="add-exercise" options={{ presentation: 'modal', title: 'Add Exercise' }} />
          <Stack.Screen name="scan" options={{ presentation: 'modal', title: 'Scan Ingredients' }} />
          <Stack.Screen name="barcode" options={{ presentation: 'modal', title: 'Scan Barcode' }} />
          <Stack.Screen name="copy-day" options={{ presentation: 'modal', title: 'Copy a Day' }} />
          <Stack.Screen name="preferences" options={{ presentation: 'modal', title: 'Food Preferences' }} />
          <Stack.Screen name="meal/[id]" options={{ title: 'Meal' }} />
        </Stack>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
