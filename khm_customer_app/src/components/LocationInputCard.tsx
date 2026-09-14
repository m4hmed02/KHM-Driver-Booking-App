import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView, ActivityIndicator, Keyboard } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useStyles } from '../styles/locationinputcard.styles';
import { useTheme } from '../hooks/use-theme';
import { useLocationSearch, PlaceSuggestion } from '../hooks/useLocationSearch';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

interface LocationInputCardProps {
  pickupLocation?: string;
  setPickupLocation?: (text: string) => void;
  setPickupCoordinate?: (coord: Coordinate) => void;
  dropoffLocation?: string;
  setDropoffLocation?: (text: string) => void;
  setDropoffCoordinate?: (coord: Coordinate) => void;
  onInputFocus?: () => void;
  onFocusChange?: (focusedInput: 'pickup' | 'dropoff' | null) => void;
}

export function LocationInputCard({
  pickupLocation,
  setPickupLocation,
  setPickupCoordinate,
  dropoffLocation,
  setDropoffLocation,
  setDropoffCoordinate,
  onInputFocus,
  onFocusChange,
}: LocationInputCardProps) {
  const styles = useStyles();
  const theme = useTheme();
  const [focusedInput, setFocusedInput] = useState<'pickup' | 'dropoff' | null>(null);

  const {
    suggestions: pickupSuggestions,
    isLoading: isPickupLoading,
    fetchPlaceDetails: fetchPickupDetails,
    clearSuggestions: clearPickupSuggestions,
  } = useLocationSearch(pickupLocation || '', focusedInput === 'pickup');

  const {
    suggestions: dropoffSuggestions,
    isLoading: isDropoffLoading,
    fetchPlaceDetails: fetchDropoffDetails,
    clearSuggestions: clearDropoffSuggestions,
  } = useLocationSearch(dropoffLocation || '', focusedInput === 'dropoff');

  const handleSelectPlace = async (
    place: PlaceSuggestion,
    type: 'pickup' | 'dropoff'
  ) => {
    Keyboard.dismiss();
    setFocusedInput(null);
    onFocusChange?.(null);

    if (type === 'pickup') {
      setPickupLocation?.(place.primaryText);
      clearPickupSuggestions();
      const details = await fetchPickupDetails(place.placeId);
      if (details) {
        setPickupLocation?.(details.formattedAddress);
        setPickupCoordinate?.({ latitude: details.latitude, longitude: details.longitude });
      }
    } else {
      setDropoffLocation?.(place.primaryText);
      clearDropoffSuggestions();
      const details = await fetchDropoffDetails(place.placeId);
      if (details) {
        setDropoffLocation?.(details.formattedAddress);
        setDropoffCoordinate?.({ latitude: details.latitude, longitude: details.longitude });
      }
    }
  };

  const renderSuggestions = (
    suggestions: PlaceSuggestion[],
    type: 'pickup' | 'dropoff',
    isLoading: boolean
  ) => {
    if (focusedInput !== type) return null;
    
    if (isLoading) {
      return (
        <View style={{ padding: 12, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      );
    }

    if (suggestions.length === 0) return null;

    return (
      <View style={{ width: '100%' }}>
        {suggestions.map((item) => (
          <TouchableOpacity
            key={item.placeId}
            style={{
              padding: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
            onPress={() => handleSelectPlace(item, type)}
          >
            <Text style={{ fontSize: 14, color: theme.text, fontWeight: '500' }}>
              {item.primaryText}
            </Text>
            {!!item.secondaryText && (
              <Text style={{ fontSize: 12, color: theme.secondaryText, marginTop: 2 }}>
                {item.secondaryText}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.searchCard}>
      {/* Pickup Location */}
      <View style={styles.inputRow}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="walk" size={20} color="#000000" />
        </View>
        <TextInput
          style={styles.inputField}
          placeholder="Pickup Location"
          placeholderTextColor={theme.secondaryText}
          value={pickupLocation}
          onChangeText={setPickupLocation}
          onFocus={() => {
            setFocusedInput('pickup');
            onInputFocus?.();
            onFocusChange?.('pickup');
          }}
        />
        {focusedInput === 'pickup' && (
          <TouchableOpacity style={styles.mapButton} activeOpacity={0.7} onPress={() => {
            Keyboard.dismiss();
            setFocusedInput(null);
            onFocusChange?.(null);
          }}>
            <Text style={styles.mapButtonText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inputDivider} />

      {/* Dropoff Location */}
      <View style={styles.inputRow}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="flag-checkered" size={20} color="#1A1A1A" />
        </View>
        <TextInput
          style={styles.inputField}
          placeholder="Dropoff Location"
          placeholderTextColor={theme.secondaryText}
          value={dropoffLocation}
          onChangeText={setDropoffLocation}
          onFocus={() => {
            setFocusedInput('dropoff');
            onInputFocus?.();
            onFocusChange?.('dropoff');
          }}
        />
        {focusedInput === 'dropoff' && (
          <TouchableOpacity style={styles.mapButton} activeOpacity={0.7} onPress={() => {
            Keyboard.dismiss();
            setFocusedInput(null);
            onFocusChange?.(null);
          }}>
            <Text style={styles.mapButtonText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Render Suggestions for active input below both inputs */}
      {renderSuggestions(pickupSuggestions, 'pickup', isPickupLoading)}
      {renderSuggestions(dropoffSuggestions, 'dropoff', isDropoffLoading)}
    </View>
  );
}
