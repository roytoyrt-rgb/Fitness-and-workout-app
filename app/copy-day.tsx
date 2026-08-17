import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography, radius } from '@/lib/theme';
import { Button } from '@/components/Button';
import { getRecentLogDates, getLogEntriesForDate, copyLogEntries } from '@/lib/queries';
import { todayKey, toDateKey, addDays, parseDateKey, WEEKDAY_LABELS, dayOfWeekMondayFirst, formatShortDate } from '@/lib/date';
import { MEAL_SLOTS } from '@/lib/types';
import type { DaySummary, LogEntry, MealSlot } from '@/lib/types';

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

function dayLabel(dateKey: string): string {
  const yesterday = toDateKey(addDays(new Date(), -1));
  if (dateKey === yesterday) return 'Yesterday';
  const diffDays = Math.round((parseDateKey(todayKey()).getTime() - parseDateKey(dateKey).getTime()) / 86400000);
  if (diffDays >= 0 && diffDays < 7) {
    return WEEKDAY_LABELS[dayOfWeekMondayFirst(parseDateKey(dateKey))];
  }
  return formatShortDate(dateKey);
}

export default function CopyDayScreen() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();

  const [days, setDays] = useState<DaySummary[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecentLogDates(db, todayKey(), 60).then((rows) => {
      setDays(rows);
      setLoading(false);
    });
  }, [db]);

  const openDay = useCallback(
    async (dateKey: string) => {
      const dayEntries = await getLogEntriesForDate(db, dateKey);
      setEntries(dayEntries);
      setChecked(new Set(dayEntries.map((e) => e.id)));
      setSelectedDate(dateKey);
    },
    [db]
  );

  function toggle(id: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copySelected() {
    const toCopy = entries.filter((e) => checked.has(e.id));
    if (toCopy.length === 0) return;
    setSaving(true);
    await copyLogEntries(db, toCopy, todayKey());
    setSaving(false);
    router.back();
  }

  if (loading) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      {!selectedDate ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Pick a day to copy its logged foods into today.
          </Text>
          {days.length === 0 && (
            <Text style={[typography.body, { color: colors.textMuted }]}>No previous logs yet.</Text>
          )}
          {days.map((day) => (
            <Pressable
              key={day.date}
              onPress={() => openDay(day.date)}
              style={[styles.dayRow, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.textPrimary }]}>{dayLabel(day.date)}</Text>
                <Text style={[typography.tiny, { color: colors.textMuted }]}>
                  {day.itemCount} item{day.itemCount === 1 ? '' : 's'} · {Math.round(day.calories)} kcal
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content}>
            <Pressable onPress={() => setSelectedDate(null)} style={styles.backRow}>
              <Ionicons name="chevron-back" size={18} color={colors.protein} />
              <Text style={{ color: colors.protein }}>All days</Text>
            </Pressable>
            <Text style={[typography.title, { color: colors.textPrimary }]}>{dayLabel(selectedDate)}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Uncheck anything you don't want to copy.
            </Text>

            {MEAL_SLOTS.map((slot) => {
              const slotEntries = entries.filter((e) => e.mealSlot === slot);
              if (slotEntries.length === 0) return null;
              return (
                <View key={slot}>
                  <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
                    {SLOT_LABELS[slot]}
                  </Text>
                  {slotEntries.map((entry) => {
                    const isChecked = checked.has(entry.id);
                    return (
                      <Pressable
                        key={entry.id}
                        onPress={() => toggle(entry.id)}
                        style={[styles.entryRow, { borderColor: colors.border }]}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            { borderColor: colors.border, backgroundColor: isChecked ? colors.protein : 'transparent' },
                          ]}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.body, { color: colors.textPrimary }]}>{entry.foodName}</Text>
                          <Text style={[typography.tiny, { color: colors.textMuted }]}>
                            {entry.grams > 0 ? `${entry.grams}g · ` : ''}
                            {Math.round(entry.calories)} kcal
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
          <View style={[styles.footer, { borderColor: colors.border, backgroundColor: colors.bg }]}>
            <Button
              title={`Copy ${checked.size} item${checked.size === 1 ? '' : 's'} to today`}
              onPress={copySelected}
              loading={saving}
              disabled={checked.size === 0}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 100 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: StyleSheet.hairlineWidth },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
