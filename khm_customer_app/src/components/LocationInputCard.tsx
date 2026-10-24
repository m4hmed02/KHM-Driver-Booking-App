import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
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

  const activeSuggestions =
    focusedInput === 'pickup' ? pickupSuggestions :
    focusedInput === 'dropoff' ? dropoffSuggestions : [];
  const isActiveLoading =
    focusedInput === 'pickup' ? isPickupLoading :
    focusedInput === 'dropoff' ? isDropoffLoading : false;

  const hasSuggestions = isActiveLoading || activeSuggestions.length > 0;

  return (
    <View style={styles.searchCard}>
      {/* ── Pickup row ── */}
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
          returnKeyType="search"
          onFocus={() => {
            setFocusedInput('pickup');
            onInputFocus?.();
            onFocusChange?.('pickup');
          }}
        />
        {focusedInput === 'pickup' && (
          <TouchableOpacity
            style={styles.mapButton}
            activeOpacity={0.7}
            onPress={() => {
              Keyboard.dismiss();
              setFocusedInput(null);
              onFocusChange?.(null);
            }}
          >
            <Text style={styles.mapButtonText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inputDivider} />

      {/* ── Dropoff row ── */}
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
          returnKeyType="search"
          onFocus={() => {
            setFocusedInput('dropoff');
            onInputFocus?.();
            onFocusChange?.('dropoff');
          }}
        />
        {focusedInput === 'dropoff' && (
          <TouchableOpacity
            style={styles.mapButton}
            activeOpacity={0.7}
            onPress={() => {
              Keyboard.dismiss();
              setFocusedInput(null);
              onFocusChange?.(null);
            }}
          >
            <Text style={styles.mapButtonText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Suggestions list ── */}
      {hasSuggestions && (
        <View
          style={{
            marginTop: 4,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            // Cap height so the list itself scrolls — never covers the whole screen
            maxHeight: 260,
          }}
        >
          {isActiveLoading ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              bounces={false}
            >
              {activeSuggestions.map((item, index) => (
                <TouchableOpacity
                  key={item.placeId}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderBottomWidth: index < activeSuggestions.length - 1 ? 1 : 0,
                    borderBottomColor: theme.border,
                    backgroundColor: theme.background,
                  }}
                  activeOpacity={0.7}
                  onPress={() => handleSelectPlace(item, focusedInput!)}
                >
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={theme.secondaryText}
                    style={{ marginTop: 1 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize: 14, color: theme.text, fontWeight: '500' }}
                      numberOfLines={1}
                    >
                      {item.primaryText}
                    </Text>
                    {!!item.secondaryText && (
                      <Text
                        style={{ fontSize: 12, color: theme.secondaryText, marginTop: 2 }}
                        numberOfLines={1}
                      >
                        {item.secondaryText}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}
