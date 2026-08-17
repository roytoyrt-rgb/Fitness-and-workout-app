import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const WEEKLY_REMINDER_ID_KEY = 'weekly-meal-plan-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleWeeklyReminder(weekday: number, hour: number, minute: number) {
  await cancelWeeklyReminder();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('meal-plan', {
      name: 'Meal plan reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_REMINDER_ID_KEY,
    content: {
      title: 'Plan this week’s meals',
      body: 'Scan your ingredients or check your high-protein plan for the week.',
      data: { screen: 'plan' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour,
      minute,
      channelId: 'meal-plan',
    },
  });
}

export async function cancelWeeklyReminder() {
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_REMINDER_ID_KEY).catch(() => {});
}

export async function notifyMealPlanUpdated() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Meal plan updated',
      body: 'Your high-protein meal plan for this week is ready.',
      data: { screen: 'plan' },
    },
    trigger: null,
  });
}
