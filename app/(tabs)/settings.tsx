import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useTheme, spacing, typography, radius } from '@/lib/theme';
import { getGoals, updateGoals, getSetting, setSetting } from '@/lib/queries';
import { ensureNotificationPermission, scheduleWeeklyReminder, cancelWeeklyReminder } from '@/lib/notifications';
import { apiUrl } from '@/lib/api';
import { WEEKDAY_LABELS } from '@/lib/date';

const NOTIF_ENABLED_KEY = 'notif_enabled';
const NOTIF_WEEKDAY_KEY = 'notif_weekday'; // 0=Mon..6=Sun (UI order)
const NOTIF_HOUR_KEY = 'notif_hour';
const NOTIF_MINUTE_KEY = 'notif_minute';

// expo-notifications WeeklyTriggerInput uses 1=Sunday..7=Saturday.
function toSundayFirst(mondayFirstIndex: number): number {
  return mondayFirstIndex === 6 ? 1 : mondayFirstIndex + 2;
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const db = useSQLiteContext();

  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saving, setSaving] = useState(false);

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [weekday, setWeekday] = useState(6); // Sunday (UI index 6) by default
  const [hour, setHour] = useState('18');
  const [minute, setMinute] = useState('0');

  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    const g = await getGoals(db);
    setCalories(String(g.calories));
    setProtein(String(g.protein));
    setCarbs(String(g.carbs));
    setFat(String(g.fat));

    const enabled = await getSetting(db, NOTIF_ENABLED_KEY);
    setNotifEnabled(enabled === '1');
    const wd = await getSetting(db, NOTIF_WEEKDAY_KEY);
    if (wd) setWeekday(Number(wd));
    const h = await getSetting(db, NOTIF_HOUR_KEY);
    if (h) setHour(h);
    const m = await getSetting(db, NOTIF_MINUTE_KEY);
    if (m) setMinute(m);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    fetch(apiUrl('/api/health'))
      .then((r) => r.json())
      .then((json) => setAiConfigured(!!json.aiConfigured))
      .catch(() => setAiConfigured(false));
  }, []);

  async function saveGoals() {
    setSaving(true);
    await updateGoals(db, {
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
    });
    setSaving(false);
  }

  async function toggleNotifications(value: boolean) {
    setNotifEnabled(value);
    await setSetting(db, NOTIF_ENABLED_KEY, value ? '1' : '0');

    if (value) {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        setNotifEnabled(false);
        await setSetting(db, NOTIF_ENABLED_KEY, '0');
        return;
      }
      await scheduleWeeklyReminder(toSundayFirst(weekday), Number(hour) || 0, Number(minute) || 0);
    } else {
      await cancelWeeklyReminder();
    }
  }

  async function updateSchedule(nextWeekday: number, nextHour: string, nextMinute: string) {
    setWeekday(nextWeekday);
    setHour(nextHour);
    setMinute(nextMinute);
    await setSetting(db, NOTIF_WEEKDAY_KEY, String(nextWeekday));
    await setSetting(db, NOTIF_HOUR_KEY, nextHour);
    await setSetting(db, NOTIF_MINUTE_KEY, nextMinute);
    if (notifEnabled) {
      await scheduleWeeklyReminder(toSundayFirst(nextWeekday), Number(nextHour) || 0, Number(nextMinute) || 0);
    }
  }

  return (
    <Screen>
      <View>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Settings</Text>
      </View>

      <Card>
        <Text style={[typography.subtitle, { color: colors.textPrimary }]}>Daily goals</Text>
        <View style={styles.row}>
          <Field label="Calories" value={calories} onChangeText={setCalories} colors={colors} />
          <Field label="Protein (g)" value={protein} onChangeText={setProtein} colors={colors} />
        </View>
        <View style={styles.row}>
          <Field label="Carbs (g)" value={carbs} onChangeText={setCarbs} colors={colors} />
          <Field label="Fat (g)" value={fat} onChangeText={setFat} colors={colors} />
        </View>
        <Button title="Save goals" onPress={saveGoals} loading={saving} />
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={[typography.subtitle, { color: colors.textPrimary }]}>Weekly meal plan reminder</Text>
          <Switch value={notifEnabled} onValueChange={toggleNotifications} />
        </View>
        {notifEnabled && (
          <>
            <Text style={[typography.caption, { color: colors.textMuted }]}>Day</Text>
            <SegmentedControl
              options={WEEKDAY_LABELS.map((label, i) => ({ label, value: String(i) }))}
              value={String(weekday)}
              onChange={(v) => updateSchedule(Number(v), hour, minute)}
            />
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}>Time (24h)</Text>
            <View style={styles.row}>
              <Field label="Hour" value={hour} onChangeText={(v) => updateSchedule(weekday, v, minute)} colors={colors} />
              <Field label="Minute" value={minute} onChangeText={(v) => updateSchedule(weekday, hour, v)} colors={colors} />
            </View>
          </>
        )}
      </Card>

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={[typography.subtitle, { color: colors.textPrimary }]}>AI meal scanning</Text>
          <View style={styles.statusRow}>
            <Ionicons
              name={aiConfigured ? 'checkmark-circle' : aiConfigured === false ? 'alert-circle' : 'ellipse-outline'}
              size={16}
              color={aiConfigured ? colors.good : aiConfigured === false ? colors.warning : colors.textMuted}
            />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {aiConfigured === null ? 'Checking…' : aiConfigured ? 'Connected' : 'Not set up'}
            </Text>
          </View>
        </View>
        {aiConfigured === false && (
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Add ANTHROPIC_API_KEY to a .env file at the project root and restart the dev server. See the README for
            step-by-step instructions.
          </Text>
        )}
      </Card>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[typography.tiny, { color: colors.textMuted, marginBottom: spacing.xs }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
  },
});
