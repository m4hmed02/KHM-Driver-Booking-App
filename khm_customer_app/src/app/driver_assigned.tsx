import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors } from '../constants/theme';
import { styles } from '../styles/driver_assigned';
import { useRoute } from '../hooks/useRoute';

export default function DriverAssigned() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  // Dynamic locations for pickup and driver
  const [pickupLocation, setPickupLocation] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
  });

  const [driverLocation, setDriverLocation] = useState({
    latitude: 37.7820,
    longitude: -122.4410,
  });

  const { fetchRoute, routeCoordinates, duration } = useRoute();

  useEffect(() => {
    fetchRoute(driverLocation, pickupLocation);
  }, [driverLocation, pickupLocation, fetchRoute]);

  useEffect(() => {
    if (mapRef.current && routeCoordinates.length > 0) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          [pickupLocation, driverLocation, ...routeCoordinates],
          {
            edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
            animated: true,
          }
        );
      }, 700);
    }
  }, [pickupLocation, driverLocation, routeCoordinates]);

  return (
    <View style={styles.container}>

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          mapPadding={{ top: 0, right: 0, bottom: 480, left: 0 }}
          initialRegion={{
            latitude: 37.785125,
            longitude: -122.4367,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          {/* Route Line */}
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={Colors.light.primary}
            strokeWidth={4}
          />

          {/* Driver Marker */}
          <Marker coordinate={driverLocation} title="Driver Location">
            <View style={styles.markerContainer}>
              <View style={styles.driverMarker}>
                <Ionicons name="car" size={20} color="white" />
              </View>
            </View>
          </Marker>

          {/* Pickup Marker */}
          <Marker coordinate={pickupLocation} title="Pickup Location">
            <View style={styles.markerContainer}>
              <View style={styles.pickupMarker}>
                <View style={styles.pickupMarkerInner} />
              </View>
            </View>
          </Marker>
        </MapView>
      </View>

      {/* Bottom Overlaid Cards */}
      <View style={styles.bottomSheet} pointerEvents="box-none">
        {/* I'm Coming Button */}
        <TouchableOpacity style={styles.okButton} onPress={() => router.replace('/trip_in_progress')}>
          <Text style={styles.okButtonText}>I'm Coming</Text>
        </TouchableOpacity>

        {/* Driver Info Card */}
        <View style={[styles.driverCard, { marginTop: 16 }]}>
          <View style={styles.driverInfoRow}>
            <View style={styles.driverAvatarContainer}>
              <Image
                source={{ uri: 'https://i.pravatar.cc/150?img=11' }}
                style={styles.driverAvatar}
              />
              <View style={styles.badge}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.light.primary} />
              </View>
            </View>

            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>John Doe</Text>
              <View style={styles.statsRow}>
                <Ionicons name="star" size={16} color={Colors.light.primary} />
                <Text style={styles.ratingText}>4.9</Text>
                <View style={styles.dot} />
                <Text style={styles.tripsText}>2.4k trips</Text>
              </View>
            </View>

            <View style={styles.etaBadge}>
              <Ionicons name="time-outline" size={14} color={Colors.light.primaryDark} />
              <Text style={styles.etaText}>{duration ? `${Math.ceil(parseInt(duration) / 60)} MINS` : '5 MINS'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.carInfoRow}>
            <View style={styles.carDetails}>
              <Text style={styles.carName}>Tesla Model 3, White</Text>
              <View style={styles.licensePlateContainer}>
                <Text style={styles.licensePlateText}>J12345</Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="call-outline" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}