import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useTheme, spacing, typography } from '@/lib/theme';
import { getMealPlanItem, updateMealPlanItemContent, getPreferenceNames } from '@/lib/queries';
import { alternativesFor } from '@/lib/mealTemplates';
import type { MealPlanItem, MealTemplate } from '@/lib/types';

export default function MealDetailScreen() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [meal, setMeal] = useState<MealPlanItem | null>(null);
  const [alternatives, setAlternatives] = useState<MealTemplate[]>([]);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [swapping, setSwapping] = useState(false);

  const load = useCallback(async () => {
    const item = await getMealPlanItem(db, Number(id));
    setMeal(item);
    if (item) {
      const { likes, dislikes } = await getPreferenceNames(db);
      setAlternatives(alternativesFor(item.mealSlot, likes, dislikes, item.title));
    }
  }, [db, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function chooseAlternative(template: MealTemplate) {
    if (!meal) return;
    setSwapping(true);
    await updateMealPlanItemContent(db, meal.id, template, 'library');
    setShowAlternatives(false);
    setSwapping(false);
    load();
  }

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

      <Button
        title={showAlternatives ? 'Hide other options' : 'Choose a different meal'}
        variant="secondary"
        onPress={() => setShowAlternatives((v) => !v)}
      />

      {showAlternatives && (
        <Card>
          {alternatives.length === 0 ? (
            <Text style={[typography.body, { color: colors.textMuted }]}>No other options for this meal slot.</Text>
          ) : (
            alternatives.map((template) => (
              <Pressable
                key={template.title}
                onPress={() => chooseAlternative(template)}
                disabled={swapping}
                style={[styles.altRow, { borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body, { color: colors.textPrimary }]}>{template.title}</Text>
                  <Text style={[typography.tiny, { color: colors.textMuted }]}>
                    {Math.round(template.calories)} kcal · {Math.round(template.protein)}g protein
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </Card>
      )}
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
  altRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
