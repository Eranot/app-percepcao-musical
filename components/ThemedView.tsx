import { View, type ViewProps, StyleSheet } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  noBorder?: boolean;
  noMargin?: boolean;
};

export function ThemedView({ style, lightColor, darkColor, noBorder, noMargin, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return (
    <View 
      style={[
        styles.container,
        { backgroundColor },
        !noBorder && styles.border,
        !noMargin && styles.margin,
        style
      ]} 
      {...otherProps} 
    />
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
  },
  border: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  margin: {
    margin: 8,
    padding: 12,
  }
});
