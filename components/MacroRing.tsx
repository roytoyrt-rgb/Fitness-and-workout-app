import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme, spacing, typography } from '@/lib/theme';

interface Props {
  consumed: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
}

export function MacroRing({ consumed, goal, size = 176, strokeWidth = 14 }: Props) {
  const { colors } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const dashOffset = circumference * (1 - pct);
  const remaining = Math.max(goal - consumed, 0);
  const over = Math.max(consumed - goal, 0);

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.gridline}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.calories}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[typography.hero, { color: colors.textPrimary }]}>{Math.round(consumed)}</Text>
        <Text style={[typography.caption, { color: colors.textMuted }]}>of {Math.round(goal)} kcal</Text>
        <Text style={[typography.tiny, { color: colors.textSecondary, marginTop: spacing.xs }]}>
          {over > 0 ? `${Math.round(over)} over` : `${Math.round(remaining)} left`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
