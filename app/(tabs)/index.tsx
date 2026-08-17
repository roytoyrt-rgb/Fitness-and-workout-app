import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { MacroRing } from '@/components/MacroRing';
import { MacroBarRow } from '@/components/MacroBarRow';
import { useTheme, spacing, typography, radius } from '@/lib/theme';
import { getGoals, getLogEntriesForDate, getMealPlanForWeek, deleteLogEntry, insertLogEntry } from '@/lib/queries';
import { sumMacros } from '@/lib/macros';
import { todayKey, weekStartKey, dayOfWeekMondayFirst, WEEKDAY_LABELS } from '@/lib/date';
import { MEAL_SLOTS } from '@/lib/types';
import type { Goals, LogEntry, MealPlanItem, MealSlot } from '@/lib/types';

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export default function TodayScreen() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();

  const [goals, setGoals] = useState<Goals | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [todayPlan, setTodayPlan] = useState<MealPlanItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const today = new Date();
    const [g, e, plan] = await Promise.all([
      getGoals(db),
      getLogEntriesForDate(db, todayKey()),
      getMealPlanForWeek(db, weekStartKey(today)),
    ]);
    setGoals(g);
    setEntries(e);
    setTodayPlan(plan.filter((p) => p.dayOfWeek === dayOfWeekMondayFirst(today)));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleDelete(entry: LogEntry) {
    Alert.alert('Remove entry', `Remove "${entry.foodName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteLogEntry(db, entry.id);
          load();
        },
      },
    ]);
  }

  async function handleQuickLog(meal: MealPlanItem) {
    await insertLogEntry(db, {
      date: todayKey(),
      foodId: null,
      foodName: meal.title,
      grams: 0,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      mealSlot: meal.mealSlot,
    });
    load();
  }

  if (!goals) return null;

  const totals = sumMacros(entries);
  const todayLabel = WEEKDAY_LABELS[dayOfWeekMondayFirst(new Date())];

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}>
      <View>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Today</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>{todayLabel}</Text>
      </View>

      <View style={styles.quickActions}>
        <Pressable
          onPress={() => router.push('/barcode')}
          style={[styles.quickAction, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Ionicons name="barcode-outline" size={18} color={colors.protein} />
          <Text style={[typography.caption, { color: colors.textPrimary }]}>Scan barcode</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/copy-day')}
          style={[styles.quickAction, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Ionicons name="copy-outline" size={18} color={colors.protein} />
          <Text style={[typography.caption, { color: colors.textPrimary }]}>Copy a day</Text>
        </Pressable>
      </View>

      <Card style={styles.ringCard}>
        <MacroRing consumed={totals.calories} goal={goals.calories} />
        <View style={{ width: '100%', gap: spacing.md }}>
          <MacroBarRow label="Protein" color={colors.protein} consumed={totals.protein} goal={goals.protein} />
          <MacroBarRow label="Carbs" color={colors.carbs} consumed={totals.carbs} goal={goals.carbs} />
          <MacroBarRow label="Fat" color={colors.fat} consumed={totals.fat} goal={goals.fat} />
        </View>
      </Card>

      {MEAL_SLOTS.map((slot) => {
        const slotEntries = entries.filter((e) => e.mealSlot === slot);
        const plannedMeal = todayPlan.find((p) => p.mealSlot === slot);
        const alreadyLoggedPlanned =
          plannedMeal && slotEntries.some((e) => e.foodName === plannedMeal.title);

        return (
          <Card key={slot}>
            <View style={styles.sectionHeader}>
              <Text style={[typography.subtitle, { color: colors.textPrimary }]}>{SLOT_LABELS[slot]}</Text>
              <Pressable onPress={() => router.push({ pathname: '/add-food', params: { slot } })}>
                <Ionicons name="add-circle-outline" size={24} color={colors.protein} />
              </Pressable>
            </View>

            {slotEntries.length === 0 && (
              <Text style={[typography.body, { color: colors.textMuted }]}>Nothing logged yet.</Text>
            )}

            {slotEntries.map((entry) => (
              <Pressable key={entry.id} onLongPress={() => handleDelete(entry)} style={styles.entryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.textPrimary }]}>{entry.foodName}</Text>
                  <Text style={[typography.tiny, { color: colors.textMuted }]}>
                    {entry.grams > 0 ? `${entry.grams}g · ` : ''}
                    {Math.round(entry.calories)} kcal · {Math.round(entry.protein)}p / {Math.round(entry.carbs)}c / {Math.round(entry.fat)}f
                  </Text>
                </View>
                <Pressable onPress={() => handleDelete(entry)} hitSlop={8}>
                  <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
                </Pressable>
              </Pressable>
            ))}

            {plannedMeal && !alreadyLoggedPlanned && (
              <Pressable
                onPress={() => handleQuickLog(plannedMeal)}
                style={[styles.suggestion, { borderColor: colors.border, backgroundColor: colors.surface }]}
              >
                <Ionicons name="sparkles-outline" size={16} color={colors.protein} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.caption, { color: colors.textPrimary }]}>{plannedMeal.title}</Text>
                  <Text style={[typography.tiny, { color: colors.textMuted }]}>
                    Planned · {Math.round(plannedMeal.calories)} kcal · {Math.round(plannedMeal.protein)}g protein · tap to log
                  </Text>
                </View>
              </Pressable>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  ringCard: { alignItems: 'center', gap: spacing.lg },
  quickActions: { flexDirection: 'row', gap: spacing.sm },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
