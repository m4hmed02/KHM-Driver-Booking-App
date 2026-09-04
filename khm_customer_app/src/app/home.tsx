import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useStyles } from '../styles/home.styles';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';
import { useRouter } from 'expo-router';
import { Header } from '../components/Header';

export default function HomeScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.container}>

      {/* Main Content */}
      <ScrollView style={styles.content}>
        <Text style={styles.greeting}>Good evening, Alex</Text>
        <Text style={styles.subGreeting}>Where are you heading?</Text>

        {/* Book a Driver Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="car" size={24} color={theme.primary} />
            </View>
            <Text style={styles.cardTitle}>Book a Driver</Text>
          </View>
          <Text style={styles.cardDescription}>
            Request a professional driver for your vehicle
          </Text>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => router.push('/location_picker')}
          >
            <Text style={styles.bookButtonText}>Book Now</Text>
            <Ionicons name="arrow-forward" size={20} color={theme.background} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color={theme.primary} />
          <Text style={[styles.navText, { color: theme.primary }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/trip_history')}
        >
          <Ionicons name="time-outline" size={24} color={theme.icon} />
          <Text style={[styles.navText, { color: theme.icon }]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/profile')}
        >
          <Ionicons name="person-outline" size={24} color={theme.icon} />
          <Text style={[styles.navText, { color: theme.icon }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}