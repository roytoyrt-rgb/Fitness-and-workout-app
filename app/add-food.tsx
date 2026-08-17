import { useCallback, useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, spacing, typography, radius } from '@/lib/theme';
import { Button } from '@/components/Button';
import { SegmentedControl } from '@/components/SegmentedControl';
import { searchFoods, insertCustomFood, insertLogEntry } from '@/lib/queries';
import { macrosForGrams } from '@/lib/macros';
import { todayKey } from '@/lib/date';
import { MEAL_SLOTS } from '@/lib/types';
import type { Food, MealSlot } from '@/lib/types';

const SLOT_OPTIONS = MEAL_SLOTS.map((s) => ({ label: s[0].toUpperCase() + s.slice(1), value: s }));

export default function AddFoodModal() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ slot?: MealSlot }>();

  const [mode, setMode] = useState<'search' | 'custom'>('search');
  const [slot, setSlot] = useState<MealSlot>(params.slot ?? 'breakfast');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState('');
  const [saving, setSaving] = useState(false);

  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [saveToLibrary, setSaveToLibrary] = useState(true);

  const runSearch = useCallback(
    async (text: string) => {
      const foods = await searchFoods(db, text);
      setResults(foods);
    },
    [db]
  );

  useEffect(() => {
    runSearch(query);
  }, [query, runSearch]);

  function selectFood(food: Food) {
    setSelected(food);
    setGrams(String(food.defaultServingG));
  }

  const preview =
    selected && grams
      ? macrosForGrams(
          {
            caloriesPer100: selected.caloriesPer100,
            proteinPer100: selected.proteinPer100,
            carbsPer100: selected.carbsPer100,
            fatPer100: selected.fatPer100,
          },
          Number(grams) || 0
        )
      : null;

  async function saveSearchEntry() {
    if (!selected || !grams) return;
    setSaving(true);
    const macros = macrosForGrams(
      {
        caloriesPer100: selected.caloriesPer100,
        proteinPer100: selected.proteinPer100,
        carbsPer100: selected.carbsPer100,
        fatPer100: selected.fatPer100,
      },
      Number(grams)
    );
    await insertLogEntry(db, {
      date: todayKey(),
      foodId: selected.id,
      foodName: selected.name,
      grams: Number(grams),
      mealSlot: slot,
      ...macros,
    });
    setSaving(false);
    router.back();
  }

  async function saveCustomEntry() {
    if (!customName || !customCalories) return;
    setSaving(true);
    const macros = {
      calories: Number(customCalories) || 0,
      protein: Number(customProtein) || 0,
      carbs: Number(customCarbs) || 0,
      fat: Number(customFat) || 0,
    };

    let foodId: number | null = null;
    if (saveToLibrary) {
      foodId = await insertCustomFood(db, {
        name: customName,
        caloriesPer100: macros.calories,
        proteinPer100: macros.protein,
        carbsPer100: macros.carbs,
        fatPer100: macros.fat,
        defaultServingG: 100,
      });
    }

    await insertLogEntry(db, {
      date: todayKey(),
      foodId,
      foodName: customName,
      grams: 0,
      mealSlot: slot,
      ...macros,
    });
    setSaving(false);
    router.back();
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <SegmentedControl
            options={[
              { label: 'Search', value: 'search' as const },
              { label: 'Custom', value: 'custom' as const },
            ]}
            value={mode}
            onChange={setMode}
          />

          <View>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>Meal</Text>
            <SegmentedControl options={SLOT_OPTIONS} value={slot} onChange={setSlot} />
          </View>

          {mode === 'search' ? (
            <>
              <TextInput
                placeholder="Search foods..."
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={setQuery}
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.card }]}
              />
              {!selected ? (
                <FlatList
                  data={results}
                  keyExtractor={(item) => String(item.id)}
                  style={styles.list}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => selectFood(item)}
                      style={[styles.foodRow, { borderColor: colors.border }]}
                    >
                      <Text style={[typography.body, { color: colors.textPrimary }]}>{item.name}</Text>
                      <Text style={[typography.tiny, { color: colors.textMuted }]}>
                        {Math.round(item.caloriesPer100)} kcal / 100g · {Math.round(item.proteinPer100)}g protein
                      </Text>
                    </Pressable>
                  )}
                />
              ) : (
                <View style={[styles.selectedCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={styles.sectionHeader}>
                    <Text style={[typography.subtitle, { color: colors.textPrimary }]}>{selected.name}</Text>
                    <Pressable onPress={() => setSelected(null)}>
                      <Text style={{ color: colors.protein }}>Change</Text>
                    </Pressable>
                  </View>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Amount (grams)</Text>
                  <TextInput
                    value={grams}
                    onChangeText={setGrams}
                    keyboardType="numeric"
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                  />
                  {preview && (
                    <Text style={[typography.body, { color: colors.textSecondary }]}>
                      {preview.calories} kcal · {preview.protein}g protein · {preview.carbs}g carbs · {preview.fat}g fat
                    </Text>
                  )}
                  <Button title="Log this food" onPress={saveSearchEntry} loading={saving} disabled={!grams} />
                </View>
              )}
            </>
          ) : (
            <View style={{ gap: spacing.sm }}>
              <TextInput
                placeholder="Food name"
                placeholderTextColor={colors.textMuted}
                value={customName}
                onChangeText={setCustomName}
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.card }]}
              />
              <View style={styles.row}>
                <NumberField label="Calories" value={customCalories} onChangeText={setCustomCalories} colors={colors} />
                <NumberField label="Protein (g)" value={customProtein} onChangeText={setCustomProtein} colors={colors} />
              </View>
              <View style={styles.row}>
                <NumberField label="Carbs (g)" value={customCarbs} onChangeText={setCustomCarbs} colors={colors} />
                <NumberField label="Fat (g)" value={customFat} onChangeText={setCustomFat} colors={colors} />
              </View>
              <Pressable style={styles.checkboxRow} onPress={() => setSaveToLibrary((v) => !v)}>
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: colors.border, backgroundColor: saveToLibrary ? colors.protein : 'transparent' },
                  ]}
                />
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Save to my foods for next time</Text>
              </Pressable>
              <Button
                title="Log this food"
                onPress={saveCustomEntry}
                loading={saving}
                disabled={!customName || !customCalories}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function NumberField({
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
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.card }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, padding: spacing.lg, gap: spacing.md },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
  },
  list: { flex: 1 },
  foodRow: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, gap: 2 },
  selectedCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
});
