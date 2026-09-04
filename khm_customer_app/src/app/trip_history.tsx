import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { TripHistoryCard } from '../components/TripHistoryCard';
import { Header } from '../components/Header';
import { styles } from '../styles/trip_history.styles';

const MOCK_TRIPS = [
  {
    id: '1',
    date: 'Today, 2:30 PM',
    price: '$24.50',
    status: 'COMPLETED' as const,
    pickup: '124 Main Street, Downtown',
    dropoff: '789 Airport Blvd, Terminal 2',
  },
  {
    id: '2',
    date: 'Yesterday, 9:15 AM',
    price: '$18.00',
    status: 'COMPLETED' as const,
    pickup: '456 Elm St, Westside',
    dropoff: 'Tech Park, Building C',
  },
  {
    id: '3',
    date: 'Oct 24, 6:45 PM',
    price: '$32.75',
    status: 'CANCELED' as const,
    pickup: 'North Station',
    dropoff: 'City Central Mall',
  },
];

export default function TripHistory() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Header title="KHM Driver" />

      <FlatList
        data={MOCK_TRIPS}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Recent Trips</Text>
              <Text style={styles.subtitle}>Review your driving history and earnings.</Text>
            </View>
            <View style={styles.earningsContainer}>
              <Text style={styles.earningsLabel}>THIS WEEK</Text>
              <Text style={styles.earningsValue}>$482.50</Text>
            </View>
          </View>
        }
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TripHistoryCard
            date={item.date}
            price={item.price}
            status={item.status}
            pickup={item.pickup}
            dropoff={item.dropoff}
            onPress={() => console.log('Trip clicked', item.id)}
          />
        )}
      />

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Ionicons name="home-outline" size={24} color={Colors.light.icon} />
          <Text style={[styles.navText, { color: Colors.light.icon }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="time" size={24} color={Colors.light.primary} />
          <Text style={[styles.navText, { color: Colors.light.primary }]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
          <Ionicons name="person-outline" size={24} color={Colors.light.icon} />
          <Text style={[styles.navText, { color: Colors.light.icon }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}