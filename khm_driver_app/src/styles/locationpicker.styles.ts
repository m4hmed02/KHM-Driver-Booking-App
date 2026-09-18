import { StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../hooks/use-theme';

const { width, height } = Dimensions.get('window');

export const useStyles = () => {
  const theme = useTheme();

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    mapContainer: {
      flex: 1,
      backgroundColor: '#E8EAED', // Placeholder for map
      position: 'relative',
    },
    bottomCard: {
      maxHeight: '40%',
      backgroundColor: theme.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      marginTop: -24,
      zIndex: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 10,
    },
    map: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    confirmButtonContainer: {
      marginTop: 20,
      width: '100%',
    },
    confirmButton: {
      backgroundColor: theme.primary,
      height: 56,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    confirmButtonDisabled: {
      backgroundColor: theme.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    confirmButtonText: {
      color: theme.background,
      fontSize: 16,
      fontWeight: '600',
    },
    confirmButtonTextDisabled: {
      color: theme.secondaryText,
    },
    // Dummy markers for UI
    pickupMarker: {
      position: 'absolute',
      top: height * 0.45,
      left: width * 0.35,
      alignItems: 'center',
    },
    dropoffMarker: {
      position: 'absolute',
      top: height * 0.35,
      left: width * 0.55,
      alignItems: 'center',
    },
    markerPin: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.primary,
    },
    markerPinBlack: {
      backgroundColor: '#1A1A1A',
    },
    markerLine: {
      width: 2,
      height: 12,
      backgroundColor: theme.primary,
      marginTop: 2,
    },
    markerLineBlack: {
      backgroundColor: '#1A1A1A',
    },
  });
};
