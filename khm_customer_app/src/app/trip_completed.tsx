import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { styles } from '../styles/trip_completed.styles';
import { Colors } from '../constants/theme';

export default function TripCompleted() {
  const router = useRouter();
  const [rating, setRating] = useState(0);

  // Params passed by home.tsx when the driver marks the trip completed
  const { bookingId, fare: fareParam } = useLocalSearchParams<{
    bookingId?: string;
    fare?: string;
  }>();

  const tripFare = fareParam ? parseFloat(fareParam) : null;
  const fareDisplay = tripFare != null && !isNaN(tripFare)
    ? `AED ${tripFare.toFixed(2)}`
    : '—';

  // Navigate back to home, carrying the bookingId so home.tsx can clear its state
  const navigateHome = () => {
    if (bookingId) {
      router.replace(`/home?tripEnded=${bookingId}`);
    } else {
      router.replace('/home');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Success Icon */}
      <View style={styles.successIconContainer}>
        <View style={styles.successIconInner}>
          <Ionicons name="checkmark" size={32} color="white" />
        </View>
      </View>

      {/* Title & Subtitle */}
      <Text style={styles.title}>Trip Completed</Text>
      <Text style={styles.subtitle}>Thank you for riding with KHM.</Text>

      {/* Fare Summary Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fare Summary</Text>
        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Agreed Fare</Text>
          <Text style={styles.rowValue}>{fareDisplay}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{fareDisplay}</Text>
        </View>
      </View>

      {/* Rating Section */}
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingTitle}>Rate your driver</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Ionicons
                name={star <= rating ? 'star' : 'star-outline'}
                size={32}
                color={star <= rating ? Colors.light.amber : Colors.light.icon}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.dashboardButton} onPress={navigateHome}>
          <Text style={styles.dashboardButtonText}>Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}