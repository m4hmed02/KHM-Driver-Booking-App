import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants/theme';
import { styles } from '../styles/trip_completed.styles';
import { getBookingStatusApi } from '../services/apis/booking/bookingService';
import { Booking, CustomerInfo } from '../services/apis/booking/type';

export default function TripCompleted() {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);

  const { bookingId, fare: fareParam } = useLocalSearchParams<{
    bookingId?: string;
    fare?: string;
  }>();

  useEffect(() => {
    if (!bookingId) return;
    let isMounted = true;
    setLoading(true);
    getBookingStatusApi(bookingId)
      .then((data) => {
        if (isMounted) setBooking(data);
      })
      .catch((err) => {
        console.warn('[TripCompleted] Failed to fetch booking details:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  const rawFare = booking?.estimatedFare != null
    ? booking.estimatedFare
    : (fareParam ? parseFloat(fareParam) : null);

  const fareDisplay = rawFare != null && !isNaN(rawFare)
    ? `AED ${rawFare.toFixed(2)}`
    : 'AED 0.00';

  const customer = booking?.customer && typeof booking.customer === 'object'
    ? (booking.customer as CustomerInfo)
    : null;

  const navigateHome = () => {
    router.replace('/home');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Success Icon */}
        <View style={styles.successIconContainer}>
          <View style={styles.successIconInner}>
            <Ionicons name="checkmark" size={28} color="white" />
          </View>
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.title}>Trip Completed</Text>
        <Text style={styles.subtitle}>Thank you for driving with KHM.</Text>

        {/* Fare Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fare Summary</Text>

          {/* Rider Info Row (if available) */}
          {customer && (
            <>
              <View style={styles.riderRow}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={20} color={Colors.light.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.riderName}>{customer.name}</Text>
                  <Text style={styles.riderRole}>Rider</Text>
                </View>
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Route Locations (if available) */}
          {booking && (
            <>
              <View style={styles.locationContainer}>
                <View style={styles.locationRow}>
                  <View style={[styles.locationDot, { backgroundColor: Colors.light.primary }]} />
                  <Text style={styles.locationText} numberOfLines={2}>
                    {booking.pickupLocation.address}
                  </Text>
                </View>
                <View style={styles.locationRow}>
                  <View style={[styles.locationDot, { backgroundColor: Colors.light.red ?? '#EF4444' }]} />
                  <Text style={styles.locationText} numberOfLines={2}>
                    {booking.dropoffLocation.address}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Fare Rows */}
          {loading && !rawFare ? (
            <ActivityIndicator size="small" color={Colors.light.primary} style={{ marginVertical: 12 }} />
          ) : (
            <>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Agreed Fare</Text>
                <Text style={styles.rowValue}>{fareDisplay}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Earnings</Text>
                <Text style={styles.totalValue}>{fareDisplay}</Text>
              </View>
            </>
          )}
        </View>

        {/* Rating Section */}
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingTitle}>Rate your rider</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={32}
                  color={star <= rating ? Colors.light.amber : Colors.light.icon}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.dashboardButton}
            onPress={navigateHome}
            activeOpacity={0.85}
          >
            <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}