/**
 * Active Ride Screen — Phase 4
 *
 * Handles the driver-side ride lifecycle after a customer accepts the offer:
 *
 *   accepted  → Show route to pickup  + "I Have Arrived" button
 *   arriving  → Show "Start Ride" button
 *   started   → Show route to dropoff + "Complete Ride" button
 *   completed → Navigate to /trip_completed
 *
 * Receives `bookingId` as a route param pushed from home.tsx.
 */
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';

import { Colors } from '../constants/theme';
import { Coordinate, useRoute } from '../hooks/useRoute';
import {
    getBookingStatusApi,
    updateBookingStatusApi,
} from '../services/apis/booking/bookingService';
import { Booking } from '../services/apis/booking/type';

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    map: { flex: 1 },
    actionCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.light.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.10,
        shadowRadius: 12,
        elevation: 16,
    },
    statusLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.light.secondaryText,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    statusTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.light.text,
        marginBottom: 4,
    },
    addressText: {
        fontSize: 13,
        color: Colors.light.secondaryText,
        marginBottom: 16,
        lineHeight: 18,
    },
    actionButton: {
        height: 54,
        borderRadius: 12,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonDisabled: { opacity: 0.5 },
    actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    loadingOverlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: Colors.light.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: { fontSize: 14, color: Colors.light.secondaryText },
});

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_REGION: Region = {
    latitude: 25.1972,
    longitude: 55.2744,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ActiveRide() {
    const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
    const router = useRouter();

    const [booking, setBooking] = useState<Booking | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [driverCoord, setDriverCoord] = useState<Coordinate | null>(null);

    const mapRef = useRef<MapView>(null);
    const { fetchRoute, routeCoordinates } = useRoute();

    // ── Load booking ──────────────────────────────────────────────────────────

    const loadBooking = useCallback(async () => {
        if (!bookingId) return;
        try {
            const data = await getBookingStatusApi(bookingId);
            setBooking(data);
        } catch (err) {
            Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Could not load ride details.',
            );
        } finally {
            setIsLoading(false);
        }
    }, [bookingId]);

    useEffect(() => { loadBooking(); }, [loadBooking]);

    // ── Driver GPS ────────────────────────────────────────────────────────────

    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                setDriverCoord({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });
            } catch {
                // Silently fall back — map still shows booking locations
            }
        })();
    }, []);

    // ── Route: driver → pickup (accepted/arriving) or → dropoff (started) ────

    useEffect(() => {
        if (!booking || !driverCoord) return;
        const destination: Coordinate =
            booking.status === 'started'
                ? { latitude: booking.dropoffLocation.latitude, longitude: booking.dropoffLocation.longitude }
                : { latitude: booking.pickupLocation.latitude, longitude: booking.pickupLocation.longitude };
        fetchRoute(driverCoord, destination);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [booking?.status, driverCoord]);

    // ── Fit map to route ──────────────────────────────────────────────────────

    useEffect(() => {
        if (routeCoordinates.length < 2 || !mapRef.current) return;
        mapRef.current.fitToCoordinates(routeCoordinates, {
            edgePadding: { top: 80, right: 40, bottom: 240, left: 40 },
            animated: true,
        });
    }, [routeCoordinates]);

    // ── Status transitions ────────────────────────────────────────────────────

    const handleStatusUpdate = async (nextStatus: Booking['status']) => {
        if (!booking) return;
        setIsUpdating(true);
        try {
            const updated = await updateBookingStatusApi(booking._id, nextStatus);
            setBooking(updated);
            if (nextStatus === 'completed') {
                router.replace('/trip_completed');
            }
        } catch (err) {
            Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Could not update status.',
            );
        } finally {
            setIsUpdating(false);
        }
    };

    // ── Action config per lifecycle status ────────────────────────────────────

    const getActionConfig = () => {
        switch (booking?.status) {
            case 'accepted':
                return {
                    statusLabel: 'Navigating to customer',
                    statusTitle: 'Head to Pickup',
                    address: booking.pickupLocation.address,
                    buttonLabel: 'I Have Arrived',
                    nextStatus: 'arriving' as Booking['status'],
                };
            case 'arriving':
                return {
                    statusLabel: 'Waiting for customer',
                    statusTitle: 'Customer is on their way',
                    address: booking.pickupLocation.address,
                    buttonLabel: 'Start Ride',
                    nextStatus: 'started' as Booking['status'],
                };
            case 'started':
                return {
                    statusLabel: 'Trip in progress',
                    statusTitle: 'Heading to Dropoff',
                    address: booking.dropoffLocation.address,
                    buttonLabel: 'Complete Ride',
                    nextStatus: 'completed' as Booking['status'],
                };
            default:
                return null;
        }
    };

    const actionConfig = getActionConfig();

    // ─────────────────────────────────────────────────────────────────────────

    if (isLoading || !booking) {
        return (
            <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
                <Text style={styles.loadingText}>Loading ride details…</Text>
            </View>
        );
    }

    const pickupCoord: Coordinate = {
        latitude: booking.pickupLocation.latitude,
        longitude: booking.pickupLocation.longitude,
    };
    const dropoffCoord: Coordinate = {
        latitude: booking.dropoffLocation.latitude,
        longitude: booking.dropoffLocation.longitude,
    };

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={
                    driverCoord
                        ? {
                              latitude: driverCoord.latitude,
                              longitude: driverCoord.longitude,
                              latitudeDelta: 0.06,
                              longitudeDelta: 0.06,
                          }
                        : DEFAULT_REGION
                }
                showsUserLocation
                showsMyLocationButton={false}
            >
                {routeCoordinates.length > 1 && (
                    <Polyline
                        coordinates={routeCoordinates}
                        strokeColor={Colors.light.primary}
                        strokeWidth={4}
                    />
                )}
                <Marker coordinate={pickupCoord} pinColor={Colors.light.primary} title="Pickup" />
                <Marker coordinate={dropoffCoord} pinColor={Colors.light.red} title="Dropoff" />
            </MapView>

            {actionConfig && (
                <View style={styles.actionCard}>
                    <Text style={styles.statusLabel}>{actionConfig.statusLabel}</Text>
                    <Text style={styles.statusTitle}>{actionConfig.statusTitle}</Text>
                    <Text style={styles.addressText} numberOfLines={2}>
                        {actionConfig.address}
                    </Text>
                    <TouchableOpacity
                        style={[styles.actionButton, isUpdating && styles.actionButtonDisabled]}
                        onPress={() => handleStatusUpdate(actionConfig.nextStatus)}
                        disabled={isUpdating}
                        activeOpacity={0.85}
                    >
                        {isUpdating ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.actionButtonText}>{actionConfig.buttonLabel}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}
