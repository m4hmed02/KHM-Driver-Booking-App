/**
 * Active Ride Screen — Driver Side
 *
 * Full ride lifecycle after a customer accepts the driver's offer:
 *
 *   accepted  → Driver navigates to pickup. Live GPS emitted via socket.
 *               Button: "I Have Arrived" → sets status to 'arriving'
 *
 *   arriving  → Driver is at pickup, waiting for customer.
 *               Waits for 'customer_coming' socket event.
 *               Button visible after customer taps "I'm Coming":
 *               "Start Ride" → sets status to 'started'
 *
 *   started   → Route updated: driver location → dropoff.
 *               Live GPS continues. Button: "Complete Ride" → 'completed'
 *
 *   completed → Navigates to /trip_completed
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
import { Ionicons } from '@expo/vector-icons';

import NavigationArrowMarker from '../components/NavigationArrowMarker';
import { Colors } from '../constants/theme';
import { Coordinate, useRoute } from '../hooks/useRoute';
import { useRoadSnappedMarker } from '../hooks/useRoadSnappedMarker';
import {
    getBookingStatusApi,
    updateBookingStatusApi,
} from '../services/apis/booking/bookingService';
import { Booking, CustomerInfo } from '../services/apis/booking/type';
import { connectSocket, emitDriverLocation, getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

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
        paddingBottom: 36,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.10,
        shadowRadius: 12,
        elevation: 16,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.light.border,
        alignSelf: 'center',
        marginBottom: 16,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        backgroundColor: Colors.light.success,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginBottom: 10,
    },
    statusBadgeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.light.primary,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.light.primaryDark,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    statusTitle: {
        fontSize: 19,
        fontWeight: '800',
        color: Colors.light.text,
        marginBottom: 4,
    },
    addressText: {
        fontSize: 13,
        color: Colors.light.secondaryText,
        marginBottom: 18,
        lineHeight: 18,
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: Colors.light.background,
        borderWidth: 1,
        borderColor: Colors.light.border,
        borderRadius: 14,
        padding: 12,
        marginBottom: 16,
    },
    customerName: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.light.text,
    },
    customerPhone: {
        fontSize: 13,
        color: Colors.light.secondaryText,
        marginTop: 2,
    },
    fareBadge: {
        marginLeft: 'auto' as any,
        backgroundColor: Colors.light.success,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        alignItems: 'center',
    },
    fareLabel: {
        fontSize: 10,
        color: Colors.light.primaryDark,
        fontWeight: '500',
    },
    fareAmount: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.light.primaryDark,
    },
    waitingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FFF9E6',
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#F5D76E',
    },
    waitingText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#A16207',
        flex: 1,
    },
    actionButton: {
        height: 54,
        borderRadius: 14,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    actionButtonDisabled: { opacity: 0.5 },
    actionButtonSecondary: {
        height: 54,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
    actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    actionButtonTextSecondary: { color: Colors.light.primary, fontSize: 16, fontWeight: '700' },
    loadingOverlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: Colors.light.background,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: { fontSize: 14, color: Colors.light.secondaryText },
    completedOverlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    completedCard: {
        backgroundColor: Colors.light.background,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        width: '100%',
    },
    completedIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.light.success,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    completedTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.light.text,
        marginBottom: 6,
    },
    completedSubtitle: {
        fontSize: 14,
        color: Colors.light.secondaryText,
        textAlign: 'center',
        marginBottom: 24,
    },
    completedButton: {
        width: '100%',
        height: 54,
        borderRadius: 14,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    completedButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    recenterButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.light.background,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 5,
        zIndex: 10,
    },
});

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_REGION: Region = {
    latitude: 25.1972,
    longitude: 55.2744,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
};

const GPS_UPDATE_INTERVAL_MS = 5000; // Emit location every 5 seconds

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ActiveRide() {
    const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
    const router = useRouter();
    const { user } = useAuth();

    const [booking, setBooking] = useState<Booking | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [customerComing, setCustomerComing] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);

    // ── Smooth animated marker ────────────────────────────────────────────────
    // animatedCoord  — interpolated lat/lng updated every rAF frame
    // animatedHeading — Animated.Value in degrees, passed to NavigationArrowMarker
    const {
        animatedCoord,
        animatedHeading,
        updateTarget: updateMarkerTarget,
        setInitial: setMarkerInitial,
    } = useRoadSnappedMarker({ duration: 4500 });

    const mapRef = useRef<MapView>(null);
    const locationSubRef = useRef<Location.LocationSubscription | null>(null);
    const locationEmitTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    // Holds the latest raw GPS fix — used only for the socket emit interval
    // so we always broadcast the true position, not the interpolated one.
    const latestCoordRef = useRef<Coordinate | null>(null);

    const { fetchRoute, routeCoordinates } = useRoute();

    // ── Load booking ──────────────────────────────────────────────────────────

    const loadBooking = useCallback(async () => {
        if (!bookingId) return;
        try {
            const data = await getBookingStatusApi(bookingId);
            setBooking(data);
            // Never auto-show the completed overlay on load — it should only appear
            // as a direct result of the driver tapping "Complete Ride".
            setShowCompleted(false);
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

    // ── Socket — listen for customer_coming ───────────────────────────────────

    useEffect(() => {
        if (!user?.token) return;
        const socket = connectSocket(user.token);

        // Register user so backend can map userId → socketId
        socket.emit('register' as any, user._id);

        const handleCustomerComing = (payload: { bookingId: string }) => {
            if (payload.bookingId === bookingId) {
                setCustomerComing(true);
            }
        };

        socket.on('customer_coming', handleCustomerComing);
        return () => {
            socket.off('customer_coming', handleCustomerComing);
        };
    }, [user, bookingId]);

    // ── GPS tracking ──────────────────────────────────────────────────────────
    // Raw GPS fixes are fed into useRoadSnappedMarker (updateTarget / setInitial).
    // The hook fetches an OSRM micro-route for each fix and animates the marker
    // along the real road polyline. latestCoordRef is updated in parallel so the
    // socket emit interval always broadcasts the true GPS position.
    // broadcasts the true GPS position (not the animated/interpolated one).

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;

                // ── Initial fix — seed marker without animation ───────────────
                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.BestForNavigation,
                });
                const initial: Coordinate = {
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                };
                if (!cancelled) {
                    latestCoordRef.current = initial;
                    setMarkerInitial(initial.latitude, initial.longitude);
                }

                // ── Continuous watch — animate on every new position ──────────
                locationSubRef.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.BestForNavigation,
                        distanceInterval: 5,  // metres
                        timeInterval: 2000,   // ms
                    },
                    (position) => {
                        if (cancelled) return;
                        const coord: Coordinate = {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                        };
                        // Store real position for socket emission
                        latestCoordRef.current = coord;
                        // Hand off to the animation hook — it lerps position and
                        // derives the bearing automatically.
                        updateMarkerTarget(coord.latitude, coord.longitude);
                    },
                );
            } catch {
                // GPS unavailable — still show map
            }
        })();

        return () => {
            cancelled = true;
            locationSubRef.current?.remove();
        };
    }, [setMarkerInitial, updateMarkerTarget]);

    // ── Emit location to customer via socket every GPS_UPDATE_INTERVAL_MS ─────

    useEffect(() => {
        if (!booking || !bookingId) return;
        const activeStatuses: Booking['status'][] = ['accepted', 'arriving', 'started'];
        if (!activeStatuses.includes(booking.status)) return;

        const customerId =
            typeof booking.customer === 'object' ? (booking.customer as any)._id : booking.customer;

        // Emit immediately on status change (booking loaded/changed)
        if (latestCoordRef.current && customerId) {
            emitDriverLocation(bookingId, customerId, latestCoordRef.current.latitude, latestCoordRef.current.longitude);
        }

        locationEmitTimer.current = setInterval(() => {
            if (latestCoordRef.current && customerId) {
                emitDriverLocation(bookingId, customerId, latestCoordRef.current.latitude, latestCoordRef.current.longitude);
            }
        }, GPS_UPDATE_INTERVAL_MS);

        return () => {
            if (locationEmitTimer.current) clearInterval(locationEmitTimer.current);
        };
    }, [booking?.status, bookingId]);

    // ── Route: driver → pickup (accepted/arriving) or → dropoff (started) ────

    useEffect(() => {
        if (!booking || !animatedCoord) return;
        const destination: Coordinate =
            booking.status === 'started'
                ? { latitude: booking.dropoffLocation.latitude, longitude: booking.dropoffLocation.longitude }
                : { latitude: booking.pickupLocation.latitude, longitude: booking.pickupLocation.longitude };
        fetchRoute(animatedCoord, destination);
    // Route re-fetches whenever driver position changes or status changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [booking?.status, animatedCoord?.latitude, animatedCoord?.longitude]);

    // ── Fit map to route ──────────────────────────────────────────────────────

    useEffect(() => {
        if (routeCoordinates.length < 2 || !mapRef.current) return;
        mapRef.current.fitToCoordinates(routeCoordinates, {
            edgePadding: { top: 80, right: 40, bottom: 300, left: 40 },
            animated: true,
        });
    }, [routeCoordinates]);

    // ── Status transitions ────────────────────────────────────────────────────

    const handleStatusUpdate = async (nextStatus: Booking['status']) => {
        if (!booking) return;
        // Guard: never show the completed overlay unless this call explicitly
        // triggers the 'completed' transition (prevents stale state leaking in).
        if (nextStatus === 'completed') {
            Alert.alert(
                'Complete Ride',
                'Are you sure you want to complete this ride?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Complete',
                        style: 'default',
                        onPress: async () => {
                            setIsUpdating(true);
                            try {
                                const updated = await updateBookingStatusApi(booking._id, 'completed');
                                setBooking(updated);
                                if (locationEmitTimer.current) clearInterval(locationEmitTimer.current);
                                locationSubRef.current?.remove();
                                setShowCompleted(true);
                            } catch (err) {
                                Alert.alert(
                                    'Error',
                                    err instanceof Error ? err.message : 'Could not complete ride.',
                                );
                            } finally {
                                setIsUpdating(false);
                            }
                        },
                    },
                ],
            );
            return;
        }
        setIsUpdating(true);
        try {
            const updated = await updateBookingStatusApi(booking._id, nextStatus);
            setBooking(updated);
        } catch (err) {
            Alert.alert(
                'Error',
                err instanceof Error ? err.message : 'Could not update status.',
            );
        } finally {
            setIsUpdating(false);
        }
    };

    // ── Loading ───────────────────────────────────────────────────────────────

    if (isLoading || !booking) {
        return (
            <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
                <Text style={styles.loadingText}>Loading ride details…</Text>
            </View>
        );
    }

    // ── Derived data ──────────────────────────────────────────────────────────

    const pickupCoord: Coordinate = {
        latitude: booking.pickupLocation.latitude,
        longitude: booking.pickupLocation.longitude,
    };
    const dropoffCoord: Coordinate = {
        latitude: booking.dropoffLocation.latitude,
        longitude: booking.dropoffLocation.longitude,
    };

    const customer = typeof booking.customer === 'object' ? booking.customer as CustomerInfo : null;

    // ── Per-status card content ───────────────────────────────────────────────

    const cardContent = (() => {
        switch (booking.status) {
            case 'accepted':
                return {
                    badge: 'Navigating to Pickup',
                    title: 'Head to Pickup Location',
                    address: booking.pickupLocation.address,
                    primaryButton: {
                        label: 'I Have Arrived',
                        icon: 'checkmark-circle-outline' as const,
                        onPress: () => handleStatusUpdate('arriving'),
                    },
                };
            case 'arriving':
                return {
                    badge: 'Arrived at Pickup',
                    title: customerComing ? 'Customer is on their way!' : 'Waiting for Customer',
                    address: booking.pickupLocation.address,
                    primaryButton: customerComing ? {
                        label: 'Start Ride',
                        icon: 'play-circle-outline' as const,
                        onPress: () => handleStatusUpdate('started'),
                    } : null,
                    waitingMessage: !customerComing
                        ? 'Waiting for the customer to confirm they\'re coming…'
                        : null,
                };
            case 'started':
                return {
                    badge: 'Trip in Progress',
                    title: 'Heading to Dropoff',
                    address: booking.dropoffLocation.address,
                    primaryButton: {
                        label: 'Complete Ride',
                        icon: 'flag-outline' as const,
                        onPress: () => handleStatusUpdate('completed'),
                    },
                };
            default:
                return null;
        }
    })();

    return (
        <View style={styles.container}>
            {/* ── Map ─────────────────────────────────────────────────────── */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={
                    animatedCoord
                        ? {
                              latitude: animatedCoord.latitude,
                              longitude: animatedCoord.longitude,
                              latitudeDelta: 0.06,
                              longitudeDelta: 0.06,
                          }
                        : DEFAULT_REGION
                }
                showsUserLocation={false}
                showsMyLocationButton={false}
            >
                {/* ── Driver Navigation Arrow Marker (replaces standard blue dot) ── */}
                {animatedCoord && (
                    <Marker
                        coordinate={animatedCoord}
                        anchor={{ x: 0.5, y: 0.5 }}
                        flat={false}
                        zIndex={999}
                        tracksViewChanges={true}
                        title="Your Location"
                    >
                        <NavigationArrowMarker heading={animatedHeading} />
                    </Marker>
                )}

                {/* Route polyline */}
                {routeCoordinates.length > 1 && (
                    <Polyline
                        coordinates={routeCoordinates}
                        strokeColor={Colors.light.primary}
                        strokeWidth={4}
                    />
                )}

                {/* Pickup marker — always visible */}
                <Marker
                    coordinate={pickupCoord}
                    title="Pickup"
                    anchor={{ x: 0.5, y: 1 }}
                >
                    <View style={{ alignItems: 'center' }}>
                        <View style={{
                            backgroundColor: Colors.light.primary,
                            width: 36, height: 36, borderRadius: 18,
                            alignItems: 'center', justifyContent: 'center',
                            shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
                        }}>
                            <Ionicons name="person" size={20} color="#fff" />
                        </View>
                        <View style={{ width: 2, height: 10, backgroundColor: Colors.light.primary }} />
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.light.primary }} />
                    </View>
                </Marker>

                {/* Dropoff marker */}
                <Marker
                    coordinate={dropoffCoord}
                    title="Dropoff"
                    anchor={{ x: 0.5, y: 1 }}
                >
                    <View style={{ alignItems: 'center' }}>
                        <View style={{
                            backgroundColor: Colors.light.red ?? '#EF4444',
                            width: 36, height: 36, borderRadius: 18,
                            alignItems: 'center', justifyContent: 'center',
                            shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
                        }}>
                            <Ionicons name="flag" size={20} color="#fff" />
                        </View>
                        <View style={{ width: 2, height: 10, backgroundColor: Colors.light.red ?? '#EF4444' }} />
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.light.red ?? '#EF4444' }} />
                    </View>
                </Marker>
            </MapView>

            {/* Recenter button */}
            {animatedCoord && (
                <TouchableOpacity
                    style={styles.recenterButton}
                    onPress={() => {
                        if (mapRef.current && animatedCoord) {
                            mapRef.current.animateToRegion({
                                latitude: animatedCoord.latitude,
                                longitude: animatedCoord.longitude,
                                latitudeDelta: 0.015,
                                longitudeDelta: 0.015,
                            }, 500);
                        }
                    }}
                    activeOpacity={0.8}
                >
                    <Ionicons name="locate" size={22} color={Colors.light.primary} />
                </TouchableOpacity>
            )}

            {/* ── Action Card ─────────────────────────────────────────────── */}
            {cardContent && (
                <View style={styles.actionCard}>
                    <View style={styles.handle} />

                    {/* Status badge */}
                    <View style={styles.statusBadge}>
                        <View style={styles.statusBadgeDot} />
                        <Text style={styles.statusBadgeText}>{cardContent.badge}</Text>
                    </View>

                    {/* Title + address */}
                    <Text style={styles.statusTitle}>{cardContent.title}</Text>
                    <Text style={styles.addressText} numberOfLines={2}>
                        {cardContent.address}
                    </Text>

                    {/* Customer row */}
                    {customer && (
                        <View style={styles.customerRow}>
                            <View style={{
                                width: 42, height: 42, borderRadius: 21,
                                backgroundColor: Colors.light.success,
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Ionicons name="person" size={22} color={Colors.light.primaryDark} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.customerName}>{customer.name}</Text>
                                {customer.phone ? (
                                    <Text style={styles.customerPhone}>{customer.phone}</Text>
                                ) : null}
                            </View>
                            <View style={styles.fareBadge}>
                                <Text style={styles.fareLabel}>Agreed Fare</Text>
                                <Text style={styles.fareAmount}>AED {booking.estimatedFare.toFixed(0)}</Text>
                            </View>
                        </View>
                    )}

                    {/* Waiting message */}
                    {(cardContent as any).waitingMessage && (
                        <View style={styles.waitingBox}>
                            <ActivityIndicator size="small" color="#A16207" />
                            <Text style={styles.waitingText}>
                                {(cardContent as any).waitingMessage}
                            </Text>
                        </View>
                    )}

                    {/* Primary action button */}
                    {cardContent.primaryButton && (
                        <TouchableOpacity
                            style={[styles.actionButton, isUpdating && styles.actionButtonDisabled]}
                            onPress={cardContent.primaryButton.onPress}
                            disabled={isUpdating}
                            activeOpacity={0.85}
                        >
                            {isUpdating ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name={cardContent.primaryButton.icon} size={20} color="#fff" />
                                    <Text style={styles.actionButtonText}>
                                        {cardContent.primaryButton.label}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* ── Ride Completed overlay ──────────────────────────────────── */}
            {showCompleted && (
                <View style={styles.completedOverlay}>
                    <View style={styles.completedCard}>
                        <View style={styles.completedIcon}>
                            <Ionicons name="checkmark" size={44} color={Colors.light.primaryDark} />
                        </View>
                        <Text style={styles.completedTitle}>Ride Completed! 🎉</Text>
                        <Text style={styles.completedSubtitle}>
                            You have successfully dropped off the customer.
                            {'\n'}Great job!
                        </Text>
                        <TouchableOpacity
                            style={styles.completedButton}
                            onPress={() => router.replace('/trip_completed')}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.completedButtonText}>View Trip Summary</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}
