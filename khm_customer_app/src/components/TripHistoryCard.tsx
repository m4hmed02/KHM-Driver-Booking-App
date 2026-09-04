import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles/trip_history_card.styles';
import { Colors } from '../constants/theme';

export interface TripHistoryCardProps {
  date: string;
  price: string;
  status: 'COMPLETED' | 'CANCELED';
  pickup: string;
  dropoff: string;
  onPress?: () => void;
}

export const TripHistoryCard: React.FC<TripHistoryCardProps> = ({
  date,
  price,
  status,
  pickup,
  dropoff,
  onPress,
}) => {
  const isCompleted = status === 'COMPLETED';

  return (
    <TouchableOpacity 
      style={styles.cardContainer} 
      activeOpacity={0.7} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.dateText}>{date}</Text>
          <Text style={[styles.priceText, !isCompleted && { color: Colors.light.secondaryText }]}>{price}</Text>
        </View>
        <View style={[styles.statusPill, isCompleted ? styles.statusPillCompleted : styles.statusPillCanceled]}>
          <Text style={[styles.statusText, isCompleted ? styles.statusTextCompleted : styles.statusTextCanceled]}>
            {status}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.locationSection}>
        {/* Timeline dots and line */}
        <View style={styles.timelineContainer}>
          <View style={[styles.dotTop, isCompleted ? styles.dotTopCompleted : styles.dotTopCanceled]} />
          <View style={styles.timelineLine} />
          <View style={[styles.dotBottom, isCompleted ? styles.dotBottomCompleted : styles.dotBottomCanceled]} />
        </View>

        {/* Addresses */}
        <View style={styles.addressesContainer}>
          <View style={styles.addressRow}>
            <Text style={styles.addressLabel}>PICKUP</Text>
            <Text style={[styles.addressText, !isCompleted && styles.addressTextCanceled]} numberOfLines={1}>
              {pickup}
            </Text>
          </View>
          <View>
            <Text style={styles.addressLabel}>DROPOFF</Text>
            <Text style={[styles.addressText, !isCompleted && styles.addressTextCanceled]} numberOfLines={1}>
              {dropoff}
            </Text>
          </View>
        </View>

        {/* Chevron */}
        <View style={styles.chevronContainer}>
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={isCompleted ? Colors.light.text : '#D1D5DB'} 
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};
