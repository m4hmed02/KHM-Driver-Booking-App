import { StyleSheet } from 'react-native';
import { useTheme } from '../hooks/use-theme';

export const useStyles = () => {
  const theme = useTheme();

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      alignItems: 'center',
      paddingTop: 40,
      paddingHorizontal: 20,
      minHeight: 400,
    },
    radarContainer: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: theme.success, // Lightest green
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 30,
    },
    radarMiddle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.primary + '40', // Mid green using opacity
      alignItems: 'center',
      justifyContent: 'center',
    },
    radarInner: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.primary, // Primary green
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 15,
      color: theme.secondaryText,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 40,
    },
    cancelButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    cancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.red, // Red color for cancel
    },
  });
};
