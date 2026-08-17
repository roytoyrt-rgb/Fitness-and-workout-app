import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { useTheme, spacing, typography } from '@/lib/theme';
import { getMealPlanItem } from '@/lib/queries';
import type { MealPlanItem } from '@/lib/types';

export default function MealDetailScreen() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [meal, setMeal] = useState<MealPlanItem | null>(null);

  useEffect(() => {
    getMealPlanItem(db, Number(id)).then(setMeal);
  }, [db, id]);

  if (!meal) return null;

  return (
    <Screen>
      <View>
        <Text style={[typography.title, { color: colors.textPrimary }]}>{meal.title}</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {meal.source === 'ai' ? 'Personalized from your ingredients' : 'From the simple meal library'}
        </Text>
      </View>

      <Card style={styles.macroRow}>
        <Macro label="Calories" value={`${Math.round(meal.calories)}`} colors={colors} />
        <Macro label="Protein" value={`${Math.round(meal.protein)}g`} colors={colors} />
        <Macro label="Carbs" value={`${Math.round(meal.carbs)}g`} colors={colors} />
        <Macro label="Fat" value={`${Math.round(meal.fat)}g`} colors={colors} />
      </Card>

      <Card>
        <Text style={[typography.subtitle, { color: colors.textPrimary }]}>Ingredients</Text>
        {meal.ingredients.map((ing, i) => (
          <Text key={i} style={[typography.body, { color: colors.textSecondary }]}>
            • {ing}
          </Text>
        ))}
      </Card>

      <Card>
        <Text style={[typography.subtitle, { color: colors.textPrimary }]}>Steps</Text>
        {meal.steps.map((step, i) => (
          <Text key={i} style={[typography.body, { color: colors.textSecondary }]}>
            {i + 1}. {step}
          </Text>
        ))}
      </Card>
    </Screen>
  );
}

function Macro({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={styles.macroItem}>
      <Text style={[typography.title, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[typography.tiny, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroItem: { alignItems: 'center', flex: 1 },
});
