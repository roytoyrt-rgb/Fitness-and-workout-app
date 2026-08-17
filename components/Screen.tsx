import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, RefreshControlProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';

interface Props extends PropsWithChildren {
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export function Screen({ children, scroll = true, refreshControl }: Props) {
  const { colors } = useTheme();

  if (!scroll) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.padded}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.padded}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { padding: 16, paddingBottom: 40, gap: 16 },
});
