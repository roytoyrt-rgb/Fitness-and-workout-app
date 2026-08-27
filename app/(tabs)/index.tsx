import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { MacroBarRow } from '@/components/MacroBarRow';
import { useTheme, spacing, typography, radius } from '@/lib/theme';
import {
  getGoals,
  getLogEntriesForDate,
  getExerciseEntriesForDate,
  getMealPlanForWeek,
  deleteLogEntry,
  deleteExerciseEntry,
  insertLogEntry,
} from '@/lib/queries';
import { confirmAction } from '@/lib/confirm';
import { sumMacros, sumExtendedNutrients } from '@/lib/macros';
import { todayKey, weekStartKey, dayOfWeekMondayFirst, addDays, parseDateKey, toDateKey, formatShortDate, WEEKDAY_LABELS } from '@/lib/date';
import { MEAL_SLOTS } from '@/lib/types';
import type { Goals, LogEntry, ExerciseEntry, MealPlanItem, MealSlot } from '@/lib/types';

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

  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [goals, setGoals] = useState<Goals | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>([]);
  const [dayPlan, setDayPlan] = useState<MealPlanItem[]>([]);
  const [weekPlanIsPersonalized, setWeekPlanIsPersonalized] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const isToday = selectedDate === todayKey();

  const load = useCallback(async () => {
    const dateObj = parseDateKey(selectedDate);
    const [g, e, ex, plan] = await Promise.all([
      getGoals(db),
      getLogEntriesForDate(db, selectedDate),
      getExerciseEntriesForDate(db, selectedDate),
      getMealPlanForWeek(db, weekStartKey(dateObj)),
    ]);
    setGoals(g);
    setEntries(e);
    setExerciseEntries(ex);
    setDayPlan(plan.filter((p) => p.dayOfWeek === dayOfWeekMondayFirst(dateObj)));
    setWeekPlanIsPersonalized(plan.some((p) => p.source === 'ai'));
  }, [db, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function goToPreviousDay() {
    setSelectedDate((d) => toDateKey(addDays(parseDateKey(d), -1)));
  }

  function goToNextDay() {
    setSelectedDate((d) => {
      const next = toDateKey(addDays(parseDateKey(d), 1));
      return next > todayKey() ? d : next;
    });
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function handleDelete(entry: LogEntry) {
    confirmAction(
      'Remove entry',
      `Remove "${entry.foodName}"?`,
      'Remove',
      async () => {
        await deleteLogEntry(db, entry.id);
        load();
      },
      true
    );
  }

  function handleDeleteExercise(entry: ExerciseEntry) {
    confirmAction(
      'Remove exercise',
      `Remove "${entry.name}"?`,
      'Remove',
      async () => {
        await deleteExerciseEntry(db, entry.id);
        load();
      },
      true
    );
  }

  async function handleQuickLog(meal: MealPlanItem) {
    await insertLogEntry(db, {
      date: selectedDate,
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
  const extended = sumExtendedNutrients(entries);
  const hasExtendedData = entries.some(
    (e) => e.fiber != null || e.sugar != null || e.sodium != null || e.saturatedFat != null || e.cholesterol != null
  );
  const exerciseCalories = exerciseEntries.reduce((sum, e) => sum + e.calories, 0);
  const remaining = Math.round(goals.calories - totals.calories + exerciseCalories);

  const dateObj = parseDateKey(selectedDate);
  const yesterday = toDateKey(addDays(new Date(), -1));
  const dayLabel = isToday ? 'Today' : selectedDate === yesterday ? 'Yesterday' : WEEKDAY_LABELS[dayOfWeekMondayFirst(dateObj)];

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}>
      <View style={styles.dateNav}>
        <Pressable onPress={goToPreviousDay} hitSlop={8} style={styles.dateNavButton}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.dateNavCenter}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>{dayLabel}</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>{formatShortDate(selectedDate)}</Text>
        </View>
        <Pressable onPress={goToNextDay} hitSlop={8} disabled={isToday} style={styles.dateNavButton}>
          <Ionicons name="chevron-forward" size={22} color={isToday ? colors.border : colors.textPrimary} />
        </Pressable>
      </View>
      {!isToday && (
        <Pressable onPress={() => setSelectedDate(todayKey())} style={styles.jumpToday}>
          <Text style={[typography.caption, { color: colors.protein }]}>Jump to today</Text>
        </Pressable>
      )}

      <View style={styles.quickActions}>
        <Pressable
          onPress={() => router.push({ pathname: '/barcode', params: { date: selectedDate } })}
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

      {isToday && !weekPlanIsPersonalized && !bannerDismissed && (
        <Pressable
          onPress={() => router.push('/scan')}
          style={[styles.banner, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Ionicons name="restaurant-outline" size={18} color={colors.protein} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: colors.textPrimary }]}>Update this week's meal plan</Text>
            <Text style={[typography.tiny, { color: colors.textMuted }]}>
              You're on the starter plan — scan your ingredients for one built around what you have.
            </Text>
          </View>
          <Pressable onPress={() => setBannerDismissed(true)} hitSlop={8}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </Pressable>
      )}

      <Card style={styles.remainingCard}>
        <Text
          style={[
            typography.hero,
            { color: remaining < 0 ? colors.critical : colors.textPrimary, textAlign: 'center' },
          ]}
        >
          {remaining}
        </Text>
        <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>Calories Remaining</Text>

        <View style={styles.remainingBreakdown}>
          <RemainingStat label="Goal" value={Math.round(goals.calories)} colors={colors} />
          <Text style={[typography.subtitle, { color: colors.textMuted }]}>−</Text>
          <RemainingStat label="Food" value={Math.round(totals.calories)} colors={colors} />
          <Text style={[typography.subtitle, { color: colors.textMuted }]}>+</Text>
          <RemainingStat label="Exercise" value={Math.round(exerciseCalories)} colors={colors} />
        </View>

        <View style={{ width: '100%', gap: spacing.md, marginTop: spacing.md }}>
          <MacroBarRow label="Protein" color={colors.protein} consumed={totals.protein} goal={goals.protein} />
          <MacroBarRow label="Carbs" color={colors.carbs} consumed={totals.carbs} goal={goals.carbs} />
          <MacroBarRow label="Fat" color={colors.fat} consumed={totals.fat} goal={goals.fat} />
        </View>
      </Card>

      {hasExtendedData && (
        <Card>
          <Text style={[typography.subtitle, { color: colors.textPrimary }]}>Nutrition</Text>
          <NutrientRow label="Fiber" value={extended.fiber} unit="g" colors={colors} />
          <NutrientRow label="Sugar" value={extended.sugar} unit="g" colors={colors} />
          <NutrientRow label="Saturated Fat" value={extended.saturatedFat} unit="g" colors={colors} />
          <NutrientRow label="Sodium" value={extended.sodium} unit="mg" colors={colors} />
          <NutrientRow label="Cholesterol" value={extended.cholesterol} unit="mg" colors={colors} />
        </Card>
      )}

      {MEAL_SLOTS.map((slot) => {
        const slotEntries = entries.filter((e) => e.mealSlot === slot);
        const plannedMeal = dayPlan.find((p) => p.mealSlot === slot);
        const alreadyLoggedPlanned =
          plannedMeal && slotEntries.some((e) => e.foodName === plannedMeal.title);

        return (
          <Card key={slot}>
            <View style={styles.sectionHeader}>
              <Text style={[typography.subtitle, { color: colors.textPrimary }]}>{SLOT_LABELS[slot]}</Text>
              <Pressable onPress={() => router.push({ pathname: '/add-food', params: { slot, date: selectedDate } })}>
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

      <Card>
        <View style={styles.sectionHeader}>
          <Text style={[typography.subtitle, { color: colors.textPrimary }]}>Exercise</Text>
          <Pressable onPress={() => router.push({ pathname: '/add-exercise', params: { date: selectedDate } })}>
            <Ionicons name="add-circle-outline" size={24} color={colors.protein} />
          </Pressable>
        </View>

        {exerciseEntries.length === 0 && (
          <Text style={[typography.body, { color: colors.textMuted }]}>Nothing logged yet.</Text>
        )}

        {exerciseEntries.map((entry) => (
          <Pressable key={entry.id} onLongPress={() => handleDeleteExercise(entry)} style={styles.entryRow}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.textPrimary }]}>{entry.name}</Text>
              <Text style={[typography.tiny, { color: colors.textMuted }]}>
                {entry.minutes ? `${entry.minutes} min · ` : ''}
                {Math.round(entry.calories)} kcal burned
              </Text>
            </View>
            <Pressable onPress={() => handleDeleteExercise(entry)} hitSlop={8}>
              <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
            </Pressable>
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}

function RemainingStat({ label, value, colors }: { label: string; value: number; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={styles.remainingStat}>
      <Text style={[typography.body, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[typography.tiny, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function NutrientRow({
  label,
  value,
  unit,
  colors,
}: {
  label: string;
  value: number;
  unit: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[styles.nutrientRow, { borderTopColor: colors.border }]}>
      <Text style={[typography.body, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[typography.body, { color: colors.textPrimary }]}>
        {Math.round(value * 10) / 10}
        {unit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateNavButton: { padding: spacing.xs },
  dateNavCenter: { alignItems: 'center' },
  jumpToday: { alignSelf: 'center' },
  remainingCard: { alignItems: 'center', gap: spacing.xs },
  remainingBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  remainingStat: { alignItems: 'center', minWidth: 56 },
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
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
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
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
