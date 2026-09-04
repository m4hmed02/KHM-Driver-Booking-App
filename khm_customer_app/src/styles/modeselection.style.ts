import { StyleSheet } from 'react-native';
import { useTheme } from '../hooks/use-theme';

export const useStyles = () => {
  const theme = useTheme();

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8F9FB', // Light background color from screenshot
    },
    contentContainer: {
      padding: 24,
      paddingBottom: 40, // standard bottom padding instead of the 100px for absolute footer
      flexGrow: 1,
    },
    mainTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: theme.text,
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 16,
      color: theme.secondaryText,
      lineHeight: 24,
      marginBottom: 32,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 3.84,
      elevation: 2,
    },
    cardSelected: {
      borderColor: theme.primary,
      borderWidth: 2,
      padding: 19, // Adjust padding to avoid layout shift due to thicker border
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#F2F4F7',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    iconContainerSelected: {
      backgroundColor: theme.success,
    },
    textContainer: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 6,
    },
    cardDescription: {
      fontSize: 14,
      color: theme.secondaryText,
      lineHeight: 20,
    },
    radioContainer: {
      marginLeft: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.border,
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 24,
      paddingBottom: 40, // Assuming some safe area padding
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    continueButton: {
      backgroundColor: theme.primary,
      marginTop: 20,
      height: 56,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    continueButtonText: {
      color: theme.background,
      fontSize: 16,
      fontWeight: '600',
    },
  });
};
