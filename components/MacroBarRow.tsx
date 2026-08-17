import { StyleSheet, Text, View } from 'react-native';
import { useTheme, radius, spacing, typography } from '@/lib/theme';

interface Props {
  label: string;
  color: string;
  consumed: number;
  goal: number;
  unit?: string;
}

export function MacroBarRow({ label, color, consumed, goal, unit = 'g' }: Props) {
  const { colors } = useTheme();
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;

  return (
    <View style={styles.row}>
      <View style={styles.labelRow}>
        <View style={styles.labelLeft}>
          <View style={[styles.swatch, { backgroundColor: color }]} />
          <Text style={[typography.body, { color: colors.textPrimary }]}>{label}</Text>
        </View>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {Math.round(consumed)} / {Math.round(goal)}
          {unit}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.gridline }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 10, height: 10, borderRadius: radius.pill },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
