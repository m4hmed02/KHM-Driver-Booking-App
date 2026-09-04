import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { styles } from '../styles/trip_in_progress.styles';

export default function TripInProgress() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#006600" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip in Progress</Text>
        <TouchableOpacity 
          style={styles.headerRight} 
          onPress={() => router.push('/trip_completed')}
        >
          <Text style={{ color: '#006600', fontWeight: 'bold' }}>Test</Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      <MapView 
        style={styles.map}
        initialRegion={{
          latitude: 51.5072,
          longitude: -0.1276,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      />

      {/* Floating Status Card */}
      <View style={styles.cardContainer}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Current Status</Text>
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>ACTIVE</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          {/* Assigned */}
          <View style={styles.statusItem}>
            <View style={styles.iconCompleted}>
              <Ionicons name="checkmark" size={16} color="white" />
            </View>
            <Text style={styles.statusText}>Assigned</Text>
          </View>

          {/* Arriving */}
          <View style={styles.statusItem}>
            <View style={styles.iconCompleted}>
              <Ionicons name="checkmark" size={16} color="white" />
            </View>
            <Text style={styles.statusText}>Arriving</Text>
          </View>

          {/* Started */}
          <View style={styles.statusItem}>
            <View style={styles.iconCurrent}>
              <View style={styles.iconCurrentInner} />
            </View>
            <Text style={styles.statusTextCurrent}>Started</Text>
          </View>

          {/* Completed */}
          <View style={styles.statusItem}>
            <View style={styles.iconPending}>
              <View style={styles.iconPendingInner} />
            </View>
            <Text style={styles.statusText}>Completed</Text>
          </View>
        </View>
      </View>
    </View>
  );
}