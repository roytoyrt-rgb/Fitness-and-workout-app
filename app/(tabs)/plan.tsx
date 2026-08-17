import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useTheme, spacing, typography, radius } from '@/lib/theme';
import { getMealPlanForWeek, replaceMealPlanForWeek } from '@/lib/queries';
import { weekStartKey, addDays, toDateKey, parseDateKey, WEEKDAY_LABELS, formatShortDate } from '@/lib/date';
import { buildLibraryWeekPlan } from '@/lib/mealTemplates';
import { MEAL_SLOTS } from '@/lib/types';
import type { MealPlanItem, MealSlot } from '@/lib/types';

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export default function PlanScreen() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  const [plan, setPlan] = useState<MealPlanItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const start = weekStartKey(new Date());
    let items = await getMealPlanForWeek(db, start);

    if (items.length === 0) {
      // First run / new week with nothing yet: seed a simple high-protein
      // plan from the built-in library so the app is useful immediately.
      const weekIndex = Math.floor(parseDateKey(start).getTime() / (1000 * 60 * 60 * 24 * 7));
      const seeded = buildLibraryWeekPlan(weekIndex);
      await replaceMealPlanForWeek(
        db,
        start,
        seeded.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          mealSlot: s.mealSlot,
          title: s.template.title,
          ingredients: s.template.ingredients,
          steps: s.template.steps,
          calories: s.template.calories,
          protein: s.template.protein,
          carbs: s.template.carbs,
          fat: s.template.fat,
          source: 'library' as const,
        }))
      );
      items = await getMealPlanForWeek(db, start);
    }

    setPlan(items);
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return null;

  const start = weekStartKey(new Date());
  const startDate = parseDateKey(start);
  const isAiPlan = plan.some((p) => p.source === 'ai');

  return (
    <Screen>
      <View>
        <Text style={[typography.title, { color: colors.textPrimary }]}>This week</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {formatShortDate(start)} – {formatShortDate(toDateKey(addDays(startDate, 6)))}
          {isAiPlan ? ' · personalized' : ' · starter plan'}
        </Text>
      </View>

      <Button title="Scan ingredients to update this week's plan" onPress={() => router.push('/scan')} />

      {WEEKDAY_LABELS.map((label, dayIndex) => {
        const dayMeals = MEAL_SLOTS.map((slot) => plan.find((p) => p.dayOfWeek === dayIndex && p.mealSlot === slot)).filter(
          (m): m is MealPlanItem => !!m
        );
        if (dayMeals.length === 0) return null;

        return (
          <Card key={label}>
            <Text style={[typography.subtitle, { color: colors.textPrimary }]}>
              {label} <Text style={{ color: colors.textMuted, fontWeight: '400' }}>{formatShortDate(toDateKey(addDays(startDate, dayIndex)))}</Text>
            </Text>
            {dayMeals.map((meal) => (
              <Pressable
                key={meal.id}
                onPress={() => router.push({ pathname: '/meal/[id]', params: { id: String(meal.id) } })}
                style={[styles.mealRow, { borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.tiny, { color: colors.textMuted }]}>{SLOT_LABELS[meal.mealSlot]}</Text>
                  <Text style={[typography.body, { color: colors.textPrimary }]}>{meal.title}</Text>
                  <Text style={[typography.tiny, { color: colors.textSecondary }]}>
                    {Math.round(meal.calories)} kcal · {Math.round(meal.protein)}g protein
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
});
