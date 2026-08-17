import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const WEEKLY_REMINDER_ID_KEY = 'weekly-meal-plan-reminder';

// expo-notifications' scheduled/calendar triggers (used for the weekly
// reminder) have no browser equivalent - there's no OS-level scheduler to
// hand a "every Sunday at 6pm" trigger to. A real web reminder needs a
// server to send a Web Push notification at the right time, which only
// makes sense once this is actually deployed somewhere. Until then, the
// weekly-reminder UI is disabled on web rather than silently failing.
export const supportsScheduledReminders = Platform.OS !== 'web';

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
  if (!supportsScheduledReminders) return;
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
  // Best-effort: an immediate notification is more likely to be supported
  // on web than a scheduled one, but browser notification permissions and
  // behavior vary enough that this should never block the calling flow.
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Meal plan updated',
        body: 'Your high-protein meal plan for this week is ready.',
        data: { screen: 'plan' },
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('notifyMealPlanUpdated failed', error);
  }
}
