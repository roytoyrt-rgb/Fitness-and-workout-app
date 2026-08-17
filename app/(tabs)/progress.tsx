import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { SegmentedControl } from '@/components/SegmentedControl';
import { BarTrendChart } from '@/components/BarTrendChart';
import { LineTrendChart } from '@/components/LineTrendChart';
import { MacroBarRow } from '@/components/MacroBarRow';
import { useTheme, spacing, typography } from '@/lib/theme';
import { getGoals } from '@/lib/queries';
import { getWeekSeries, getMonthSeries, getYearSeries, averageMacros } from '@/lib/aggregate';
import type { Goals } from '@/lib/types';
import type { DayPoint, MonthPoint } from '@/lib/aggregate';

type Range = 'week' | 'month' | 'year';

export default function ProgressScreen() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const [range, setRange] = useState<Range>('week');
  const [goals, setGoals] = useState<Goals | null>(null);
  const [weekData, setWeekData] = useState<DayPoint[]>([]);
  const [monthData, setMonthData] = useState<DayPoint[]>([]);
  const [yearData, setYearData] = useState<MonthPoint[]>([]);

  const load = useCallback(async () => {
    const g = await getGoals(db);
    setGoals(g);
    const [week, month, year] = await Promise.all([getWeekSeries(db), getMonthSeries(db), getYearSeries(db)]);
    setWeekData(week);
    setMonthData(month);
    setYearData(year);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!goals) return null;

  const points = range === 'week' ? weekData : range === 'month' ? monthData : yearData;
  const avg = averageMacros(points);
  const periodLabel = range === 'week' ? 'daily average, last 7 days' : range === 'month' ? 'daily average, last 30 days' : 'daily average, last 12 months';

  return (
    <Screen>
      <View>
        <Text style={[typography.title, { color: colors.textPrimary }]}>Progress</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>Track calories and macros over time</Text>
      </View>

      <SegmentedControl
        options={[
          { label: '7 Days', value: 'week' as const },
          { label: 'Month', value: 'month' as const },
          { label: 'Year', value: 'year' as const },
        ]}
        value={range}
        onChange={setRange}
      />

      <Card>
        <Text style={[typography.subtitle, { color: colors.textPrimary }]}>Calories</Text>
        <Text style={[typography.tiny, { color: colors.textMuted }]}>Dashed line marks your {Math.round(goals.calories)} kcal goal</Text>
        {range === 'month' ? (
          <LineTrendChart
            data={monthData.map((d) => ({ label: d.label, value: d.macros.calories }))}
            goal={goals.calories}
            color={colors.calories}
          />
        ) : range === 'week' ? (
          <BarTrendChart
            data={weekData.map((d) => ({ label: d.label, value: d.macros.calories }))}
            goal={goals.calories}
            color={colors.calories}
          />
        ) : (
          <BarTrendChart
            data={yearData.map((d) => ({ label: d.label, value: d.macros.calories }))}
            goal={goals.calories}
            color={colors.calories}
          />
        )}
      </Card>

      <Card>
        <Text style={[typography.subtitle, { color: colors.textPrimary }]}>Macros</Text>
        <Text style={[typography.tiny, { color: colors.textMuted }]}>{periodLabel}</Text>
        <View style={{ gap: spacing.md, marginTop: spacing.xs }}>
          <MacroBarRow label="Protein" color={colors.protein} consumed={avg.protein} goal={goals.protein} />
          <MacroBarRow label="Carbs" color={colors.carbs} consumed={avg.carbs} goal={goals.carbs} />
          <MacroBarRow label="Fat" color={colors.fat} consumed={avg.fat} goal={goals.fat} />
        </View>
      </Card>
    </Screen>
  );
}
