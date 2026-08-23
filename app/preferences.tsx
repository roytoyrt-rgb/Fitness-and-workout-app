import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, spacing, typography, radius } from '@/lib/theme';
import { searchFoods, getFoodPreferences, setFoodPreference, removeFoodPreference } from '@/lib/queries';
import type { Food, FoodPreference, PreferenceType } from '@/lib/types';

export default function PreferencesScreen() {
  const { colors } = useTheme();
  const db = useSQLiteContext();

  const [preferences, setPreferences] = useState<FoodPreference[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);

  const load = useCallback(async () => {
    const prefs = await getFoodPreferences(db);
    setPreferences(prefs);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    searchFoods(db, query).then(setResults);
  }, [db, query]);

  const preferenceFor = (name: string): PreferenceType | null =>
    preferences.find((p) => p.foodName.toLowerCase() === name.toLowerCase())?.preference ?? null;

  async function cycle(name: string) {
    const current = preferenceFor(name);
    if (current === null) {
      await setFoodPreference(db, name, 'like');
    } else if (current === 'like') {
      await setFoodPreference(db, name, 'dislike');
    } else {
      await removeFoodPreference(db, name);
    }
    load();
  }

  const likes = preferences.filter((p) => p.preference === 'like');
  const dislikes = preferences.filter((p) => p.preference === 'dislike');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Mark foods you like or dislike. The starter meal library and AI-generated plans both use this to steer
          away from what you dislike and favor what you like.
        </Text>

        {(likes.length > 0 || dislikes.length > 0) && (
          <View style={{ gap: spacing.sm }}>
            {likes.length > 0 && (
              <View>
                <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>Liked</Text>
                <View style={styles.chipWrap}>
                  {likes.map((p) => (
                    <PreferenceChip key={p.id} label={p.foodName} tone="like" onPress={() => cycle(p.foodName)} colors={colors} />
                  ))}
                </View>
              </View>
            )}
            {dislikes.length > 0 && (
              <View>
                <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs }]}>Disliked</Text>
                <View style={styles.chipWrap}>
                  {dislikes.map((p) => (
                    <PreferenceChip key={p.id} label={p.foodName} tone="dislike" onPress={() => cycle(p.foodName)} colors={colors} />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods to like or dislike..."
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.card }]}
        />

        {results.map((food) => {
          const pref = preferenceFor(food.name);
          return (
            <Pressable
              key={food.id}
              onPress={() => cycle(food.name)}
              style={[styles.row, { borderColor: colors.border }]}
            >
              <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{food.name}</Text>
              <Ionicons
                name={pref === 'like' ? 'heart' : pref === 'dislike' ? 'close-circle' : 'ellipse-outline'}
                size={20}
                color={pref === 'like' ? colors.good : pref === 'dislike' ? colors.critical : colors.textMuted}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function PreferenceChip({
  label,
  tone,
  onPress,
  colors,
}: {
  label: string;
  tone: 'like' | 'dislike';
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const color = tone === 'like' ? colors.good : colors.critical;
  return (
    <Pressable onPress={onPress} style={[styles.chip, { borderColor: color }]}>
      <Ionicons name={tone === 'like' ? 'heart' : 'close-circle'} size={14} color={color} />
      <Text style={{ color: colors.textPrimary }}>{label}</Text>
      <Ionicons name="close" size={14} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
});
