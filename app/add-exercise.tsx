import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, spacing, typography, radius } from '@/lib/theme';
import { Button } from '@/components/Button';
import { insertExerciseEntry } from '@/lib/queries';
import { EXERCISE_LIBRARY, estimateCalories } from '@/lib/exercise';
import { todayKey, formatShortDate } from '@/lib/date';

export default function AddExerciseModal() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const targetDate = params.date ?? todayKey();

  const [selected, setSelected] = useState<(typeof EXERCISE_LIBRARY)[number] | null>(null);
  const [minutes, setMinutes] = useState('30');
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [saving, setSaving] = useState(false);

  const estimated = selected && minutes ? estimateCalories(selected.caloriesPerMinute, Number(minutes) || 0) : null;

  async function logFromLibrary() {
    if (!selected || !minutes) return;
    setSaving(true);
    await insertExerciseEntry(db, {
      date: targetDate,
      name: selected.name,
      calories: estimateCalories(selected.caloriesPerMinute, Number(minutes)),
      minutes: Number(minutes),
    });
    setSaving(false);
    router.back();
  }

  async function logCustom() {
    if (!customName || !customCalories) return;
    setSaving(true);
    await insertExerciseEntry(db, {
      date: targetDate,
      name: customName,
      calories: Number(customCalories) || 0,
      minutes: null,
    });
    setSaving(false);
    router.back();
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <View style={styles.content}>
        {targetDate !== todayKey() && (
          <Text style={[typography.caption, { color: colors.protein }]}>Logging to {formatShortDate(targetDate)}</Text>
        )}

        {!selected ? (
          <>
            <Text style={[typography.subtitle, { color: colors.textPrimary }]}>What did you do?</Text>
            {EXERCISE_LIBRARY.map((ex) => (
              <Pressable
                key={ex.name}
                onPress={() => setSelected(ex)}
                style={[styles.row, { borderColor: colors.border }]}
              >
                <Text style={[typography.body, { color: colors.textPrimary }]}>{ex.name}</Text>
                <Text style={[typography.tiny, { color: colors.textMuted }]}>~{ex.caloriesPerMinute} kcal/min</Text>
              </Pressable>
            ))}

            <Text style={[typography.subtitle, { color: colors.textPrimary, marginTop: spacing.md }]}>
              Or log calories directly
            </Text>
            <TextInput
              placeholder="Activity name"
              placeholderTextColor={colors.textMuted}
              value={customName}
              onChangeText={setCustomName}
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.card }]}
            />
            <TextInput
              placeholder="Calories burned"
              placeholderTextColor={colors.textMuted}
              value={customCalories}
              onChangeText={setCustomCalories}
              keyboardType="numeric"
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.card }]}
            />
            <Button
              title="Log exercise"
              onPress={logCustom}
              loading={saving}
              disabled={!customName || !customCalories}
            />
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[typography.subtitle, { color: colors.textPrimary }]}>{selected.name}</Text>
              <Pressable onPress={() => setSelected(null)}>
                <Text style={{ color: colors.protein }}>Change</Text>
              </Pressable>
            </View>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>Minutes</Text>
            <TextInput
              value={minutes}
              onChangeText={setMinutes}
              keyboardType="numeric"
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.card }]}
            />
            {estimated != null && (
              <Text style={[typography.body, { color: colors.textSecondary }]}>~{estimated} kcal burned</Text>
            )}
            <Button title="Log exercise" onPress={logFromLibrary} loading={saving} disabled={!minutes} />
          </>
        )}
      </View>
    </SafeAreaView>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
