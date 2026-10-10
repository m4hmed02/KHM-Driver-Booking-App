import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Keyboard,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';

import { DraggableBottomSheet, DraggableBottomSheetRef } from '../components/DraggableBottomSheet';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import {
    getAvailableBookingsApi,
    makeDriverOfferApi,
} from '../services/apis/booking/bookingService';
import { Booking, CustomerInfo } from '../services/apis/booking/type';
import { connectSocket } from '../services/socket';
import { styles } from '../styles/home.styles';

// ─── Constants ────────────────────────────────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Minimum visible height of the bottom sheet at snap index 0 (35% of screen).
// Used to pad map's fitToCoordinates so markers aren't hidden behind the sheet.
const BOTTOM_SHEET_MIN_HEIGHT = SCREEN_HEIGHT * 0.48;

const DEFAULT_REGION: Region = {
    latitude: 25.1972,
    longitude: 55.2744,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatFare = (amount: number) => `AED ${amount.toFixed(0)}`;

const getCustomerInfo = (customer: Booking['customer']): CustomerInfo | null => {
    if (typeof customer === 'object' && customer !== null) return customer as CustomerInfo;
    return null;
};

// ─── RideCard ─────────────────────────────────────────────────────────────────

interface RideCardProps {
    booking: Booking;
    hasOffered: boolean;
    onMakeOffer: (booking: Booking) => void;
}

function RideCard({ booking, hasOffered, onMakeOffer }: RideCardProps) {
    const customer = getCustomerInfo(booking.customer);
    const typeLabel = booking.bookingType === 'schedule_driver' ? 'Scheduled' : 'Now';

    return (
        <View style={styles.rideCard}>
            {/* Header: customer info + fare */}
            <View style={styles.rideCardHeader}>
                <View style={styles.customerRow}>
                    <Ionicons
                        name="person-circle-outline"
                        size={36}
                        color={Colors.light.secondaryText}
                    />
                    <View>
                        <Text style={styles.customerName}>{customer?.name ?? 'Customer'}</Text>
                        {customer?.phone ? (
                            <Text style={styles.customerPhone}>{customer.phone}</Text>
                        ) : null}
                    </View>
                </View>
                <View style={styles.fareContainer}>
                    <Text style={styles.fareLabel}>Offered fare</Text>
                    <Text style={styles.fareAmount}>{formatFare(booking.estimatedFare)}</Text>
                    <Text style={styles.bookingType}>{typeLabel}</Text>
                </View>
            </View>

            {/* Route timeline */}
            <View style={styles.routeContainer}>
                <View style={styles.routeTimeline}>
                    <View style={styles.routeDotGreen} />
                    <View style={styles.routeLine} />
                    <View style={styles.routeDotBlack} />
                </View>
                <View style={styles.routeAddresses}>
                    <Text style={styles.routeAddress} numberOfLines={2}>
                        {booking.pickupLocation.address}
                    </Text>
                    <Text style={styles.routeAddressSecondary} numberOfLines={2}>
                        {booking.dropoffLocation.address}
                    </Text>
                </View>
            </View>

            {/* Actions */}
            <View style={styles.rideCardFooter}>
                <TouchableOpacity
                    style={[styles.offerButton, hasOffered && styles.offerButtonRequested]}
                    onPress={() => !hasOffered && onMakeOffer(booking)}
                    activeOpacity={hasOffered ? 1 : 0.85}
                    disabled={hasOffered}
                >
                    {hasOffered ? (
                        <View style={styles.offerButtonRequestedContent}>
                            <Ionicons name="checkmark-circle" size={16} color="#fff" />
                            <Text style={styles.offerButtonText}> Requested</Text>
                        </View>
                    ) : (
                        <Text style={styles.offerButtonText}>Make an Offer</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── OfferModal ───────────────────────────────────────────────────────────────

interface OfferModalProps {
    visible: boolean;
    booking: Booking | null;
    onClose: () => void;
    onOfferSubmitted: (booking: Booking) => void;
}

function OfferModal({ visible, booking, onClose, onOfferSubmitted }: OfferModalProps) {
    const [fareText, setFareText] = useState('');
    const [isFareInputFocused, setIsFareInputFocused] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Pre-fill with the customer's offered fare when the modal opens
    useEffect(() => {
        if (visible && booking) {
            setFareText(booking.estimatedFare.toFixed(0));
            setIsSubmitting(false);
        }
    }, [visible, booking]);

    const handleSubmit = async () => {
        if (!booking) return;
        const fare = parseFloat(fareText);
        if (isNaN(fare) || fare <= 0) {
            Alert.alert('Invalid Fare', 'Please enter a valid fare amount.');
            return;
        }
        Keyboard.dismiss();
        setIsSubmitting(true);
        try {
            const updated = await makeDriverOfferApi(booking._id, fare);
            // Parent handles: closing modal + toast + marking card as "Requested"
            onOfferSubmitted(updated);
        } catch (err) {
            setIsSubmitting(false);
            Alert.alert(
                'Offer Failed',
                err instanceof Error ? err.message : 'Could not submit your offer. Please try again.',
            );
        }
    };

    if (!booking) return null;

    const customer = getCustomerInfo(booking.customer);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
                    <View style={styles.modalHandle} />

                    {/* Offer form */}
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.modalTitle}>Ride Details</Text>
                        <Text style={styles.modalSubtitle}>
                            Review the trip and submit your fare offer.
                        </Text>

                        {/* Customer */}
                        {customer && (
                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>Customer</Text>
                                <View style={styles.modalDetailRow}>
                                    <Ionicons
                                        name="person-outline"
                                        size={16}
                                        color={Colors.light.secondaryText}
                                    />
                                    <Text style={styles.modalDetailText}>{customer.name}</Text>
                                </View>
                            </View>
                        )}

                        {/* Route */}
                        <View style={styles.modalSection}>
                            <Text style={styles.modalSectionTitle}>Route</Text>
                            <View style={styles.modalDetailRow}>
                                <Ionicons
                                    name="radio-button-on"
                                    size={16}
                                    color={Colors.light.primary}
                                />
                                <Text style={styles.modalDetailText}>
                                    {booking.pickupLocation.address}
                                </Text>
                            </View>
                            <View style={styles.modalDetailRow}>
                                <Ionicons
                                    name="location"
                                    size={16}
                                    color={Colors.light.red}
                                />
                                <Text style={styles.modalDetailText}>
                                    {booking.dropoffLocation.address}
                                </Text>
                            </View>
                        </View>

                        {/* Customer's offered fare */}
                        <View style={styles.modalSection}>
                            <Text style={styles.modalSectionTitle}>Customer's Offer</Text>
                            <View style={styles.fareRow}>
                                <Ionicons
                                    name="cash-outline"
                                    size={22}
                                    color={Colors.light.primary}
                                />
                                <View style={styles.fareRowText}>
                                    <Text style={styles.fareRowLabel}>Offered fare</Text>
                                    <Text style={styles.fareRowAmount}>
                                        {formatFare(booking.estimatedFare)}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Driver fare input */}
                        <View style={styles.modalSection}>
                            <Text style={styles.fareInputLabel}>Your Offer (AED)</Text>
                            <View
                                style={[
                                    styles.fareInputRow,
                                    isFareInputFocused && styles.fareInputRowFocused,
                                ]}
                            >
                                <Text style={styles.fareInputCurrency}>AED</Text>
                                <TextInput
                                    style={styles.fareInput}
                                    value={fareText}
                                    onChangeText={setFareText}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={Colors.light.secondaryText}
                                    onFocus={() => setIsFareInputFocused(true)}
                                    onBlur={() => setIsFareInputFocused(false)}
                                    returnKeyType="done"
                                    onSubmitEditing={handleSubmit}
                                />
                            </View>
                            <Text style={styles.fareHint}>
                                You can match or raise the customer's offer.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.submitOfferButton,
                                isSubmitting && styles.submitOfferButtonDisabled,
                            ]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                            activeOpacity={0.85}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitOfferButtonText}>Submit Offer</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelModalButton} onPress={onClose}>
                            <Text style={styles.cancelModalButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function Home() {
    const { user } = useAuth();
    const router = useRouter();
    const drawerNav = useNavigation();

    const mapRef = useRef<MapView>(null);
    const [driverRegion, setDriverRegion] = useState<Region | null>(null);
    const [isLocating, setIsLocating] = useState(true);

    const [rides, setRides] = useState<Booking[]>([]);
    const [isLoadingRides, setIsLoadingRides] = useState(false);

    // Track booking IDs the driver has already submitted an offer for
    const [offeredBookingIds, setOfferedBookingIds] = useState<Set<string>>(new Set());

    const [selectedRide, setSelectedRide] = useState<Booking | null>(null);
    const [offerModalVisible, setOfferModalVisible] = useState(false);

    const sheetRef = useRef<DraggableBottomSheetRef>(null);

    // ── GPS location ──────────────────────────────────────────────────────────

    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setDriverRegion(DEFAULT_REGION);
                    setIsLocating(false);
                    return;
                }
                const loc = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                setDriverRegion({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    latitudeDelta: 0.06,
                    longitudeDelta: 0.06,
                });
            } catch {
                setDriverRegion(DEFAULT_REGION);
            } finally {
                setIsLocating(false);
            }
        })();
    }, []);

    // ── Socket listeners ──────────────────────────────────────────────────────

    useEffect(() => {
        if (!user?.token) return;

        const socket = connectSocket(user.token);

        // ── Catch-all: log EVERY event so we can see the real event name in Metro logs
        const debugListener = (eventName: string, ...args: any[]) => {
            console.warn(
                `[HOME SOCKET] event="${eventName}" data=${JSON.stringify(args).substring(0, 300)}`
            );
        };
        socket.onAny(debugListener);

        // ── Handle a new booking from the server (any possible event name)
        const handleNewBooking = (payload: any) => {
            console.log('[HOME] handleNewBooking called with:', JSON.stringify(payload).substring(0, 200));
            const booking = payload?.booking || payload;
            if (!booking) {
                console.warn('[HOME] handleNewBooking: no booking in payload');
                return;
            }
            // Normalise _id
            if (!booking._id && booking.id) booking._id = booking.id;
            if (!booking._id) {
                console.warn('[HOME] handleNewBooking: booking has no _id', booking);
                return;
            }

            setRides((prev) => {
                if (prev.some((r) => r._id === booking._id)) return prev;
                console.log('[HOME] Adding new booking to rides list:', booking._id);
                return [booking, ...prev];
            });
        };

        socket.on('new_booking_request', handleNewBooking);
        socket.on('new_booking', handleNewBooking);
        socket.on('ride_request', handleNewBooking);
        socket.on('booking_created', handleNewBooking);
        socket.on('newBooking', handleNewBooking);
        socket.on('rideRequest', handleNewBooking);

        socket.on('offer_accepted', (payload) => {
            if (payload.driverId !== user._id) return;
            setOfferModalVisible(false);
            setSelectedRide(null);
            setRides((prev) => prev.filter((r) => r._id !== payload.bookingId));
            router.push({
                pathname: '/active_ride',
                params: { bookingId: payload.bookingId },
            });
        });

        socket.on('offer_rejected', (payload) => {
            if (payload.driverId !== user._id) return;
            setOfferModalVisible(false);
            setSelectedRide(null);
            Alert.alert('Offer Declined', 'The customer has declined your offer.');
        });

        const handleBookingRemoved = (payload: { bookingId: string }) => {
            // Remove from ride list
            setRides((prev) => prev.filter((r) => r._id !== payload.bookingId));

            // Clean up offered state for this booking
            setOfferedBookingIds((prev) => {
                const next = new Set(prev);
                next.delete(payload.bookingId);
                return next;
            });

            // Close modal if driver was viewing this ride
            setSelectedRide((currentSelected) => {
                if (currentSelected?._id === payload.bookingId) {
                    setOfferModalVisible(false);
                    return null;
                }
                return currentSelected;
            });

            // Always show a toast so the driver knows the request is gone
            if (Platform.OS === 'android') {
                ToastAndroid.showWithGravity(
                    'Customer cancelled the request.',
                    ToastAndroid.LONG,
                    ToastAndroid.BOTTOM,
                );
            }
        };

        socket.on('booking_deleted', handleBookingRemoved);
        socket.on('booking_cancelled', handleBookingRemoved);
        socket.on('booking_request_cancelled', handleBookingRemoved);
        socket.on('booking_request_deleted', handleBookingRemoved);
        socket.on('booking_status_updated', (payload) => {
            if (payload.status === 'cancelled' || payload.status === 'accepted') {
                handleBookingRemoved(payload);
            }
        });

        return () => {
            socket.offAny(debugListener);
            socket.off('new_booking_request', handleNewBooking);
            socket.off('new_booking', handleNewBooking);
            socket.off('ride_request', handleNewBooking);
            socket.off('booking_created', handleNewBooking);
            socket.off('newBooking', handleNewBooking);
            socket.off('rideRequest', handleNewBooking);
            socket.off('offer_accepted');
            socket.off('offer_rejected');
            socket.off('booking_deleted');
            socket.off('booking_cancelled');
            socket.off('booking_request_cancelled');
            socket.off('booking_request_deleted');
            socket.off('booking_status_updated');
        };
    }, [user]);

    // ── Fetch available rides ─────────────────────────────────────────────────

    const fetchRides = useCallback(async () => {
        setIsLoadingRides(true);
        try {
            const data = await getAvailableBookingsApi();
            setRides(data);
        } catch (err) {
            Alert.alert(
                'Failed to Load',
                err instanceof Error ? err.message : 'Could not fetch available rides.',
            );
        } finally {
            setIsLoadingRides(false);
        }
    }, []);

    useEffect(() => {
        fetchRides();
    }, [fetchRides]);

    // ── Recenter ──────────────────────────────────────────────────────────────

    const handleRecenter = useCallback(async () => {
        try {
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const region: Region = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.06,
                longitudeDelta: 0.06,
            };
            setDriverRegion(region);
            mapRef.current?.animateToRegion(region, 600);
        } catch {
            // GPS may be unavailable
        }
    }, []);

    // ── Fit map to markers ────────────────────────────────────────────────────

    useEffect(() => {
        if (rides.length === 0 || !mapRef.current) return;
        const coords = rides.map((r) => ({
            latitude: r.pickupLocation.latitude,
            longitude: r.pickupLocation.longitude,
        }));
        if (driverRegion) {
            coords.push({ latitude: driverRegion.latitude, longitude: driverRegion.longitude });
        }
        mapRef.current.fitToCoordinates(coords, {
            edgePadding: {
                top: 80,
                right: 40,
                bottom: BOTTOM_SHEET_MIN_HEIGHT + 40,
                left: 40,
            },
            animated: true,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rides]);

    // ── Offer callbacks ───────────────────────────────────────────────────────

    const handleMakeOffer = useCallback((booking: Booking) => {
        setSelectedRide(booking);
        setOfferModalVisible(true);
    }, []);

    const handleOfferSubmitted = useCallback((updatedBooking: Booking) => {
        setSelectedRide(updatedBooking);
        // Mark this booking as offered so the card shows "Requested"
        setOfferedBookingIds((prev) => new Set([...prev, updatedBooking._id]));
        // Close modal
        setOfferModalVisible(false);
        setSelectedRide(null);
        // Show toast
        if (Platform.OS === 'android') {
            ToastAndroid.showWithGravity(
                '✅ Offer sent! Waiting for customer response.',
                ToastAndroid.LONG,
                ToastAndroid.BOTTOM,
            );
        }
    }, []);

    const handleCloseModal = useCallback(() => {
        setOfferModalVisible(false);
        setSelectedRide(null);
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────

    const renderRideCard = useCallback(
        ({ item }: { item: Booking }) => (
            <RideCard
                booking={item}
                hasOffered={offeredBookingIds.has(item._id)}
                onMakeOffer={handleMakeOffer}
            />
        ),
        [handleMakeOffer, offeredBookingIds],
    );

    const renderEmpty = () => {
        if (isLoadingRides) {
            return (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={Colors.light.primary} />
                    <Text style={[styles.emptySubtitle, { marginTop: 12 }]}>
                        Loading available rides…
                    </Text>
                </View>
            );
        }
        return (
            <View style={styles.centerContent}>
                <Ionicons
                    name="car-outline"
                    size={52}
                    color={Colors.light.secondaryText}
                    style={styles.emptyIcon}
                />
                <Text style={styles.emptyTitle}>No rides available</Text>
                <Text style={styles.emptySubtitle}>
                    New requests will appear here automatically.{'\n'}
                    Pull down to refresh manually.
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Map */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={driverRegion ?? DEFAULT_REGION}
                region={driverRegion ?? undefined}
                showsUserLocation
                showsMyLocationButton={false}
                onRegionChangeComplete={() => {
                    // Allow free map movement after initial positioning
                    if (driverRegion !== null) setDriverRegion(null);
                }}
            >
                {rides.map((ride) => (
                    <Marker
                        key={ride._id}
                        coordinate={{
                            latitude: ride.pickupLocation.latitude,
                            longitude: ride.pickupLocation.longitude,
                        }}
                        onPress={() => handleMakeOffer(ride)}
                        tracksViewChanges={false}
                    >
                        <View style={styles.markerCallout}>
                            <Text style={styles.markerFare}>
                                {formatFare(ride.estimatedFare)}
                            </Text>
                            <Text style={styles.markerAddress} numberOfLines={1}>
                                {ride.pickupLocation.address.split(',')[0]}
                            </Text>
                        </View>
                    </Marker>
                ))}
            </MapView>

            {/* Header overlay */}
            <View style={styles.headerOverlay}>
                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => (drawerNav as any).openDrawer()}
                >
                    <Ionicons name="menu" size={22} color={Colors.light.text} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.recenterButton} onPress={handleRecenter}>
                    <Ionicons name="locate" size={20} color={Colors.light.primary} />
                </TouchableOpacity>
            </View>

            {/* Bottom sheet with ride list */}
            <DraggableBottomSheet
                ref={sheetRef}
                snapPoints={[0.48, 0.72, 0.92]}
                initialSnap={0}
                backgroundColor={Colors.light.background}
            >
                <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Available Rides</Text>
                    <View style={styles.sheetCountBadge}>
                        <Text style={styles.sheetCountText}>{rides.length} nearby</Text>
                    </View>
                </View>

                <FlatList
                    data={rides}
                    keyExtractor={(item) => item._id}
                    renderItem={renderRideCard}
                    contentContainerStyle={styles.rideList}
                    ListEmptyComponent={renderEmpty}
                    refreshing={isLoadingRides}
                    onRefresh={fetchRides}
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                />
            </DraggableBottomSheet>

            {/* Offer modal */}
            <OfferModal
                visible={offerModalVisible}
                booking={selectedRide}
                onClose={handleCloseModal}
                onOfferSubmitted={handleOfferSubmitted}
            />
        </View>
    );
}
