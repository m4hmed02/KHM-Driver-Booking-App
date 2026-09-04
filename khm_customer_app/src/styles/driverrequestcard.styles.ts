import { StyleSheet } from 'react-native';
import { useTheme } from '../hooks/use-theme';

export const useStyles = () => {
  const theme = useTheme();

  return StyleSheet.create({
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      marginVertical: 10,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    profileImage: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.border,
    },
    profilePlaceholder: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.success,
      alignItems: 'center',
      justifyContent: 'center',
    },
    driverInfo: {
      flex: 1,
      marginLeft: 12,
    },
    driverName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    ratingText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.secondaryText,
    },
    fareContainer: {
      alignItems: 'flex-end',
    },
    fareLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.secondaryText,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    fareValue: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.primary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginBottom: 16,
    },
    actionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    button: {
      flex: 1,
      height: 48,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    declineButton: {
      backgroundColor: theme.red + '1A', // Using opacity for red bg
      borderWidth: 1,
      borderColor: theme.red + '4D', // Red border
    },
    declineText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.red,
    },
    acceptButton: {
      backgroundColor: theme.primary,
    },
    acceptText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.background,
    },
  });
};
