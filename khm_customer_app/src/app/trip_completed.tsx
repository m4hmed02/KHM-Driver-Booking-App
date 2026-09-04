import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { styles } from '../styles/trip_completed.styles';
import { Colors } from '../constants/theme';

export default function TripCompleted() {
  const router = useRouter();
  const [rating, setRating] = useState(0);

  const navigateHome = () => {
    router.push('/location_picker');
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
      <Text style={styles.subtitle}>Thank you for driving with KHM.</Text>

      {/* Fare Summary Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fare Summary</Text>
        <View style={styles.divider} />
        
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Trip Fare</Text>
          <Text style={styles.rowValue}>$24.50</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Tax</Text>
          <Text style={styles.rowValue}>$2.45</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Tip</Text>
          <Text style={styles.rowValue}>$5.00</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Earnings</Text>
          <Text style={styles.totalValue}>$31.95</Text>
        </View>
      </View>

      {/* Rating Section */}
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingTitle}>Rate your rider</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Ionicons 
                name={star <= rating ? "star" : "star-outline"} 
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