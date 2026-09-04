import { StyleSheet } from 'react-native';
import { useTheme } from '../hooks/use-theme';

export const useStyles = () => {
  const theme = useTheme();

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background, // Light background behind the cards
    },
    mapSection: {
      height: 350,
      width: '100%',
    },
    contentContainer: {
      flex: 1,
      marginTop: -30, // Overlap the map
      paddingHorizontal: 20,
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
    
    // Trip Summary Header
    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    timeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F0F2F5',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      gap: 6,
    },
    timeText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.secondaryText,
    },

    // Timeline / Steps
    timelineContainer: {
      marginLeft: 4,
    },
    timelineItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    timelineIconContainer: {
      alignItems: 'center',
      width: 24,
      marginRight: 12,
    },
    timelineLine: {
      width: 2,
      height: 30,
      backgroundColor: '#E0E0E0',
      marginVertical: 4,
    },
    dotOuter: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.success, // Light green
      alignItems: 'center',
      justifyContent: 'center',
    },
    dotInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.primary,
    },
    pinIconContainer: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#F5F5F5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    timelineContent: {
      flex: 1,
      paddingBottom: 4,
    },
    timelineLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.secondaryText,
      letterSpacing: 0.5,
      marginBottom: 4,
      textTransform: 'uppercase',
    },
    timelineValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },

    // Fare Card
    fareCard: {
      backgroundColor: '#F4F6F9',
    },
    fareLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.secondaryText,
      textAlign: 'center',
      letterSpacing: 1,
      marginBottom: 12,
    },
    fareValueContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      gap: 10,
    },
    fareValue: {
      fontSize: 32,
      fontWeight: '800',
      color: theme.text,
    },
    fareNote: {
      fontSize: 13,
      color: theme.secondaryText,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 20,
    },

    // Footer
    footer: {
      padding: 20,
      paddingBottom: 20,
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderColor: theme.border,
    },
    confirmButton: {
      backgroundColor: theme.primary,
      height: 56,
      borderRadius: 12,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
    },
    confirmButtonText: {
      color: theme.background,
      fontSize: 16,
      fontWeight: '700',
    },
  });
};
