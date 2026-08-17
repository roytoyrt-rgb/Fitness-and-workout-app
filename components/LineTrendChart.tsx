import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { useTheme, spacing, typography } from '@/lib/theme';

export interface LineDatum {
  label: string;
  value: number;
}

interface Props {
  data: LineDatum[];
  goal?: number;
  color: string;
  height?: number;
  valueSuffix?: string;
  labelEvery?: number;
}

export function LineTrendChart({ data, goal, color, height = 160, valueSuffix = '', labelEvery = 5 }: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  const maxValue = Math.max(goal ?? 0, ...data.map((d) => d.value), 1);
  const chartHeight = height - 24;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const goalY = goal ? chartHeight - (goal / maxValue) * chartHeight : null;

  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = chartHeight - (d.value / maxValue) * chartHeight;
    return { x, y };
  });

  const active = selected !== null ? data[selected] : null;
  const activePoint = selected !== null ? points[selected] : null;

  return (
    <View>
      <View style={styles.tooltipSlot}>
        {active && (
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {active.label}: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{Math.round(active.value)}{valueSuffix}</Text>
          </Text>
        )}
      </View>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {goalY !== null && (
              <Line
                x1={0}
                x2={width}
                y1={goalY}
                y2={goalY}
                stroke={colors.baseline}
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            )}
            <Polyline
              points={points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {activePoint && (
              <Circle cx={activePoint.x} cy={activePoint.y} r={5} fill={color} stroke={colors.card} strokeWidth={2} />
            )}
          </Svg>
        )}
        {width > 0 && (
          <View style={[styles.touchLayer, { width, height: chartHeight }]}>
            {data.map((d, i) => (
              <Pressable
                key={d.label + i}
                style={{ width: stepX || width }}
                onPress={() => setSelected(selected === i ? null : i)}
              />
            ))}
          </View>
        )}
      </View>
      <View style={styles.labelsRow}>
        {data.map((d, i) =>
          i % labelEvery === 0 || i === data.length - 1 ? (
            <Text
              key={d.label + i}
              style={[typography.tiny, { color: colors.textMuted, position: 'absolute', left: i * stepX - 12 }]}
              numberOfLines={1}
            >
              {d.label}
            </Text>
          ) : null
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltipSlot: { height: 18, justifyContent: 'center' },
  touchLayer: { position: 'absolute', top: 0, left: 0, flexDirection: 'row' },
  labelsRow: { height: 16, marginTop: spacing.xs },
});
