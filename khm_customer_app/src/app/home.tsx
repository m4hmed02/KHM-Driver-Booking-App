import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, ScrollView, StyleSheet, Dimensions, ActivityIndicator, Linking, AppState, Alert, Animated, Image } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Location from 'expo-location';
import { LocationInputCard } from '../components/LocationInputCard';
import { DraggableBottomSheet, DraggableBottomSheetRef } from '../components/DraggableBottomSheet';
import { useStyles } from '../styles/locationpicker.styles';
import { useTheme } from '../hooks/use-theme';
import { Colors } from '../constants/theme';
import { useRouter, useNavigation } from 'expo-router';
import { useRoute } from '../hooks/useRoute';
import { calculateFareApi } from '../services/apis/fares/fareService';
import { CalculateFareResponse } from '../services/apis/fares/type';
import { createBookingApi, updateBookingStatusApi, getBookingStatusApi, acceptDriverOfferApi, rejectDriverOfferApi } from '../services/apis/booking/bookingService';
import { Booking, Offer } from '../services/apis/booking/type';

const getAvatarUrl = (path?: string | null) => {
    if (!path) return 'https://ui-avatars.com/api/?name=Driver&background=random';
    if (path.startsWith('http')) return path;
    const baseUrl = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Home() {
    const styles = useStyles();
    const theme = useTheme();
    const router = useRouter();
    const navigation = useNavigation();
    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');
    const [pickupCoordinate, setPickupCoordinate] = useState<{latitude: number, longitude: number} | null>(null);
    const [dropoffCoordinate, setDropoffCoordinate] = useState<{latitude: number, longitude: number} | null>(null);

    const [scheduleType, setScheduleType] = useState<'now' | 'schedule'>('now');
    const [scheduleDate, setScheduleDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isGpsEnabled, setIsGpsEnabled] = useState(true);
    const [isLocationLoading, setIsLocationLoading] = useState(true);
    
    const [focusedInput, setFocusedInput] = useState<'pickup' | 'dropoff' | null>(null);

    const { fetchRoute, routeCoordinates, distance, duration, isLoading: isRouteLoading } = useRoute();

    const [fareResult, setFareResult] = useState<CalculateFareResponse | null>(null);
    const [isFareLoading, setIsFareLoading] = useState(false);
    const [fareError, setFareError] = useState<string | null>(null);
    const [fareAdjustment, setFareAdjustment] = useState(0);

    const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
    const [isRequestingRide, setIsRequestingRide] = useState(false);
    const [searchTimedOut, setSearchTimedOut] = useState(false);
    const [searchSecondsLeft, setSearchSecondsLeft] = useState(120);
    const searchProgress = useRef(new Animated.Value(0)).current;
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [pendingOffer, setPendingOffer] = useState<Offer | null>(null);
    const [isOfferLoading, setIsOfferLoading] = useState(false);
    const [offerSecondsLeft, setOfferSecondsLeft] = useState(30);
    const [driverArriving, setDriverArriving] = useState(false);
    const [driverLocation, setDriverLocation] = useState<{latitude: number, longitude: number} | null>(null);
    const [acceptedDriver, setAcceptedDriver] = useState<any | null>(null);
    const [driverArrived, setDriverArrived] = useState(false);
    const [tripInProgress, setTripInProgress] = useState(false);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const offerDropAnim = useRef(new Animated.Value(-220)).current;
    const offerOpacityAnim = useRef(new Animated.Value(0)).current;
    const offerProgressAnim = useRef(new Animated.Value(1)).current;
    // Tracks offer IDs that are currently being shown or were auto-expired.
    // Entries are deleted after 30 s so the driver can re-offer with a new _id.
    const shownOfferIds = useRef<Set<string>>(new Set());
    const offerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const offerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const mapRef = useRef<MapView>(null);
    const sheetRef = useRef<DraggableBottomSheetRef>(null);

    const [initialRegion, setInitialRegion] = useState<{latitude: number, longitude: number, latitudeDelta: number, longitudeDelta: number} | null>(null);

    const defaultRegion = {
        latitude: 25.1972,
        longitude: 55.2744,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    };

    const isButtonDisabled = !pickup.trim() || !dropoff.trim();

    useEffect(() => {
        const fetchLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setIsGpsEnabled(false);
                    setInitialRegion(defaultRegion);
                    setIsLocationLoading(false);
                    return;
                }
                const enabled = await Location.hasServicesEnabledAsync();
                setIsGpsEnabled(enabled);

                if (enabled) {
                    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    const newRegion = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    };
                    setInitialRegion(newRegion);
                } else {
                    setInitialRegion(defaultRegion);
                }
            } catch (error) {
                console.warn('Error fetching location', error);
                setIsGpsEnabled(false);
                setInitialRegion(defaultRegion);
            } finally {
                setIsLocationLoading(false);
            }
        };
        fetchLocation();

        // When the user returns from Settings (app comes to foreground), re-fetch location
        const appStateListener = AppState.addEventListener('change', async (nextState) => {
            if (nextState === 'active') {
                try {
                    const { status } = await Location.getForegroundPermissionsAsync();
                    if (status !== 'granted') return;
                    const enabled = await Location.hasServicesEnabledAsync();
                    setIsGpsEnabled(enabled);
                    if (enabled) {
                        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        const newRegion = {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        };
                        setInitialRegion(newRegion);
                        // Animate to the new live location
                        const bottomSheetFraction = 0.52;
                        const latOffset = (newRegion.latitudeDelta / 2) * ((SCREEN_HEIGHT * (1 - bottomSheetFraction)) / SCREEN_HEIGHT) * 0.5;
                        mapRef.current?.animateCamera({
                            center: {
                                latitude: newRegion.latitude - latOffset,
                                longitude: newRegion.longitude,
                            },
                            zoom: 14,
                        }, { duration: 800 });
                    }
                } catch (error) {
                    console.warn('Error re-fetching location on app focus', error);
                }
            }
        });

        const checkGps = async () => {
            try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setIsGpsEnabled(false);
                    return;
                }
                const enabled = await Location.hasServicesEnabledAsync();
                setIsGpsEnabled(enabled);
            } catch (error) {
                console.warn('Error checking GPS status', error);
            }
        };
        checkGps();
        const interval = setInterval(checkGps, 5000);
        return () => {
            clearInterval(interval);
            appStateListener.remove();
        };
    }, []);

    // Animate map to show marker at top-center when initialRegion is set
    useEffect(() => {
        if (!isLocationLoading && initialRegion && mapRef.current) {
            // Offset the camera center southward so the marker appears in the top portion,
            // with the bottom sheet occupying the lower 52% of the screen.
            const bottomSheetFraction = 0.52;
            const visibleMapHeight = SCREEN_HEIGHT * (1 - bottomSheetFraction);
            // 1 degree latitude ≈ 111,320 meters; adjust based on zoom/delta
            const latOffset = (initialRegion.latitudeDelta / 2) * (visibleMapHeight / SCREEN_HEIGHT) * 0.5;

            mapRef.current.animateCamera({
                center: {
                    latitude: initialRegion.latitude - latOffset,
                    longitude: initialRegion.longitude,
                },
                zoom: 14,
            }, { duration: 800 });
        }
    }, [isLocationLoading, initialRegion]);

    useEffect(() => {
        if (pickupCoordinate && dropoffCoordinate) {
            fetchRoute(pickupCoordinate, dropoffCoordinate);
            // Reset fare when locations change
            setFareResult(null);
            setFareError(null);
            setFareAdjustment(0);
        }
    }, [pickupCoordinate, dropoffCoordinate, fetchRoute]);

    useEffect(() => {
        if (pickupCoordinate && dropoffCoordinate && routeCoordinates.length > 0 && mapRef.current) {
            // Snap sheet to the smallest height (index 0)
            sheetRef.current?.snapToIndex(0);

            // Fit map to show both markers and the route, adding bottom padding to avoid the bottom sheet
            mapRef.current.fitToCoordinates(
                [pickupCoordinate, dropoffCoordinate, ...routeCoordinates],
                {
                    edgePadding: {
                        top: 100,
                        right: 50,
                        bottom: (SCREEN_HEIGHT * 0.52) + 50, // 0.52 is the lowest snap point of the bottom sheet
                        left: 50,
                    },
                    animated: true,
                }
            );
        }
    }, [routeCoordinates, pickupCoordinate, dropoffCoordinate]);

    // Calculate fare once the route is drawn and we have distance + duration.
    // Intentionally NOT including routeCoordinates in deps — we key off the scalar
    // distance/duration values so we don't re-run on every array reference change.
    useEffect(() => {
        if (!isRouteLoading && distance !== null && duration !== null && distance > 0) {
            const distanceKm = distance / 1000;
            // Google Routes API returns duration as "123s" — parse the numeric seconds
            const durationSecs = parseFloat(duration.replace('s', ''));
            const durationMins = durationSecs / 60;

            const calculate = async () => {
                setIsFareLoading(true);
                setFareError(null);
                try {
                    const result = await calculateFareApi({ distanceKm, durationMins });
                    setFareResult(result);
                } catch (err) {
                    setFareError(err instanceof Error ? err.message : 'Failed to calculate fare');
                } finally {
                    setIsFareLoading(false);
                }
            };
            calculate();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRouteLoading, distance, duration]);

    const handleAcceptOffer = async () => {
        if (!activeBooking || !pendingOffer) return;
        setIsOfferLoading(true);
        try {
            await acceptDriverOfferApi(activeBooking._id, (pendingOffer.driver as any)._id ?? pendingOffer.driver);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setActiveBooking({ ...activeBooking, status: 'accepted' });
            
            setAcceptedDriver(pendingOffer.driver);
            if (pickupCoordinate) {
                 const dLoc = {
                     latitude: pickupCoordinate.latitude - 0.005,
                     longitude: pickupCoordinate.longitude - 0.005
                 };
                 setDriverLocation(dLoc);
                 fetchRoute(dLoc, pickupCoordinate);
            }
            setDriverArriving(true);
            setPendingOffer(null);
            
            if (offerTimerRef.current) clearTimeout(offerTimerRef.current);
            if (offerIntervalRef.current) clearInterval(offerIntervalRef.current);
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
            if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);
        } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not accept offer.');
        } finally {
            setIsOfferLoading(false);
        }
    };

    // Mock driver movement removed as requested - driver stays static for now
    useEffect(() => {
        if ((driverArriving || tripInProgress) && driverLocation) {
            const target = tripInProgress ? dropoffCoordinate : pickupCoordinate;
            if (target) {
                mapRef.current?.fitToCoordinates(
                    [target, driverLocation],
                    { edgePadding: { top: 100, right: 50, bottom: (SCREEN_HEIGHT * 0.3) + 50, left: 50 }, animated: true }
                );
            }
        }
    }, [driverArriving, tripInProgress, pickupCoordinate, dropoffCoordinate, driverLocation]);

    const handleRejectOffer = async () => {
        if (!activeBooking || !pendingOffer) return;
        setIsOfferLoading(true);
        if (offerTimerRef.current) clearTimeout(offerTimerRef.current);
        if (offerIntervalRef.current) clearInterval(offerIntervalRef.current);
        try {
            await rejectDriverOfferApi(activeBooking._id, (pendingOffer.driver as any)._id ?? pendingOffer.driver);
            setPendingOffer(null);
        } catch {
            setPendingOffer(null);
        } finally {
            setIsOfferLoading(false);
        }
    };

    const handleRequestRide = async () => {
        if (!pickupCoordinate || !dropoffCoordinate || !pickup || !dropoff) return;
        const estimatedFare = fareResult
            ? Math.max(0, fareResult.recommendedFare + fareAdjustment)
            : 0;

        setIsRequestingRide(true);
        try {
            const booking = await createBookingApi({
                pickupLocation: {
                    address: pickup,
                    latitude: pickupCoordinate.latitude,
                    longitude: pickupCoordinate.longitude,
                },
                dropoffLocation: {
                    address: dropoff,
                    latitude: dropoffCoordinate.latitude,
                    longitude: dropoffCoordinate.longitude,
                },
                bookingType: scheduleType === 'schedule' ? 'schedule_driver' : 'driver_now',
                scheduledTime: scheduleType === 'schedule' ? scheduleDate.toISOString() : undefined,
                estimatedFare,
            });
            setActiveBooking(booking);
            // Collapse the bottom sheet so the map is visible
            sheetRef.current?.snapToIndex(0);
        } catch (err) {
            Alert.alert(
                'Request Failed',
                err instanceof Error ? err.message : 'Could not send ride request. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsRequestingRide(false);
        }
    };

    const handleCancelRide = async () => {
        if (!activeBooking) return;
        try {
            await updateBookingStatusApi(activeBooking._id, 'cancelled');
        } catch { /* best-effort */ }
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (offerTimerRef.current) clearTimeout(offerTimerRef.current);
        if (offerIntervalRef.current) clearInterval(offerIntervalRef.current);
        shownOfferIds.current.clear();
        setActiveBooking(null);
        setFareResult(null);
        setFareAdjustment(0);
        setSearchTimedOut(false);
        setPendingOffer(null);
    };

    // 60-second search progress bar
    useEffect(() => {
        if (activeBooking) {
            setSearchTimedOut(false);
            setSearchSecondsLeft(120);
            searchProgress.setValue(1);
            Animated.timing(searchProgress, {
                toValue: 0,
                duration: 120000,
                useNativeDriver: false,
            }).start(({ finished }) => {
                if (finished) setSearchTimedOut(true);
            });
            searchTimerRef.current = setTimeout(() => setSearchTimedOut(true), 120000);
            searchIntervalRef.current = setInterval(() => {
                setSearchSecondsLeft(s => {
                    if (s <= 1) {
                        if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);
                        return 0;
                    }
                    return s - 1;
                });
            }, 1000);
        } else {
            searchProgress.stopAnimation();
            searchProgress.setValue(0);
            setSearchTimedOut(false);
            setSearchSecondsLeft(120);
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
            if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);
        }
        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
            if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);
        };
    }, [activeBooking]);

    // Water-drop entrance animation for the offer card
    useEffect(() => {
        if (pendingOffer) {
            // Reset & start the 30-second offer progress bar
            offerProgressAnim.setValue(1);
            setOfferSecondsLeft(30);
            Animated.timing(offerProgressAnim, {
                toValue: 0,
                duration: 30000,
                useNativeDriver: false,
            }).start();

            // Drop-in animation
            offerDropAnim.setValue(-220);
            offerOpacityAnim.setValue(0);
            Animated.parallel([
                Animated.spring(offerDropAnim, {
                    toValue: 0,
                    bounciness: 14,
                    speed: 10,
                    useNativeDriver: true,
                }),
                Animated.timing(offerOpacityAnim, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Slide back up quickly when dismissed
            offerProgressAnim.stopAnimation();
            Animated.parallel([
                Animated.timing(offerDropAnim, {
                    toValue: -220,
                    duration: 220,
                    useNativeDriver: true,
                }),
                Animated.timing(offerOpacityAnim, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [pendingOffer]);

    // Poll booking status every 4 s to catch incoming driver offers
    useEffect(() => {
        if (!activeBooking) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setPendingOffer(null);
            return;
        }

        const showOffer = (offer: Offer) => {
            const offerId = offer._id;
            // Skip if already showing or recently expired
            if (shownOfferIds.current.has(offerId)) return;
            shownOfferIds.current.add(offerId);

            setPendingOffer(offer);
            setOfferSecondsLeft(30);

            // Countdown tick
            if (offerIntervalRef.current) clearInterval(offerIntervalRef.current);
            offerIntervalRef.current = setInterval(() => {
                setOfferSecondsLeft(s => {
                    if (s <= 1) {
                        if (offerIntervalRef.current) clearInterval(offerIntervalRef.current);
                        return 0;
                    }
                    return s - 1;
                });
            }, 1000);

            // Auto-expire after 30 s
            if (offerTimerRef.current) clearTimeout(offerTimerRef.current);
            offerTimerRef.current = setTimeout(async () => {
                try {
                    if (activeBooking) {
                        const driverId = typeof offer.driver !== 'string'
                            ? (offer.driver as any)._id
                            : offer.driver;
                        await rejectDriverOfferApi(activeBooking._id, driverId);
                    }
                } catch { /* best-effort */ }
                setPendingOffer(prev => prev?._id === offerId ? null : prev);
                if (offerIntervalRef.current) clearInterval(offerIntervalRef.current);
                // Remove from shownOfferIds after the cooldown window so the same
                // offer _id won't be re-shown if the poll still returns it briefly
                setTimeout(() => shownOfferIds.current.delete(offerId), 5000);
            }, 30000);
        };

        const poll = async () => {
            try {
                const updated = await getBookingStatusApi(activeBooking._id);
                const incoming = updated.offers?.find(o => o.status === 'pending') ?? null;
                if (incoming) {
                    showOffer(incoming);
                }
            } catch {
                // silently ignore poll errors
            }
        };

        poll();
        pollIntervalRef.current = setInterval(poll, 4000);

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (offerTimerRef.current) clearTimeout(offerTimerRef.current);
            if (offerIntervalRef.current) clearInterval(offerIntervalRef.current);
        };
    }, [activeBooking]);

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (selectedDate) {
            const d = new Date(scheduleDate);
            d.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            setScheduleDate(d);
        }
    };

    const handleTimeChange = (event: any, selectedTime?: Date) => {
        if (Platform.OS === 'android') setShowTimePicker(false);
        if (selectedTime) {
            const d = new Date(scheduleDate);
            d.setHours(selectedTime.getHours(), selectedTime.getMinutes());
            setScheduleDate(d);
        }
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            {isLocationLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={{ marginTop: 16, fontSize: 15, color: theme.secondaryText, fontWeight: '500' }}>
                        Finding your location...
                    </Text>
                </View>
            ) : (
            <View style={{ flex: 1 }}>
                {/* Drawer Menu Button */}
                <TouchableOpacity
                    style={{
                        position: 'absolute',
                        top: Platform.OS === 'ios' ? 60 : 40,
                        left: 20,
                        zIndex: 1000,
                        backgroundColor: theme.background,
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 6,
                        elevation: 5,
                    }}
                    onPress={() => (navigation as any).toggleDrawer()}
                >
                    <Ionicons name="menu" size={28} color={theme.text} />
                </TouchableOpacity>

                {/* ── DRIVER OFFER CARD — top overlay with water-drop animation ── */}
                {(pendingOffer || offerOpacityAnim) && (
                    <Animated.View
                        pointerEvents={pendingOffer ? 'auto' : 'none'}
                        style={{
                            position: 'absolute',
                            top: Platform.OS === 'ios' ? 56 : 36,
                            left: 16,
                            right: 16,
                            zIndex: 2000,
                            opacity: offerOpacityAnim,
                            transform: [{ translateY: offerDropAnim }],
                        }}
                    >
                        <View style={{
                            borderRadius: 16,
                            backgroundColor: Colors.light.background,
                            borderWidth: 1.5,
                            borderColor: Colors.light.primary,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.18,
                            shadowRadius: 16,
                            elevation: 14,
                            overflow: 'hidden',
                        }}>
                            {/* Green accent strip */}
                            <View style={{ height: 4, backgroundColor: Colors.light.primary }} />

                            <View style={{ padding: 16 }}>
                                {/* "Driver offer" label + countdown */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.light.primaryDark, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                        Driver Offer
                                    </Text>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.light.primary, fontVariant: ['tabular-nums'] }}>
                                        {offerSecondsLeft}s
                                    </Text>
                                </View>

                                {/* Offer progress bar — drains from full to empty in 30 s */}
                                <View style={{
                                    height: 4,
                                    backgroundColor: Colors.light.border,
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    marginBottom: 14,
                                }}>
                                    <Animated.View style={{
                                        height: '100%',
                                        borderRadius: 2,
                                        backgroundColor: Colors.light.primary,
                                        width: offerProgressAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0%', '100%'],
                                        }),
                                    }} />
                                </View>

                                {/* Driver info row */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                    {pendingOffer && typeof pendingOffer.driver !== 'string' ? (
                                        <Image
                                            source={{ uri: getAvatarUrl(pendingOffer.driver.avatar) }}
                                            style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.light.border }}
                                        />
                                    ) : (
                                        <View style={{
                                            width: 54, height: 54, borderRadius: 27,
                                            backgroundColor: Colors.light.success,
                                            justifyContent: 'center', alignItems: 'center',
                                        }}>
                                            <Ionicons name="person" size={28} color={Colors.light.primaryDark} />
                                        </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.light.text }}>
                                            {pendingOffer && typeof pendingOffer.driver !== 'string'
                                                ? pendingOffer.driver.name
                                                : 'Driver'}
                                        </Text>
                                        {pendingOffer && typeof pendingOffer.driver !== 'string' && pendingOffer.driver.rating != null && (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                                                <Ionicons name="star" size={13} color={Colors.light.amber} />
                                                <Text style={{ fontSize: 13, color: Colors.light.secondaryText, fontWeight: '500' }}>
                                                    {pendingOffer.driver.rating.toFixed(1)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    {/* Fare badge */}
                                    <View style={{
                                        backgroundColor: Colors.light.success,
                                        borderRadius: 10,
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                        alignItems: 'center',
                                    }}>
                                        <Text style={{ fontSize: 11, color: Colors.light.primaryDark, fontWeight: '500', marginBottom: 1 }}>Offer</Text>
                                        <Text style={{ fontSize: 20, fontWeight: '800', color: Colors.light.primaryDark, letterSpacing: -0.5 }}>
                                            AED {pendingOffer?.fare.toFixed(2) ?? '—'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Accept / Decline buttons */}
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity
                                        onPress={handleRejectOffer}
                                        disabled={isOfferLoading}
                                        activeOpacity={0.8}
                                        style={{
                                            flex: 1, height: 46, borderRadius: 12,
                                            borderWidth: 1.5, borderColor: Colors.light.red,
                                            justifyContent: 'center', alignItems: 'center',
                                        }}
                                    >
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.light.red }}>Decline</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleAcceptOffer}
                                        disabled={isOfferLoading}
                                        activeOpacity={0.8}
                                        style={{
                                            flex: 1, height: 46, borderRadius: 12,
                                            backgroundColor: Colors.light.primary,
                                            justifyContent: 'center', alignItems: 'center',
                                        }}
                                    >
                                        {isOfferLoading ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Accept</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {!isGpsEnabled && (
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                            if (Platform.OS === 'ios') {
                                Linking.openURL('App-Prefs:Privacy&path=LOCATION');
                            } else {
                                Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
                            }
                        }}
                        style={{
                            position: 'absolute',
                            top: Platform.OS === 'ios' ? 50 : 30,
                            left: 16,
                            right: 16,
                            backgroundColor: '#FEF08A',
                            padding: 12,
                            borderRadius: 8,
                            zIndex: 1000,
                            flexDirection: 'row',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.12,
                            shadowRadius: 4,
                            elevation: 4,
                        }}
                    >
                        <Ionicons name="warning" size={22} color="#A16207" style={{ marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#A16207', fontWeight: '700', fontSize: 13 }}>
                                GPS / Location is turned off
                            </Text>
                            <Text style={{ color: '#A16207', fontSize: 12, marginTop: 2 }}>
                                Tap here to open Location Settings and enable it.
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#A16207" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                )}
                <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={initialRegion || defaultRegion} showsUserLocation={true}>
                    {routeCoordinates.length > 0 && (
                        <Polyline coordinates={routeCoordinates} strokeWidth={6} strokeColor="#000000" />
                    )}
                    {(driverArriving || tripInProgress) && driverLocation && (
                        <Marker coordinate={driverLocation}>
                            <View style={{
                                backgroundColor: '#FFFFFF',
                                width: 36, height: 36, borderRadius: 18,
                                elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
                                justifyContent: 'center', alignItems: 'center',
                                borderWidth: 2, borderColor: theme.primary,
                            }}>
                                <Ionicons name="car" size={20} color={theme.primaryDark} />
                            </View>
                        </Marker>
                    )}
                    {(pickupCoordinate || (pickup === '' && initialRegion)) && (
                        <Marker coordinate={pickupCoordinate || initialRegion!}>
                            <View style={{ alignItems: 'center' }}>
                                <View style={{
                                    backgroundColor: '#FFFFFF',
                                    width: 40, height: 40, borderRadius: 10,
                                    elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
                                    justifyContent: 'center', alignItems: 'center',
                                    borderWidth: 1.5, borderColor: '#E0E0E0',
                                }}>
                                    <MaterialCommunityIcons name="walk" size={24} color="#000000" />
                                </View>
                                <View style={{ width: 2, height: 14, backgroundColor: '#000000' }} />
                                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#000000' }} />
                            </View>
                        </Marker>
                    )}
                    {(dropoffCoordinate || (dropoff === '' && initialRegion)) && (
                        <Marker coordinate={dropoffCoordinate || initialRegion!}>
                            <View style={{ alignItems: 'center' }}>
                                <View style={{
                                    backgroundColor: '#FFFFFF',
                                    width: 40, height: 40, borderRadius: 10,
                                    elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
                                    justifyContent: 'center', alignItems: 'center',
                                    borderWidth: 1.5, borderColor: '#E0E0E0',
                                }}>
                                    <MaterialCommunityIcons name="flag-checkered" size={22} color="#000000" />
                                </View>
                                <View style={{ width: 2, height: 14, backgroundColor: '#000000' }} />
                                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#000000' }} />
                            </View>
                        </Marker>
                    )}
                </MapView>

                {!activeBooking && (
                <DraggableBottomSheet
                    ref={sheetRef}
                    snapPoints={[0.52, 0.65, 0.75]}
                    initialSnap={0}
                    backgroundColor={theme.background}
                >
                    <ScrollView
                        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <LocationInputCard
                            pickupLocation={pickup}
                            setPickupLocation={setPickup}
                            setPickupCoordinate={setPickupCoordinate}
                            dropoffLocation={dropoff}
                            setDropoffLocation={setDropoff}
                            setDropoffCoordinate={setDropoffCoordinate}
                            onInputFocus={() => sheetRef.current?.snapToIndex(2)}
                            onFocusChange={setFocusedInput}
                        />

                        {/* Fare card — shown when both locations are set */}
                        {!focusedInput && pickupCoordinate && dropoffCoordinate && (
                            <View style={{
                                marginTop: 16,
                                borderRadius: 14,
                                borderWidth: 1,
                                borderColor: theme.border,
                                backgroundColor: theme.background,
                                overflow: 'hidden',
                            }}>
                                {(isRouteLoading || isFareLoading) ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 }}>
                                        <ActivityIndicator size="small" color={theme.primary} />
                                        <Text style={{ fontSize: 14, color: theme.secondaryText, fontWeight: '500' }}>
                                            {isRouteLoading ? 'Drawing route…' : 'Calculating fare…'}
                                        </Text>
                                    </View>
                                ) : fareError ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 10 }}>
                                        <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
                                        <Text style={{ fontSize: 13, color: '#EF4444', flex: 1 }}>{fareError}</Text>
                                    </View>
                                ) : fareResult ? (
                                    <View>
                                        {/* Header row */}
                                        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <MaterialCommunityIcons name="car-outline" size={18} color={theme.primaryDark} />
                                                <Text style={{ fontSize: 13, color: theme.secondaryText, fontWeight: '500', textTransform: 'capitalize' }}>
                                                    {fareResult.vehicleType}
                                                </Text>
                                                <View style={{ flex: 1 }} />
                                                {fareResult.distanceKm != null && (
                                                    <Text style={{ fontSize: 12, color: theme.secondaryText }}>
                                                        {fareResult.distanceKm.toFixed(1)} km
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        {/* Fare + adjustment row */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
                                            {/* − button */}
                                            <TouchableOpacity
                                                onPress={() => setFareAdjustment(a => Math.max(0, a - 5))}
                                                activeOpacity={0.75}
                                                style={{
                                                    width: 36, height: 36, borderRadius: 18,
                                                    backgroundColor: fareAdjustment <= 0 ? theme.border : theme.primary,
                                                    justifyContent: 'center', alignItems: 'center',
                                                }}
                                            >
                                                <Ionicons name="remove" size={20} color={fareAdjustment <= 0 ? theme.secondaryText : '#FFFFFF'} />
                                            </TouchableOpacity>

                                            {/* Centre: fare amount */}
                                            <View style={{ flex: 1, alignItems: 'center' }}>
                                                <Text style={{ fontSize: 26, fontWeight: '700', color: theme.text, letterSpacing: -0.5 }}>
                                                    AED {Math.max(0, fareResult.recommendedFare + fareAdjustment).toFixed(2)}
                                                </Text>
                                            </View>

                                            {/* + button */}
                                            <TouchableOpacity
                                                onPress={() => setFareAdjustment(a => a + 5)}
                                                activeOpacity={0.75}
                                                style={{
                                                    width: 36, height: 36, borderRadius: 18,
                                                    backgroundColor: theme.primary,
                                                    justifyContent: 'center', alignItems: 'center',
                                                }}
                                            >
                                                <Ionicons name="add" size={20} color="#FFFFFF" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : null}
                            </View>
                        )}

                        {!focusedInput && (
                            <View style={{ marginTop: 24, marginBottom: 4, gap: 12 }}>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: scheduleType === 'now' ? theme.primary : theme.border, backgroundColor: scheduleType === 'now' ? theme.success : theme.background, gap: 16 }}
                                activeOpacity={0.7}
                                onPress={() => {
                                    setScheduleType('now');
                                    // Snap sheet back down when switching away from schedule
                                    sheetRef.current?.snapToIndex(0);
                                }}
                            >
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: scheduleType === 'now' ? '#D5F0D9' : '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
                                    <Ionicons name="flash" size={20} color={scheduleType === 'now' ? theme.primaryDark : theme.icon} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, color: theme.text, fontWeight: '600', marginBottom: 4 }}>Driver Now</Text>
                                    <Text style={{ fontSize: 13, color: theme.secondaryText, lineHeight: 18 }}>Quickest arrival. Nearest available driver will be assigned immediately.</Text>
                                </View>
                                <Ionicons name={scheduleType === 'now' ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={scheduleType === 'now' ? theme.primary : '#D1D5DB'} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: scheduleType === 'schedule' ? theme.primary : theme.border, backgroundColor: scheduleType === 'schedule' ? theme.success : theme.background, gap: 16 }}
                                activeOpacity={0.7}
                                onPress={() => {
                                    setScheduleType('schedule');
                                    // Snap up the bottom sheet slightly so the date/time selectors are visible
                                    sheetRef.current?.snapToIndex(1);
                                }}
                            >
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: scheduleType === 'schedule' ? '#D5F0D9' : '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
                                    <MaterialCommunityIcons name="calendar-clock" size={20} color={scheduleType === 'schedule' ? theme.primaryDark : theme.icon} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, color: theme.text, fontWeight: '600', marginBottom: 4 }}>Schedule Driver</Text>
                                    <Text style={{ fontSize: 13, color: theme.secondaryText, lineHeight: 18 }}>Book for later. Guarantee a driver for a specific date and time.</Text>
                                </View>
                                <Ionicons name={scheduleType === 'schedule' ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={scheduleType === 'schedule' ? theme.primary : '#D1D5DB'} />
                            </TouchableOpacity>

                            {scheduleType === 'schedule' && (
                                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                                    <TouchableOpacity
                                        style={{ flex: 1, height: 48, backgroundColor: theme.background, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border }}
                                        activeOpacity={0.7}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Ionicons name="calendar-outline" size={20} color={theme.icon} />
                                            <Text style={{ fontSize: 14, color: theme.text, fontWeight: '500' }}>{scheduleDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{ flex: 1, height: 48, backgroundColor: theme.background, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border }}
                                        activeOpacity={0.7}
                                        onPress={() => setShowTimePicker(true)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Ionicons name="time-outline" size={20} color={theme.icon} />
                                            <Text style={{ fontSize: 14, color: theme.text, fontWeight: '500' }}>{scheduleDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                        )}

                        {showDatePicker && scheduleType === 'schedule' && (
                            <DateTimePicker value={scheduleDate} mode="date" display="default" onChange={handleDateChange} minimumDate={new Date()} />
                        )}
                        {showTimePicker && scheduleType === 'schedule' && (
                            <DateTimePicker value={scheduleDate} mode="time" display="default" onChange={handleTimeChange} />
                        )}
                    </ScrollView>
                </DraggableBottomSheet>
                )}

                {/* Confirm button — hidden once a booking is active */}
                {!focusedInput && !activeBooking && (
                    <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        paddingHorizontal: 20,
                        paddingBottom: 24,
                        paddingTop: 12,
                        backgroundColor: theme.background,
                        zIndex: 200,
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: theme.border,
                    }}>
                        <TouchableOpacity
                            style={[styles.confirmButton, (isButtonDisabled || isRequestingRide) && styles.confirmButtonDisabled]}
                            activeOpacity={0.8}
                            disabled={isButtonDisabled || isRequestingRide}
                            onPress={handleRequestRide}
                        >
                            {isRequestingRide ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={[styles.confirmButtonText, isButtonDisabled && styles.confirmButtonTextDisabled]}>
                                    {fareResult && !isButtonDisabled
                                        ? `Request Ride — AED ${Math.max(0, fareResult.recommendedFare + fareAdjustment).toFixed(2)}`
                                        : `Confirm ${scheduleType === 'schedule' ? 'Schedule' : 'Locations'}`}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Searching for driver panel — shown after successful booking */}
                {activeBooking && !driverArriving && (
                    <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: Colors.light.background,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        paddingHorizontal: 20,
                        paddingTop: 20,
                        paddingBottom: 36,
                        zIndex: 300,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -3 },
                        shadowOpacity: 0.1,
                        shadowRadius: 10,
                        elevation: 12,
                    }}>

                        {!searchTimedOut ? (
                            /* ── SEARCHING STATE ── */
                            <>
                                {/* Header */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
                                    <ActivityIndicator size="small" color={Colors.light.primary} />
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.light.text }}>
                                        Searching for a driver…
                                    </Text>
                                </View>

                                {/* Timer label + progress bar */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                                    <Text style={{ fontSize: 12, color: Colors.light.secondaryText }}>
                                        Looking for nearby drivers
                                    </Text>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.light.primary, fontVariant: ['tabular-nums'] }}>
                                        {String(Math.floor(searchSecondsLeft / 60)).padStart(2, '0')}:{String(searchSecondsLeft % 60).padStart(2, '0')}
                                    </Text>
                                </View>

                                {/* Progress bar */}
                                <View style={{
                                    height: 6,
                                    backgroundColor: Colors.light.border,
                                    borderRadius: 3,
                                    overflow: 'hidden',
                                    marginBottom: 20,
                                }}>
                                    <Animated.View style={{
                                        height: '100%',
                                        borderRadius: 3,
                                        backgroundColor: Colors.light.primary,
                                        width: searchProgress.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0%', '100%'],
                                        }),
                                    }} />
                                </View>
                            </>
                        ) : (
                            /* ── TIMED OUT STATE ── */
                            <>
                                <View style={{
                                    backgroundColor: Colors.light.success,
                                    borderRadius: 12,
                                    padding: 14,
                                    marginBottom: 16,
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    gap: 10,
                                }}>
                                    <Ionicons name="information-circle-outline" size={20} color={Colors.light.primaryDark} style={{ marginTop: 1 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.light.primaryDark, marginBottom: 3 }}>
                                            No drivers found yet
                                        </Text>
                                        <Text style={{ fontSize: 13, color: Colors.light.primaryDark, lineHeight: 18 }}>
                                            There are fewer drivers available in your area right now. You can raise your fare offer to attract more drivers, or try again in a moment.
                                        </Text>
                                    </View>
                                </View>
                            </>
                        )}

                        {/* Route summary — always visible */}
                        <View style={{
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: Colors.light.border,
                            overflow: 'hidden',
                            marginBottom: 16,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 }}>
                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.light.primary }} />
                                <Text style={{ flex: 1, fontSize: 13, color: Colors.light.text, fontWeight: '500' }} numberOfLines={1}>
                                    {activeBooking.pickupLocation.address}
                                </Text>
                            </View>
                            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: Colors.light.border, marginLeft: 36 }} />
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12 }}>
                                <MaterialCommunityIcons name="flag-checkered" size={14} color={Colors.light.text} />
                                <Text style={{ flex: 1, fontSize: 13, color: Colors.light.text, fontWeight: '500' }} numberOfLines={1}>
                                    {activeBooking.dropoffLocation.address}
                                </Text>
                            </View>
                        </View>

                        {/* Fare offer with +/- — always visible */}
                        <View style={{
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: Colors.light.border,
                            marginBottom: 16,
                            overflow: 'hidden',
                        }}>
                            <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.light.border }}>
                                <Text style={{ fontSize: 12, color: Colors.light.secondaryText, fontWeight: '500' }}>Your fare offer</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
                                <TouchableOpacity
                                    onPress={() => setFareAdjustment(a => Math.max(0, a - 5))}
                                    activeOpacity={0.75}
                                    style={{
                                        width: 36, height: 36, borderRadius: 18,
                                        backgroundColor: fareAdjustment <= 0 ? Colors.light.border : Colors.light.primary,
                                        justifyContent: 'center', alignItems: 'center',
                                    }}
                                >
                                    <Ionicons name="remove" size={20} color={fareAdjustment <= 0 ? Colors.light.secondaryText : '#FFFFFF'} />
                                </TouchableOpacity>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 26, fontWeight: '700', color: Colors.light.text, letterSpacing: -0.5 }}>
                                        AED {Math.max(0, activeBooking.estimatedFare + fareAdjustment).toFixed(2)}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setFareAdjustment(a => a + 5)}
                                    activeOpacity={0.75}
                                    style={{
                                        width: 36, height: 36, borderRadius: 18,
                                        backgroundColor: Colors.light.primary,
                                        justifyContent: 'center', alignItems: 'center',
                                    }}
                                >
                                    <Ionicons name="add" size={20} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Action buttons */}
                        {searchTimedOut ? (
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    onPress={handleCancelRide}
                                    activeOpacity={0.8}
                                    style={{
                                        flex: 1, height: 48, borderRadius: 12,
                                        borderWidth: 1.5, borderColor: Colors.light.red,
                                        justifyContent: 'center', alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.light.red }}>Cancel Ride</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        // Hide the timed-out banner and go back to the
                                        // searching state. The progress bar stays at 0
                                        // and the countdown stays at 00:00 — polling
                                        // continues until the user explicitly cancels.
                                        setSearchTimedOut(false);
                                    }}
                                    activeOpacity={0.8}
                                    style={{
                                        flex: 1, height: 48, borderRadius: 12,
                                        backgroundColor: Colors.light.primary,
                                        justifyContent: 'center', alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Keep Searching</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                onPress={handleCancelRide}
                                activeOpacity={0.8}
                                style={{
                                    height: 48, borderRadius: 12,
                                    borderWidth: 1.5, borderColor: Colors.light.red,
                                    justifyContent: 'center', alignItems: 'center',
                                }}
                            >
                                <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.light.red }}>Cancel Request</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Driver on the way panel */}
                {activeBooking && (driverArriving || tripInProgress) && acceptedDriver && (
                    <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: Colors.light.background,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        paddingHorizontal: 20,
                        paddingTop: 24,
                        paddingBottom: 40,
                        zIndex: 300,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -3 },
                        shadowOpacity: 0.1,
                        shadowRadius: 10,
                        elevation: 12,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <View>
                                <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.light.text }}>
                                    {tripInProgress ? 'Heading to destination' : driverArrived ? 'Driver has arrived!' : 'Driver is on the way!'}
                                </Text>
                                <Text style={{ fontSize: 13, color: Colors.light.secondaryText, marginTop: 4 }}>
                                    {tripInProgress ? 'Sit back and relax' : driverArrived ? 'Please meet your driver' : 'Meet at the pickup location'}
                                </Text>
                            </View>
                            <View style={{
                                backgroundColor: Colors.light.success,
                                borderRadius: 10,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                alignItems: 'center',
                            }}>
                                <Text style={{ fontSize: 11, color: Colors.light.primaryDark, fontWeight: '500' }}>Agreed Fare</Text>
                                <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.light.primaryDark }}>
                                    AED {activeBooking.estimatedFare.toFixed(2)}
                                </Text>
                            </View>
                        </View>
                        
                        {/* Driver details */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.light.background, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.light.border }}>
                            <Image
                                source={{ uri: getAvatarUrl(acceptedDriver.avatar) }}
                                style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.light.border }}
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.light.text }}>
                                    {acceptedDriver.name || 'Driver'}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                                    <Ionicons name="star" size={13} color={Colors.light.amber} />
                                    <Text style={{ fontSize: 13, color: Colors.light.secondaryText, fontWeight: '500' }}>
                                        {acceptedDriver.rating != null ? acceptedDriver.rating.toFixed(1) : '5.0'}
                                    </Text>
                                </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.light.text }}>
                                    Toyota Camry
                                </Text>
                                <Text style={{ fontSize: 13, color: Colors.light.secondaryText, marginTop: 2, fontWeight: '600' }}>
                                    DXB 1234
                                </Text>
                            </View>
                        </View>

                        {/* Mock Arrival Button */}
                        {!tripInProgress && !driverArrived && (
                            <TouchableOpacity
                                onPress={() => setDriverArrived(true)}
                                activeOpacity={0.8}
                                style={{
                                    marginTop: 16,
                                    height: 48, borderRadius: 12,
                                    borderWidth: 1.5, borderColor: Colors.light.primary,
                                    justifyContent: 'center', alignItems: 'center',
                                }}
                            >
                                <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.light.primary }}>Simulate Driver Arrival (Mock)</Text>
                            </TouchableOpacity>
                        )}

                        {/* Start Ride Button */}
                        {!tripInProgress && driverArrived && (
                            <TouchableOpacity
                                onPress={() => {
                                    setTripInProgress(true);
                                    if (driverLocation && dropoffCoordinate) {
                                        fetchRoute(driverLocation, dropoffCoordinate);
                                    }
                                }}
                                activeOpacity={0.8}
                                style={{
                                    marginTop: 16,
                                    height: 48, borderRadius: 12,
                                    backgroundColor: Colors.light.primary,
                                    justifyContent: 'center', alignItems: 'center',
                                }}
                            >
                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Start Ride</Text>
                            </TouchableOpacity>
                        )}
                        {/* Complete Ride Button (optional for later) */}
                        {tripInProgress && (
                            <TouchableOpacity
                                onPress={() => {
                                    router.replace('/trip_completed');
                                }}
                                activeOpacity={0.8}
                                style={{
                                    marginTop: 16,
                                    height: 48, borderRadius: 12,
                                    backgroundColor: Colors.light.primary,
                                    justifyContent: 'center', alignItems: 'center',
                                }}
                            >
                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>Finish Ride (Mock)</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
            )}
        </GestureHandlerRootView>
    );
}
