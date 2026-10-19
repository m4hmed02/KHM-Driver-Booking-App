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
    acceptScheduledBookingApi,
    getAvailableBookingsApi,
    getScheduledBookingsApi,
    makeDriverOfferApi,
} from '../services/apis/booking/bookingService';
import { Booking, CustomerInfo } from '../services/apis/booking/type';
import { connectSocket } from '../services/socket';
import { styles } from '../styles/home.styles';

// ─── Constants ────────────────────────────────────────────────────────────────

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
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

/** Format ISO date string to a human-readable date + time */
const formatScheduledTime = (iso: string | null): string => {
    if (!iso) return 'Scheduled';
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

// ─── RideCard (driver_now) ────────────────────────────────────────────────────

interface RideCardProps {
    booking: Booking;
    hasOffered: boolean;
    onMakeOffer: (booking: Booking) => void;
}

function RideCard({ booking, hasOffered, onMakeOffer }: RideCardProps) {
    const customer = getCustomerInfo(booking.customer);

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

// ─── ScheduledRideCard ────────────────────────────────────────────────────────

interface ScheduledRideCardProps {
    booking: Booking;
    onAccept: (booking: Booking) => void;
    isAccepting: boolean;
}

function ScheduledRideCard({ booking, onAccept, isAccepting }: ScheduledRideCardProps) {
    const customer = getCustomerInfo(booking.customer);

    return (
        <View style={styles.rideCard}>
            {/* Scheduled time badge */}
            <View style={styles.scheduledTimeBadge}>
                <Ionicons name="calendar-outline" size={13} color={Colors.light.primaryDark} />
                <Text style={styles.scheduledTimeText}>
                    {formatScheduledTime(booking.scheduledTime)}
                </Text>
            </View>

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

            {/* Accept button — direct accept, no bidding */}
            <View style={styles.rideCardFooter}>
                <TouchableOpacity
                    style={[styles.offerButton, isAccepting && styles.offerButtonRequested]}
                    onPress={() => !isAccepting && onAccept(booking)}
                    activeOpacity={isAccepting ? 1 : 0.85}
                    disabled={isAccepting}
                >
                    {isAccepting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.offerButtonText}>Accept Ride</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── OfferModal (driver_now bidding) ─────────────────────────────────────────

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
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
                <TouchableOpacity activeOpacity={1} style={styles.modalSheet}>
                    <View style={styles.modalHandle} />
                    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalTitle}>Ride Details</Text>
                        <Text style={styles.modalSubtitle}>
                            Review the trip and submit your fare offer.
                        </Text>

                        {customer && (
                            <View style={styles.modalSection}>
                                <Text style={styles.modalSectionTitle}>Customer</Text>
                                <View style={styles.modalDetailRow}>
                                    <Ionicons name="person-outline" size={16} color={Colors.light.secondaryText} />
                                    <Text style={styles.modalDetailText}>{customer.name}</Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.modalSection}>
                            <Text style={styles.modalSectionTitle}>Route</Text>
                            <View style={styles.modalDetailRow}>
                                <Ionicons name="radio-button-on" size={16} color={Colors.light.primary} />
                                <Text style={styles.modalDetailText}>{booking.pickupLocation.address}</Text>
                            </View>
                            <View style={styles.modalDetailRow}>
                                <Ionicons name="location" size={16} color={Colors.light.red} />
                                <Text style={styles.modalDetailText}>{booking.dropoffLocation.address}</Text>
                            </View>
                        </View>

                        <View style={styles.modalSection}>
                            <Text style={styles.modalSectionTitle}>Customer's Offer</Text>
                            <View style={styles.fareRow}>
                                <Ionicons name="cash-outline" size={22} color={Colors.light.primary} />
                                <View style={styles.fareRowText}>
                                    <Text style={styles.fareRowLabel}>Offered fare</Text>
                                    <Text style={styles.fareRowAmount}>{formatFare(booking.estimatedFare)}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.modalSection}>
                            <Text style={styles.fareInputLabel}>Your Offer (AED)</Text>
                            <View style={[styles.fareInputRow, isFareInputFocused && styles.fareInputRowFocused]}>
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
                            <Text style={styles.fareHint}>You can match or raise the customer's offer.</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.submitOfferButton, isSubmitting && styles.submitOfferButtonDisabled]}
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

type TabType = 'now' | 'scheduled';

export default function Home() {
    const { user } = useAuth();
    const router = useRouter();
    const drawerNav = useNavigation();

    const mapRef = useRef<MapView>(null);
    const [driverRegion, setDriverRegion] = useState<Region | null>(null);

    // ── Tab state ─────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<TabType>('now');

    // ── Ride Now (driver_now) state ───────────────────────────────────────────
    const [nowRides, setNowRides] = useState<Booking[]>([]);
    const [isLoadingNow, setIsLoadingNow] = useState(false);
    const [offeredBookingIds, setOfferedBookingIds] = useState<Set<string>>(new Set());
    const [selectedRide, setSelectedRide] = useState<Booking | null>(null);
    const [offerModalVisible, setOfferModalVisible] = useState(false);

    // ── Scheduled (schedule_driver) state ────────────────────────────────────
    const [scheduledRides, setScheduledRides] = useState<Booking[]>([]);
    const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);

    const sheetRef = useRef<DraggableBottomSheetRef>(null);

    // ── GPS location ──────────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') { setDriverRegion(DEFAULT_REGION); return; }
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                setDriverRegion({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    latitudeDelta: 0.06,
                    longitudeDelta: 0.06,
                });
            } catch {
                setDriverRegion(DEFAULT_REGION);
            }
        })();
    }, []);

    // ── Fetch rides ───────────────────────────────────────────────────────────
    const fetchNowRides = useCallback(async () => {
        setIsLoadingNow(true);
        try {
            const data = await getAvailableBookingsApi();   // driver_now only
            setNowRides(data);
        } catch (err) {
            Alert.alert('Failed to Load', err instanceof Error ? err.message : 'Could not fetch rides.');
        } finally {
            setIsLoadingNow(false);
        }
    }, []);

    const fetchScheduledRides = useCallback(async () => {
        setIsLoadingScheduled(true);
        try {
            const data = await getScheduledBookingsApi();  // schedule_driver only
            setScheduledRides(data);
        } catch (err) {
            Alert.alert('Failed to Load', err instanceof Error ? err.message : 'Could not fetch scheduled rides.');
        } finally {
            setIsLoadingScheduled(false);
        }
    }, []);

    useEffect(() => { fetchNowRides(); }, [fetchNowRides]);
    useEffect(() => { fetchScheduledRides(); }, [fetchScheduledRides]);

    // ── Socket listeners ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!user?.token) return;
        const socket = connectSocket(user.token, user._id);
        socket.emit('register' as any, user._id);

        const debugListener = (eventName: string, ...args: any[]) => {
            console.warn(`[HOME SOCKET] event="${eventName}" data=${JSON.stringify(args).substring(0, 300)}`);
        };
        socket.onAny(debugListener);

        // New booking pushed from backend — route to the correct list by bookingType
        const handleNewBooking = (payload: any) => {
            const booking = payload?.booking || payload;
            if (!booking?._id) return;
            if (!booking._id && booking.id) booking._id = booking.id;

            if (booking.bookingType === 'schedule_driver') {
                setScheduledRides((prev) => {
                    if (prev.some((r) => r._id === booking._id)) return prev;
                    // Insert sorted by scheduledTime ascending
                    const next = [...prev, booking].sort((a, b) => {
                        if (!a.scheduledTime) return 1;
                        if (!b.scheduledTime) return -1;
                        return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
                    });
                    return next;
                });
            } else {
                // driver_now
                setNowRides((prev) => {
                    if (prev.some((r) => r._id === booking._id)) return prev;
                    return [booking, ...prev];
                });
            }
        };

        socket.on('new_booking_request', handleNewBooking);
        socket.on('new_booking', handleNewBooking);
        socket.on('ride_request', handleNewBooking);
        socket.on('booking_created', handleNewBooking);
        socket.on('newBooking', handleNewBooking);
        socket.on('rideRequest', handleNewBooking);

        // Driver's offer was accepted → navigate to active ride
        socket.on('offer_accepted', (payload: any) => {
            const bookingId = payload?.bookingId ?? payload?._id;
            const driverId = payload?.driverId ?? payload?.driver?._id ?? payload?.driver;
            if (driverId && driverId !== user._id) return;
            setOfferModalVisible(false);
            setSelectedRide(null);
            setNowRides((prev) => prev.filter((r) => r._id !== bookingId));
            if (bookingId) {
                router.push({ pathname: '/active_ride', params: { bookingId } });
            }
        });

        socket.on('offer_rejected', (payload) => {
            if (payload.driverId !== user._id) return;
            setOfferModalVisible(false);
            setSelectedRide(null);
            Alert.alert('Offer Declined', 'The customer has declined your offer.');
        });

        // Booking removed (cancelled / expired / accepted by someone else)
        const handleBookingRemoved = (payload: { bookingId: string; bookingType?: string; status?: string }) => {
            const id = (payload as any)._id || payload.bookingId;
            setNowRides((prev) => prev.filter((r) => r._id !== id));
            setScheduledRides((prev) => prev.filter((r) => r._id !== id));
            setOfferedBookingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
            setSelectedRide((cur) => {
                if (cur?._id === id) { setOfferModalVisible(false); return null; }
                return cur;
            });
            if (Platform.OS === 'android') {
                ToastAndroid.showWithGravity('Customer cancelled the request.', ToastAndroid.LONG, ToastAndroid.BOTTOM);
            }
        };

        socket.on('booking_deleted', handleBookingRemoved);
        socket.on('booking_cancelled', handleBookingRemoved);
        socket.on('booking_request_cancelled', handleBookingRemoved);
        socket.on('booking_request_deleted', handleBookingRemoved);
        socket.on('booking_status_updated', (payload) => {
            if (payload.status === 'cancelled' || payload.status === 'accepted') {
                handleBookingRemoved(payload as any);
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

    // ── Recenter ──────────────────────────────────────────────────────────────
    const handleRecenter = useCallback(async () => {
        try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const region: Region = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.06,
                longitudeDelta: 0.06,
            };
            setDriverRegion(region);
            mapRef.current?.animateToRegion(region, 600);
        } catch { /* GPS unavailable */ }
    }, []);

    // ── Fit map to visible tab's markers ─────────────────────────────────────
    const visibleRides = activeTab === 'now' ? nowRides : scheduledRides;
    useEffect(() => {
        if (visibleRides.length === 0 || !mapRef.current) return;
        const coords = visibleRides.map((r) => ({
            latitude: r.pickupLocation.latitude,
            longitude: r.pickupLocation.longitude,
        }));
        if (driverRegion) coords.push({ latitude: driverRegion.latitude, longitude: driverRegion.longitude });
        mapRef.current.fitToCoordinates(coords, {
            edgePadding: { top: 80, right: 40, bottom: BOTTOM_SHEET_MIN_HEIGHT + 40, left: 40 },
            animated: true,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleRides]);

    // ── driver_now offer callbacks ────────────────────────────────────────────
    const handleMakeOffer = useCallback((booking: Booking) => {
        setSelectedRide(booking);
        setOfferModalVisible(true);
    }, []);

    const handleOfferSubmitted = useCallback((updatedBooking: Booking) => {
        setOfferedBookingIds((prev) => new Set([...prev, updatedBooking._id]));
        setOfferModalVisible(false);
        setSelectedRide(null);
        if (Platform.OS === 'android') {
            ToastAndroid.showWithGravity('✅ Offer sent! Waiting for customer response.', ToastAndroid.LONG, ToastAndroid.BOTTOM);
        }
    }, []);

    const handleCloseModal = useCallback(() => {
        setOfferModalVisible(false);
        setSelectedRide(null);
    }, []);

    // ── schedule_driver direct-accept ────────────────────────────────────────
    const handleAcceptScheduled = useCallback(async (booking: Booking) => {
        setAcceptingId(booking._id);
        try {
            const accepted = await acceptScheduledBookingApi(booking._id);
            // Remove from scheduled list and navigate to active ride
            setScheduledRides((prev) => prev.filter((r) => r._id !== booking._id));
            router.push({ pathname: '/active_ride', params: { bookingId: accepted._id } });
        } catch (err) {
            Alert.alert('Could not accept', err instanceof Error ? err.message : 'Please try again.');
        } finally {
            setAcceptingId(null);
        }
    }, [router]);

    // ── Render helpers ────────────────────────────────────────────────────────
    const renderNowCard = useCallback(
        ({ item }: { item: Booking }) => (
            <RideCard
                booking={item}
                hasOffered={offeredBookingIds.has(item._id)}
                onMakeOffer={handleMakeOffer}
            />
        ),
        [handleMakeOffer, offeredBookingIds],
    );

    const renderScheduledCard = useCallback(
        ({ item }: { item: Booking }) => (
            <ScheduledRideCard
                booking={item}
                onAccept={handleAcceptScheduled}
                isAccepting={acceptingId === item._id}
            />
        ),
        [handleAcceptScheduled, acceptingId],
    );

    const renderEmpty = (isLoading: boolean, isScheduledTab: boolean) => {
        if (isLoading) {
            return (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={Colors.light.primary} />
                    <Text style={[styles.emptySubtitle, { marginTop: 12 }]}>Loading…</Text>
                </View>
            );
        }
        return (
            <View style={styles.centerContent}>
                <Ionicons
                    name={isScheduledTab ? 'calendar-outline' : 'car-outline'}
                    size={52}
                    color={Colors.light.secondaryText}
                    style={styles.emptyIcon}
                />
                <Text style={styles.emptyTitle}>
                    {isScheduledTab ? 'No scheduled rides' : 'No rides available'}
                </Text>
                <Text style={styles.emptySubtitle}>
                    {isScheduledTab
                        ? 'Scheduled requests will appear here.'
                        : 'New requests will appear here automatically.\nPull down to refresh manually.'}
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
                onRegionChangeComplete={() => { if (driverRegion !== null) setDriverRegion(null); }}
            >
                {visibleRides.map((ride) => (
                    <Marker
                        key={ride._id}
                        coordinate={{ latitude: ride.pickupLocation.latitude, longitude: ride.pickupLocation.longitude }}
                        onPress={() => activeTab === 'now' ? handleMakeOffer(ride) : handleAcceptScheduled(ride)}
                        tracksViewChanges={false}
                    >
                        <View style={styles.markerCallout}>
                            <Text style={styles.markerFare}>{formatFare(ride.estimatedFare)}</Text>
                            <Text style={styles.markerAddress} numberOfLines={1}>
                                {ride.pickupLocation.address.split(',')[0]}
                            </Text>
                        </View>
                    </Marker>
                ))}
            </MapView>

            {/* Header overlay */}
            <View style={styles.headerOverlay}>
                <TouchableOpacity style={styles.menuButton} onPress={() => (drawerNav as any).openDrawer()}>
                    <Ionicons name="menu" size={22} color={Colors.light.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.recenterButton} onPress={handleRecenter}>
                    <Ionicons name="locate" size={20} color={Colors.light.primary} />
                </TouchableOpacity>
            </View>

            {/* Bottom sheet */}
            <DraggableBottomSheet
                ref={sheetRef}
                snapPoints={[0.48, 0.72, 0.92]}
                initialSnap={0}
                backgroundColor={Colors.light.background}
            >
                {/* ── Tab bar ── */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'now' && styles.tabItemActive]}
                        onPress={() => setActiveTab('now')}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="flash"
                            size={15}
                            color={activeTab === 'now' ? Colors.light.primary : Colors.light.secondaryText}
                        />
                        <Text style={[styles.tabLabel, activeTab === 'now' && styles.tabLabelActive]}>
                            Ride Now
                        </Text>
                        {nowRides.length > 0 && (
                            <View style={styles.tabBadge}>
                                <Text style={styles.tabBadgeText}>{nowRides.length}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'scheduled' && styles.tabItemActive]}
                        onPress={() => setActiveTab('scheduled')}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="calendar-outline"
                            size={15}
                            color={activeTab === 'scheduled' ? Colors.light.primary : Colors.light.secondaryText}
                        />
                        <Text style={[styles.tabLabel, activeTab === 'scheduled' && styles.tabLabelActive]}>
                            Scheduled
                        </Text>
                        {scheduledRides.length > 0 && (
                            <View style={styles.tabBadge}>
                                <Text style={styles.tabBadgeText}>{scheduledRides.length}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ── Ride Now list ── */}
                {activeTab === 'now' && (
                    <FlatList
                        data={nowRides}
                        keyExtractor={(item) => item._id}
                        renderItem={renderNowCard}
                        contentContainerStyle={styles.rideList}
                        ListEmptyComponent={() => renderEmpty(isLoadingNow, false)}
                        refreshing={isLoadingNow}
                        onRefresh={fetchNowRides}
                        showsVerticalScrollIndicator={false}
                    />
                )}

                {/* ── Scheduled list ── */}
                {activeTab === 'scheduled' && (
                    <FlatList
                        data={scheduledRides}
                        keyExtractor={(item) => item._id}
                        renderItem={renderScheduledCard}
                        contentContainerStyle={styles.rideList}
                        ListEmptyComponent={() => renderEmpty(isLoadingScheduled, true)}
                        refreshing={isLoadingScheduled}
                        onRefresh={fetchScheduledRides}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </DraggableBottomSheet>

            {/* Offer modal (driver_now only) */}
            <OfferModal
                visible={offerModalVisible}
                booking={selectedRide}
                onClose={handleCloseModal}
                onOfferSubmitted={handleOfferSubmitted}
            />
        </View>
    );
}
