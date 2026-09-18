import { StyleSheet } from 'react-native';
import { useTheme } from '../hooks/use-theme';

export const useStyles = () => {
  const theme = useTheme();

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8F9FA', // Light grey background
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 60, // Approximate safe area for header
      paddingBottom: 16,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      width: 40,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
    },
    headerRight: {
      width: 40,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 32,
    },
    greeting: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    subGreeting: {
      fontSize: 16,
      color: theme.secondaryText,
      marginBottom: 32,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.success, // Light green circular background
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
    },
    cardDescription: {
      fontSize: 14,
      color: theme.secondaryText,
      marginBottom: 24,
      lineHeight: 20,
    },
    bookButton: {
      backgroundColor: theme.primary,
      flexDirection: 'row',
      height: 56,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bookButtonText: {
      color: theme.background,
      fontSize: 16,
      fontWeight: '600',
      marginRight: 8,
    },
    bottomNav: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 12,
      paddingBottom: 32, // Approximate safe area for bottom
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    navItem: {
      alignItems: 'center',
    },
    navText: {
      fontSize: 12,
      fontWeight: '500',
      marginTop: 4,
    },
  });
};
