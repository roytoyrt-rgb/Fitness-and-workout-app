import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, spacing, typography, radius } from '@/lib/theme';
import { Button } from '@/components/Button';
import { SegmentedControl } from '@/components/SegmentedControl';
import { findFoodByBarcode, insertCustomFood, insertLogEntry } from '@/lib/queries';
import { macrosForGrams, round1 } from '@/lib/macros';
import { todayKey, formatShortDate } from '@/lib/date';
import { apiUrl } from '@/lib/api';
import { MEAL_SLOTS } from '@/lib/types';
import type { Food, MealSlot } from '@/lib/types';

const SLOT_OPTIONS = MEAL_SLOTS.map((s) => ({ label: s[0].toUpperCase() + s.slice(1), value: s }));

type Stage = 'scanning' | 'looking-up' | 'result' | 'not-found';

export default function BarcodeScreen() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const targetDate = params.date ?? todayKey();
  const [permission, requestPermission] = useCameraPermissions();

  const [stage, setStage] = useState<Stage>('scanning');
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  const [food, setFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState('100');
  const [slot, setSlot] = useState<MealSlot>('snack');
  const [saving, setSaving] = useState(false);

  // Manual entry fallback when a scanned product isn't in Open Food Facts.
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');

  async function handleScan(result: BarcodeScanningResult) {
    if (locked) return;
    setLocked(true);
    setError(null);
    setScannedCode(result.data);
    setStage('looking-up');

    const cached = await findFoodByBarcode(db, result.data);
    if (cached) {
      setFood(cached);
      setGrams(String(cached.defaultServingG));
      setStage('result');
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/barcode?code=${encodeURIComponent(result.data)}`));
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? 'Lookup failed.');

      if (!json.found) {
        setStage('not-found');
        return;
      }

      const extended = {
        fiber: json.fiberPer100 ?? null,
        sugar: json.sugarPer100 ?? null,
        sodium: json.sodiumPer100 ?? null,
        saturatedFat: json.saturatedFatPer100 ?? null,
        cholesterol: json.cholesterolPer100 ?? null,
      };

      const foodId = await insertCustomFood(db, {
        name: json.name,
        caloriesPer100: json.caloriesPer100,
        proteinPer100: json.proteinPer100,
        carbsPer100: json.carbsPer100,
        fatPer100: json.fatPer100,
        defaultServingG: json.servingSizeG ?? 100,
        barcode: result.data,
        ...extended,
      });

      setFood({
        id: foodId,
        name: json.name,
        caloriesPer100: json.caloriesPer100,
        proteinPer100: json.proteinPer100,
        carbsPer100: json.carbsPer100,
        fatPer100: json.fatPer100,
        defaultServingG: json.servingSizeG ?? 100,
        isCustom: true,
        barcode: result.data,
        ...extended,
      });
      setGrams(String(json.servingSizeG ?? 100));
      setStage('result');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed.');
      setStage('not-found');
    }
  }

  function scanAgain() {
    setLocked(false);
    setFood(null);
    setScannedCode(null);
    setError(null);
    setManualName('');
    setManualCalories('');
    setManualProtein('');
    setManualCarbs('');
    setManualFat('');
    setStage('scanning');
  }

  async function logFood() {
    if (!food || !grams) return;
    setSaving(true);
    const macros = macrosForGrams(food, Number(grams));
    await insertLogEntry(db, {
      date: targetDate,
      foodId: food.id,
      foodName: food.name,
      grams: Number(grams),
      mealSlot: slot,
      ...macros,
    });
    setSaving(false);
    router.back();
  }

  async function saveManualEntry() {
    if (!manualName || !manualCalories || !scannedCode) return;
    setSaving(true);
    const caloriesPer100 = Number(manualCalories) || 0;
    const proteinPer100 = Number(manualProtein) || 0;
    const carbsPer100 = Number(manualCarbs) || 0;
    const fatPer100 = Number(manualFat) || 0;

    const foodId = await insertCustomFood(db, {
      name: manualName,
      caloriesPer100,
      proteinPer100,
      carbsPer100,
      fatPer100,
      defaultServingG: 100,
      barcode: scannedCode,
    });

    setFood({
      id: foodId,
      name: manualName,
      caloriesPer100,
      proteinPer100,
      carbsPer100,
      fatPer100,
      defaultServingG: 100,
      isCustom: true,
      barcode: scannedCode,
    });
    setGrams('100');
    setSaving(false);
    setStage('result');
  }

  const gramsNum = Number(grams) || 0;
  const preview = food && gramsNum > 0 ? macrosForGrams(food, gramsNum) : null;
  const caloriesPerGram = food ? round1(food.caloriesPer100 / 100) : 0;

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }]}>
          Camera access is needed to scan barcodes.
        </Text>
        <Button title="Grant camera access" onPress={requestPermission} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      {stage === 'scanning' || stage === 'looking-up' ? (
        <View style={styles.flex}>
          <CameraView
            style={styles.flex}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
            onBarcodeScanned={locked ? undefined : handleScan}
          />
          <View style={[styles.overlay, { backgroundColor: colors.card }]}>
            <Text style={[typography.body, { color: colors.textPrimary, textAlign: 'center' }]}>
              {stage === 'looking-up' ? 'Looking up product…' : 'Point the camera at a barcode'}
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {stage === 'result' && food && (
            <>
              <Text style={[typography.title, { color: colors.textPrimary }]}>{food.name}</Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {Math.round(food.caloriesPer100)} kcal / 100g · {caloriesPerGram} kcal per gram
              </Text>
              {targetDate !== todayKey() && (
                <Text style={[typography.caption, { color: colors.protein }]}>Logging to {formatShortDate(targetDate)}</Text>
              )}

              <View>
                <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>
                  Amount (grams)
                </Text>
                <TextInput
                  value={grams}
                  onChangeText={setGrams}
                  keyboardType="numeric"
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.card }]}
                />
              </View>

              {preview && (
                <View style={[styles.previewCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Text style={[typography.subtitle, { color: colors.textPrimary }]}>
                    {preview.calories} kcal for {gramsNum}g
                  </Text>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>
                    {preview.protein}g protein · {preview.carbs}g carbs · {preview.fat}g fat
                  </Text>
                  <Text style={[typography.tiny, { color: colors.textMuted, marginTop: spacing.xs }]}>
                    {caloriesPerGram} kcal/g regardless of amount
                  </Text>
                </View>
              )}

              <View>
                <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>Meal</Text>
                <SegmentedControl options={SLOT_OPTIONS} value={slot} onChange={setSlot} />
              </View>

              <Button title="Log this food" onPress={logFood} loading={saving} disabled={!grams} />
              <Button title="Scan another" variant="ghost" onPress={scanAgain} />
            </>
          )}

          {stage === 'not-found' && (
            <>
              <Text style={[typography.subtitle, { color: colors.textPrimary }]}>
                {error ? 'Something went wrong' : "Couldn't find that product"}
              </Text>
              <Text style={[typography.body, { color: colors.textMuted }]}>
                {error ?? "It's not in the product database. Enter its nutrition label manually and it'll be remembered for next time."}
              </Text>

              <TextInput
                placeholder="Product name"
                placeholderTextColor={colors.textMuted}
                value={manualName}
                onChangeText={setManualName}
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.card }]}
              />
              <Text style={[typography.tiny, { color: colors.textMuted }]}>Per 100g, from the nutrition label</Text>
              <View style={styles.row}>
                <NumberField label="Calories" value={manualCalories} onChangeText={setManualCalories} colors={colors} />
                <NumberField label="Protein (g)" value={manualProtein} onChangeText={setManualProtein} colors={colors} />
              </View>
              <View style={styles.row}>
                <NumberField label="Carbs (g)" value={manualCarbs} onChangeText={setManualCarbs} colors={colors} />
                <NumberField label="Fat (g)" value={manualFat} onChangeText={setManualFat} colors={colors} />
              </View>

              <Button
                title="Save & continue"
                onPress={saveManualEntry}
                loading={saving}
                disabled={!manualName || !manualCalories}
              />
              <Button title="Scan another" variant="ghost" onPress={scanAgain} />
            </>
          )}
        </ScrollView>
      )}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  overlay: { padding: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.md },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
  },
  previewCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
});
