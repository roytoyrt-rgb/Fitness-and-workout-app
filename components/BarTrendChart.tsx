import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { useTheme, spacing, typography } from '@/lib/theme';

export interface BarDatum {
  label: string;
  value: number;
}

interface Props {
  data: BarDatum[];
  goal?: number;
  color: string;
  height?: number;
  valueSuffix?: string;
}

export function BarTrendChart({ data, goal, color, height = 160, valueSuffix = '' }: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  const maxValue = Math.max(goal ?? 0, ...data.map((d) => d.value), 1);
  const chartHeight = height - 24; // reserve space for x-axis labels
  const barGap = 8;
  const barWidth = width > 0 ? (width - barGap * (data.length - 1)) / data.length : 0;
  const goalY = goal ? chartHeight - (goal / maxValue) * chartHeight : null;

  const active = selected !== null ? data[selected] : null;

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
            {data.map((d, i) => {
              const x = i * (barWidth + barGap);
              const barHeight = Math.max((d.value / maxValue) * chartHeight, 2);
              const y = chartHeight - barHeight;
              const isActive = selected === i;
              return (
                <Rect
                  key={d.label + i}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={Math.min(4, barWidth / 2)}
                  fill={color}
                  opacity={selected === null || isActive ? 1 : 0.35}
                />
              );
            })}
          </Svg>
        )}
        {width > 0 && (
          <View style={[styles.touchLayer, { width, height: chartHeight }]}>
            {data.map((d, i) => (
              <Pressable
                key={d.label + i}
                style={{ width: barWidth, marginRight: i < data.length - 1 ? barGap : 0 }}
                onPress={() => setSelected(selected === i ? null : i)}
              />
            ))}
          </View>
        )}
      </View>
      <View style={styles.labelsRow}>
        {data.map((d, i) => (
          <Text
            key={d.label + i}
            style={[
              typography.tiny,
              { color: colors.textMuted, width: barWidth || undefined, textAlign: 'center' },
            ]}
            numberOfLines={1}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tooltipSlot: { height: 18, justifyContent: 'center' },
  touchLayer: { position: 'absolute', top: 0, left: 0, flexDirection: 'row' },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
});
