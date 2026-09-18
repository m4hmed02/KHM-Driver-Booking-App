import { StyleSheet } from 'react-native';
import { useTheme } from '../hooks/use-theme';

export const useStyles = () => {
  const theme = useTheme();

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8F9FB',
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },

    // Page Title
    pageTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 6,
      marginTop: 8,
    },
    pageSubtitle: {
      fontSize: 15,
      color: theme.secondaryText,
      lineHeight: 22,
      marginBottom: 24,
    },

    // Cards
    card: {
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },

    // Card Header
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardHeaderText: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
      marginLeft: 10,
    },

    // Row layout
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    flex1: {
      flex: 1,
    },

    // Labels
    label: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.secondaryText,
      marginBottom: 6,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    badge: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
      letterSpacing: 0.5,
    },
    badgeOptional: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.secondaryText,
      letterSpacing: 0.5,
    },

    // Text Inputs
    input: {
      height: 52,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      fontSize: 15,
      color: theme.text,
      backgroundColor: theme.card,
    },
    pickerButton: {
      height: 52,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      backgroundColor: theme.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pickerButtonText: {
      fontSize: 15,
      color: theme.text,
    },
    pickerButtonPlaceholder: {
      fontSize: 15,
      color: theme.secondaryText,
    },
    inputDisabled: {
      backgroundColor: '#F5F5F5',
      color: theme.secondaryText,
    },
    inputWithIcon: {
      height: 52,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      fontSize: 15,
      color: theme.text,
      backgroundColor: '#F5F5F5',
      flexDirection: 'row',
      alignItems: 'center',
    },
    inputWithIconText: {
      fontSize: 15,
      color: theme.text,
      marginLeft: 10,
      flex: 1,
      fontWeight: '500',
    },
    notesInput: {
      height: 100,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingTop: 14,
      fontSize: 15,
      color: theme.text,
      backgroundColor: theme.card,
      textAlignVertical: 'top',
    },

    // Next Step Button
    footer: {
      padding: 20,
      paddingBottom: 20,
      backgroundColor: '#F8F9FB',
    },
    nextButton: {
      backgroundColor: theme.primary,
      height: 56,
      borderRadius: 12,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    nextButtonText: {
      color: theme.background,
      fontSize: 16,
      fontWeight: '700',
    },
  });
};
