import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { TripHistoryCard } from '../components/TripHistoryCard';
import { Header } from '../components/Header';
import { styles } from '../styles/trip_history.styles';
import { getMyBookingsApi } from '../services/apis/booking/bookingService';
import { Booking } from '../services/apis/booking/type';

function formatTripDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) {
      return `Today, ${timeStr}`;
    }
    if (isYesterday) {
      return `Yesterday, ${timeStr}`;
    }

    const monthStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${monthStr}, ${timeStr}`;
  } catch {
    return dateString;
  }
}

export default function TripHistory() {
  const [trips, setTrips] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrips = useCallback(async () => {
    try {
      const data = await getMyBookingsApi();
      if (Array.isArray(data)) {
        // Show real driver ride history: completed and cancelled bookings
        const historyTrips = data.filter(
          (b) => b.status === 'completed' || b.status === 'cancelled'
        );
        setTrips(historyTrips);
      }
    } catch (error) {
      console.warn('[DriverTripHistory] Failed to fetch trips:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTrips();
  }, [fetchTrips]);

  const totalEarnings = trips
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + (t.estimatedFare || 0), 0);

  return (
    <View style={styles.container}>
      <Header title="Ride History" />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading your trip history…</Text>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.light.primary]}
              tintColor={Colors.light.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerSection}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.title}>Recent Trips</Text>
                <Text style={styles.subtitle}>Review your driving history and earnings.</Text>
              </View>
              <View style={styles.earningsContainer}>
                <Text style={styles.earningsLabel}>TOTAL EARNINGS</Text>
                <Text style={styles.earningsValue}>AED {totalEarnings.toFixed(2)}</Text>
              </View>
            </View>
          }
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const isCompleted = item.status === 'completed';
            const priceDisplay = `AED ${(item.estimatedFare || 0).toFixed(2)}`;
            const pickupAddr = item.pickupLocation?.address || 'Pickup location';
            const dropoffAddr = item.dropoffLocation?.address || 'Dropoff location';
            const dateDisplay = formatTripDate(item.createdAt);

            return (
              <TripHistoryCard
                date={dateDisplay}
                price={priceDisplay}
                status={isCompleted ? 'COMPLETED' : 'CANCELED'}
                pickup={pickupAddr}
                dropoff={dropoffAddr}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="car-outline"
                size={48}
                color={Colors.light.secondaryText}
                style={{ opacity: 0.4 }}
              />
              <Text style={styles.emptyTitle}>No ride history yet</Text>
              <Text style={styles.emptySubtitle}>
                Your completed trips will appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}