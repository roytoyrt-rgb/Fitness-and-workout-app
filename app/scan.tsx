import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography, radius } from '@/lib/theme';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { getGoals, replaceMealPlanForWeek } from '@/lib/queries';
import { weekStartKey } from '@/lib/date';
import { notifyMealPlanUpdated } from '@/lib/notifications';
import { notify } from '@/lib/confirm';
import { apiUrl } from '@/lib/api';
import type { MealSlot } from '@/lib/types';

interface PickedImage {
  base64: string;
  mediaType: string;
  uri: string;
}

interface GeneratedMeal {
  dayOfWeek: number;
  mealSlot: MealSlot;
  title: string;
  ingredients: string[];
  steps: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

type Step = 'photos' | 'ingredients' | 'generating' | 'done';

export default function ScanScreen() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();

  const [images, setImages] = useState<PickedImage[]>([]);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [step, setStep] = useState<Step>('photos');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickImages(fromCamera: boolean) {
    setError(null);
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Permission needed', 'Please allow access in Settings to continue.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6, mediaTypes: ['images'] })
      : await ImagePicker.launchImageLibraryAsync({
          base64: true,
          quality: 0.6,
          allowsMultipleSelection: true,
          selectionLimit: 5,
          mediaTypes: ['images'],
        });

    if (result.canceled) return;

    const picked: PickedImage[] = result.assets
      .filter((a) => a.base64)
      .map((a) => ({ base64: a.base64 as string, mediaType: a.mimeType ?? 'image/jpeg', uri: a.uri }));

    setImages((prev) => [...prev, ...picked].slice(0, 5));
  }

  function removeImage(uri: string) {
    setImages((prev) => prev.filter((i) => i.uri !== uri));
  }

  async function analyzePhotos() {
    if (images.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/identify-ingredients'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ images: images.map((i) => ({ base64: i.base64, mediaType: i.mediaType })) }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? 'Something went wrong.');
      setIngredients(json.ingredients ?? []);
      setStep('ingredients');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to analyze photos.');
    } finally {
      setBusy(false);
    }
  }

  function addIngredient() {
    const trimmed = newIngredient.trim();
    if (!trimmed) return;
    setIngredients((prev) => [...prev, trimmed]);
    setNewIngredient('');
  }

  function removeIngredient(name: string) {
    setIngredients((prev) => prev.filter((i) => i !== name));
  }

  async function generatePlan() {
    if (ingredients.length === 0) return;
    setStep('generating');
    setError(null);
    try {
      const goals = await getGoals(db);
      const response = await fetch(apiUrl('/api/generate-meal-plan'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ingredients,
          goals: { calories: goals.calories, protein: goals.protein, carbs: goals.carbs, fat: goals.fat },
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? 'Something went wrong.');

      const meals = json.meals as GeneratedMeal[];
      const weekStart = weekStartKey(new Date());
      await replaceMealPlanForWeek(
        db,
        weekStart,
        meals.map((m) => ({
          dayOfWeek: m.dayOfWeek,
          mealSlot: m.mealSlot,
          title: m.title,
          ingredients: m.ingredients,
          steps: m.steps,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          source: 'ai' as const,
        }))
      );
      await notifyMealPlanUpdated();
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate meal plan.');
      setStep('ingredients');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {step === 'photos' && (
          <>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              Photograph what's in your fridge or pantry and Claude will build a simple, high-protein week of meals
              around it.
            </Text>

            <View style={styles.photoGrid}>
              {images.map((img) => (
                <View key={img.uri} style={styles.thumbWrap}>
                  <Image source={{ uri: img.uri }} style={styles.thumb} />
                  <Pressable style={styles.removeBadge} onPress={() => removeImage(img.uri)}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Button title="Take photo" variant="secondary" onPress={() => pickImages(true)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Choose photos" variant="secondary" onPress={() => pickImages(false)} />
              </View>
            </View>

            {error && <Text style={{ color: colors.critical }}>{error}</Text>}

            <Button title="Analyze photos" onPress={analyzePhotos} loading={busy} disabled={images.length === 0} />
          </>
        )}

        {step === 'ingredients' && (
          <>
            <Text style={[typography.subtitle, { color: colors.textPrimary }]}>Ingredients found</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Remove anything wrong, add anything missing.
            </Text>

            <View style={styles.chipWrap}>
              {ingredients.map((ing) => (
                <Pressable
                  key={ing}
                  onPress={() => removeIngredient(ing)}
                  style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
                  <Text style={{ color: colors.textPrimary }}>{ing}</Text>
                  <Ionicons name="close" size={14} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>

            <View style={styles.row}>
              <TextInput
                value={newIngredient}
                onChangeText={setNewIngredient}
                placeholder="Add an ingredient"
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={addIngredient}
                style={[styles.input, { flex: 1, color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.card }]}
              />
              <Pressable onPress={addIngredient} style={[styles.addBtn, { backgroundColor: colors.protein }]}>
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
            </View>

            {error && <Text style={{ color: colors.critical }}>{error}</Text>}

            <Button title="Generate this week's meal plan" onPress={generatePlan} disabled={ingredients.length === 0} />
          </>
        )}

        {step === 'generating' && (
          <Card>
            <Text style={[typography.subtitle, { color: colors.textPrimary }]}>Building your plan…</Text>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              Claude is putting together simple, high-protein meals from your ingredients.
            </Text>
          </Card>
        )}

        {step === 'done' && (
          <Card>
            <Text style={[typography.subtitle, { color: colors.textPrimary }]}>Plan updated</Text>
            <Text style={[typography.body, { color: colors.textMuted }]}>
              This week's meal plan has been refreshed. You'll also get a notification.
            </Text>
            <Button title="View meal plan" onPress={() => router.replace('/(tabs)/plan')} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbWrap: { width: 72, height: 72 },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.pill,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: spacing.md, ...typography.body },
  addBtn: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
