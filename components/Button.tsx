import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/lib/theme';
import { radius, spacing, typography } from '@/lib/theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading }: Props) {
  const { colors } = useTheme();

  const bg =
    variant === 'primary' ? colors.protein : variant === 'secondary' ? colors.surface : 'transparent';
  const textColor = variant === 'primary' ? '#ffffff' : colors.textPrimary;
  const borderColor = variant === 'ghost' ? 'transparent' : colors.border;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.subtitle,
  },
});
