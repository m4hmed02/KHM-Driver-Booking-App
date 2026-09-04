import { StyleSheet } from 'react-native';
import { useTheme } from '../hooks/use-theme';

export const useStyles = () => {
  const theme = useTheme();

  return StyleSheet.create({
    searchCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      width: '100%',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      height: 56,
    },
    inputDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginHorizontal: 16,
    },
    iconContainer: {
      width: 24,
      alignItems: 'center',
      marginRight: 12,
    },
    inputField: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
      height: '100%',
    },
    mapButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.success, // Light green background from theme
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginLeft: 8,
    },
    mapButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.primary,
      marginLeft: 4,
    },
  });
};
