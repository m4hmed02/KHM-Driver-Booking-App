import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Platform, ScrollView, StyleSheet, Dimensions, ActivityIndicator, Linking, AppState, Alert, Animated, Image, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
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
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import { useRoute } from '../hooks/useRoute';
import { useRoadSnappedMarker } from '../hooks/useRoadSnappedMarker';
import { calculateFareApi } from '../services/apis/fares/fareService';
import { CalculateFareResponse } from '../services/apis/fares/type';
import { createBookingApi, deleteBookingApi, getBookingStatusApi, acceptDriverOfferApi, rejectDriverOfferApi } from '../services/apis/booking/bookingService';
import { Booking, Offer } from '../services/apis/booking/type';
import { connectSocket, emitCustomerComing } from '../services/socket';
import ChatModal from '../components/ChatModal';
import { useAuth } from '../context/AuthContext';
import { DRIVER_MARKER_BASE64 } from '../constants/driverMarkerAsset';

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
    const { user } = useAuth();
    const { tripEnded } = useLocalSearchParams<{ tripEnded?: string }>();

    // When returning from trip_completed, clear any stale booking state.
    // tripEnded carries the bookingId that just finished.
    useEffect(() => {
        if (tripEnded) {
            clearBookingState(tripEnded);
        }
    // clearBookingState is stable (useCallback), tripEnded is a route param — safe to list both
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripEnded]);

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

    const { fetchRoute, routeCoordinates, distance, duration, isLoading: isRouteLoading, clearRoute } = useRoute();

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
    // ── Cancellation with reason ──────────────────────────────────────────────
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelCustomText, setCancelCustomText] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);
    // Animated driver marker — position glides smoothly between socket updates.
    // animatedDriverCoord replaces the old plain driverLocation state.
    const {
        animatedCoord: animatedDriverCoord,
        animatedHeading: animatedDriverHeading,
        updateTarget: updateDriverMarker,
        setInitial: setDriverMarkerInitial,
    } = useRoadSnappedMarker({ duration: 4500 });
    const [acceptedDriver, setAcceptedDriver] = useState<any | null>(null);
    const [acceptedDriverId, setAcceptedDriverId] = useState<string | null>(null);
    const [showChat, setShowChat] = useState(false);
    const [driverArrived, setDriverArrived] = useState(false);
    const [isCustomerComing, setIsCustomerComing] = useState(false);
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
    const spinAnim = useRef(new Animated.Value(0)).current;
    const [trackMarker, setTrackMarker] = useState(true);
    const lastRouteUpdateRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

    // ── Refs to hold latest state values for use inside stable socket handlers ─
    // This avoids stale closures without adding these values to the socket
    // effect's dependency array (which would cause the listeners to be torn down
    // and re-registered on every state change, creating a window where events
    // can be silently dropped).
    const acceptedDriverIdRef = useRef<string | null>(null);
    const acceptedDriverRef   = useRef<any | null>(null);
    const driverArrivingRef   = useRef<boolean>(false);
    const tripInProgressRef   = useRef<boolean>(false);
    const pickupCoordinateRef  = useRef<{latitude: number; longitude: number} | null>(null);
    const dropoffCoordinateRef = useRef<{latitude: number; longitude: number} | null>(null);
    // Tracks whether the driver marker has been seeded with an initial position.
    // Using a ref (not state) so it is always live inside the stable socket closure.
    const driverMarkerSeededRef = useRef<boolean>(false);

    // Keep refs in sync with state on every render
    useEffect(() => { acceptedDriverIdRef.current  = acceptedDriverId;  }, [acceptedDriverId]);
    useEffect(() => { acceptedDriverRef.current    = acceptedDriver;    }, [acceptedDriver]);
    useEffect(() => { driverArrivingRef.current    = driverArriving;    }, [driverArriving]);
    useEffect(() => { tripInProgressRef.current    = tripInProgress;    }, [tripInProgress]);
    useEffect(() => { pickupCoordinateRef.current  = pickupCoordinate;  }, [pickupCoordinate]);
    useEffect(() => { dropoffCoordinateRef.current = dropoffCoordinate; }, [dropoffCoordinate]);

    const [initialRegion, setInitialRegion] = useState<{latitude: number, longitude: number, latitudeDelta: number, longitudeDelta: number} | null>(null);

    const defaultRegion = {
        latitude: 25.1972,
        longitude: 55.2744,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    };

    const isButtonDisabled = !pickup.trim() || !dropoff.trim();

    const clearBookingState = useCallback((bookingId: string) => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);
        if (offerTimerRef.current) clearTimeout(offerTimerRef.current);
        if (offerIntervalRef.current) clearInterval(offerIntervalRef.current);
        shownOfferIds.current.clear();
        setActiveBooking(current => current?._id === bookingId ? null : current);
        setFareResult(null);
        setFareAdjustment(0);
        setSearchTimedOut(false);
        setPendingOffer(null);
        setAcceptedDriver(null);
        setAcceptedDriverId(null);
        setDriverArriving(false);
        setDriverArrived(false);
        setIsCustomerComing(false);
        setTripInProgress(false);
        // Reset driver marker seed flag so the next booking gets a fresh initial fix
        driverMarkerSeededRef.current = false;
        // Clear locations so the user must re-enter them for the next ride
        setPickup('');
        setDropoff('');
        setPickupCoordinate(null);
        setDropoffCoordinate(null);
        clearRoute();
    }, [clearRoute]);

    // Spin animation for the location-loading marker icon
    useEffect(() => {
        if (isLocationLoading) {
            const loop = Animated.loop(
                Animated.timing(spinAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: false,
                })
            );
            loop.start();
            return () => loop.stop();
        } else {
            spinAnim.setValue(0);
        }
    }, [isLocationLoading]);

    // Keep tracksViewChanges on briefly after loading finishes so the marker
    // bitmap re-renders with the walk icon before freezing.
    useEffect(() => {
        if (isLocationLoading) {
            setTrackMarker(true);
        } else {
            const timer = setTimeout(() => setTrackMarker(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isLocationLoading]);

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
        } else if (!pickupCoordinate && !dropoffCoordinate && initialRegion && mapRef.current) {
            // Both locations cleared — animate back to user's position
            const bottomSheetFraction = 0.52;
            const latOffset = (initialRegion.latitudeDelta / 2) * ((SCREEN_HEIGHT * (1 - bottomSheetFraction)) / SCREEN_HEIGHT) * 0.5;
            mapRef.current.animateCamera({
                center: {
                    latitude: initialRegion.latitude - latOffset,
                    longitude: initialRegion.longitude,
                },
                zoom: 14,
            }, { duration: 600 });
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
                        bottom: (SCREEN_HEIGHT * 0.48) + 50, // 0.48 is the lowest snap point of the bottom sheet
                        left: 50,
                    },
                    animated: true,
                }
            );
        }
    }, [routeCoordinates, pickupCoordinate, dropoffCoordinate]);

    // When both coordinates are cleared (e.g. after trip ends or user resets),
    // snap the sheet to the minimum/lower height (index 0) so the map is visible by default.
    useEffect(() => {
        if (!pickupCoordinate && !dropoffCoordinate && !activeBooking) {
            // Small delay lets the sheet mount before animating
            const t = setTimeout(() => {
                sheetRef.current?.snapToIndex(0);
            }, 100);
            return () => clearTimeout(t);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pickupCoordinate, dropoffCoordinate, activeBooking]);


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
            const driverId = (pendingOffer.driver as any)._id ?? pendingOffer.driver;
            const updatedBooking = await acceptDriverOfferApi(activeBooking._id, driverId);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setActiveBooking(updatedBooking);
            setAcceptedDriver(pendingOffer.driver);
            setAcceptedDriverId(driverId);
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
        if ((driverArriving || tripInProgress) && animatedDriverCoord) {
            const target = tripInProgress ? dropoffCoordinate : pickupCoordinate;
            if (target) {
                mapRef.current?.fitToCoordinates(
                    [target, animatedDriverCoord],
                    { edgePadding: { top: 100, right: 50, bottom: (SCREEN_HEIGHT * 0.3) + 50, left: 50 }, animated: true }
                );
            }
        }
    }, [driverArriving, tripInProgress, pickupCoordinate, dropoffCoordinate, animatedDriverCoord]);

    // ── Real-time socket: driver location + booking status updates ─────────────
    useEffect(() => {
        if (!user?.token || !activeBooking) return;

        const socket = connectSocket(user.token, user._id);

        // Register so backend maps userId → socketId
        socket.emit('register' as any, user._id);

        // Driver location updates → animate driver marker smoothly
        const handleDriverLocation = (payload: { bookingId: string; latitude: number; longitude: number }) => {
            if (payload.bookingId !== activeBooking._id) return;

            // First update — seed without animation so marker appears immediately.
            // Use a ref (not animatedDriverCoord state) to check: the socket handler
            // is created once and animatedDriverCoord is always null inside the closure.
            if (!driverMarkerSeededRef.current) {
                driverMarkerSeededRef.current = true;
                setDriverMarkerInitial(payload.latitude, payload.longitude);
                // Briefly enable tracksViewChanges so the custom bitmap is captured
                setTrackMarker(true);
                setTimeout(() => setTrackMarker(false), 600);
            } else {
                updateDriverMarker(payload.latitude, payload.longitude);
            }

            // Throttle route recalculation: only if driver has moved > 50m or 15s elapsed
            const now = Date.now();
            const last = lastRouteUpdateRef.current;
            const newLoc = { latitude: payload.latitude, longitude: payload.longitude };
            const targetDest = tripInProgressRef.current
                ? dropoffCoordinateRef.current
                : pickupCoordinateRef.current;

            if (!targetDest) return;

            const shouldUpdateRoute =
                !last ||
                now - last.time > 15000 ||
                Math.abs(newLoc.latitude - last.lat) > 0.00045 ||
                Math.abs(newLoc.longitude - last.lng) > 0.00045;

            if (shouldUpdateRoute) {
                lastRouteUpdateRef.current = { lat: newLoc.latitude, lng: newLoc.longitude, time: now };
                fetchRoute(newLoc, targetDest);
            }
        };

        // Booking status changes from the driver
        const handleStatusUpdate = (payload: any) => {
            const incomingBookingId = payload._id || payload.bookingId;
            if (incomingBookingId && incomingBookingId !== activeBooking._id) return;

            const newStatus = payload.status;
            if (!newStatus) return;

            // For scheduled rides, 'accepted' means a driver has committed to the future
            // booking. Clear the home panel and redirect to the scheduled rides screen.
            if (newStatus === 'accepted' && activeBooking.bookingType === 'schedule_driver') {
                clearBookingState(activeBooking._id);
                Alert.alert(
                    'Driver Assigned! 🎉',
                    'A driver has accepted your scheduled ride. You can view it in Scheduled Rides.',
                    [
                        {
                            text: 'View Scheduled Rides',
                            onPress: () => router.push('/scheduled_rides'),
                        },
                        { text: 'OK', style: 'cancel' },
                    ],
                );
                return;
            }

            if (newStatus === 'arriving') {
                // Driver arrived at pickup — always set driverArrived regardless of other state
                setDriverArrived(true);
                setIsCustomerComing(false);
                setActiveBooking((prev: any) => prev ? { ...prev, status: 'arriving' } : prev);

                // Extract driver info from the booking payload — the backend always
                // populates booking.driver on status updates. This is the reliable
                // source regardless of whether acceptedDriverId state was set.
                const driverFromPayload = payload.driver ?? payload.booking?.driver ?? null;
                const dIdFromPayload = driverFromPayload
                    ? (typeof driverFromPayload === 'object' ? driverFromPayload._id : driverFromPayload)
                    : null;

                // Also try extracting from activeBooking.driver as a fallback
                const dIdFromBooking = activeBooking?.driver
                    ? (typeof activeBooking.driver === 'object'
                        ? (activeBooking.driver as any)._id
                        : activeBooking.driver)
                    : null;

                const resolvedDriverId = dIdFromPayload || dIdFromBooking || acceptedDriverIdRef.current;
                const resolvedDriver   = (driverFromPayload && typeof driverFromPayload === 'object')
                    ? driverFromPayload
                    : (activeBooking?.driver && typeof activeBooking.driver === 'object'
                        ? activeBooking.driver
                        : acceptedDriverRef.current);

                if (resolvedDriverId) {
                    setAcceptedDriverId(resolvedDriverId);
                    acceptedDriverIdRef.current = resolvedDriverId;
                }
                if (resolvedDriver) {
                    setAcceptedDriver(resolvedDriver);
                    acceptedDriverRef.current = resolvedDriver;
                }
                setDriverArriving(true);
                driverArrivingRef.current = true;
            } else if (newStatus === 'started') {
                // Ride started — switch map to show route to dropoff
                lastRouteUpdateRef.current = null;
                setTripInProgress(true);
                tripInProgressRef.current = true;
                setDriverArrived(false);
                setIsCustomerComing(false);
                setActiveBooking((prev: any) => prev ? { ...prev, status: 'started' } : prev);
                const dropoff = dropoffCoordinateRef.current;
                const pickup  = pickupCoordinateRef.current;
                if (animatedDriverCoord && dropoff) {
                    fetchRoute(animatedDriverCoord, dropoff);
                } else if (dropoff && pickup) {
                    fetchRoute(pickup, dropoff);
                }
            } else if (newStatus === 'completed') {
                const fare = payload.estimatedFare ?? activeBooking.estimatedFare ?? 0;
                const bId  = payload._id ?? activeBooking._id;
                setActiveBooking((prev: any) => prev ? { ...prev, status: 'completed' } : prev);
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                router.replace(`/trip_completed?bookingId=${bId}&fare=${fare}`);
            } else if (newStatus === 'cancelled') {
                const bId = payload._id ?? activeBooking._id;
                clearBookingState(bId);
                setShowCancelModal(false);
                const title = payload.cancelledBy === 'driver' ? 'Ride Cancelled by Driver' : 'Ride Cancelled';
                Alert.alert(
                    title,
                    payload.cancellationReason || payload.reason
                        ? `The driver cancelled this ride: ${payload.cancellationReason || payload.reason}`
                        : 'The driver has cancelled this ride.'
                );
            }
        };

        const handleBookingCancelled = (payload: any) => {
            const bId = payload?._id ?? payload?.bookingId ?? activeBooking?._id;
            clearBookingState(bId);
            setShowCancelModal(false);
            const title = payload?.cancelledBy === 'driver' ? 'Ride Cancelled by Driver' : 'Ride Cancelled';
            Alert.alert(
                title,
                payload?.cancellationReason || payload?.reason
                    ? `The driver cancelled this ride: ${payload.cancellationReason || payload.reason}`
                    : 'The driver has cancelled this ride.'
            );
        };

        socket.on('driver_location_update' as any, handleDriverLocation);
        socket.on('booking_status_updated' as any, handleStatusUpdate);
        socket.on('booking_cancelled' as any, handleBookingCancelled);

        return () => {
            socket.off('driver_location_update' as any, handleDriverLocation);
            socket.off('booking_status_updated' as any, handleStatusUpdate);
            socket.off('booking_cancelled' as any, handleBookingCancelled);
        };
    // Only reconnect when the user session or active booking changes.
    // All other values (tripInProgress, coordinates, driver info) are read
    // from refs so they never need to be in this dependency array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, activeBooking?._id]);

    const handleRejectOffer = async () => {
        if (!activeBooking || !pendingOffer) return;
        setIsOfferLoading(true);
        try {
            await deleteBookingApi(activeBooking._id);
            clearBookingState(activeBooking._id);
        } catch (err) {
            Alert.alert('Could not delete request', err instanceof Error ? err.message : 'Please try again.');
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
            await deleteBookingApi(activeBooking._id);
            clearBookingState(activeBooking._id);
        } catch (err) {
            Alert.alert('Could not delete request', err instanceof Error ? err.message : 'Please try again.');
        }
    };

    // Opens the reason modal — used for cancelling after a driver is assigned
    const openCancelModal = () => {
        setCancelReason('');
        setCancelCustomText('');
        setShowCancelModal(true);
    };

    const handleCancelWithReason = async () => {
        const reason = cancelReason === 'Other' ? cancelCustomText.trim() : cancelReason;
        if (!reason) {
            Alert.alert('Please select a reason', 'Choose a reason or enter your own before cancelling.');
            return;
        }
        if (!activeBooking) return;
        setIsCancelling(true);
        try {
            await deleteBookingApi(activeBooking._id, reason);
            setShowCancelModal(false);
            clearBookingState(activeBooking._id);
            Alert.alert('Ride Cancelled', 'Your ride has been cancelled.');
        } catch (err) {
            Alert.alert('Could not cancel', err instanceof Error ? err.message : 'Please try again.');
        } finally {
            setIsCancelling(false);
        }
    };

    // Delete requests that remain unanswered after two minutes.
    // Only applies to driver_now bookings — scheduled rides wait indefinitely.
    useEffect(() => {
        if (activeBooking?.status === 'requesting' && activeBooking?.bookingType !== 'schedule_driver') {
            setSearchTimedOut(false);
            setSearchSecondsLeft(120);
            searchProgress.setValue(1);
            Animated.timing(searchProgress, {
                toValue: 0,
                duration: 120000,
                useNativeDriver: false,
            }).start();
            searchTimerRef.current = setTimeout(async () => {
                try {
                    await deleteBookingApi(activeBooking._id);
                    clearBookingState(activeBooking._id);
                    Alert.alert('Request expired', 'The ride request was removed because no driver accepted it.');
                } catch (err) {
                    setSearchTimedOut(true);
                    Alert.alert('Could not delete request', err instanceof Error ? err.message : 'Please try again.');
                }
            }, 120000);
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
    }, [activeBooking, clearBookingState]);

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

    // Poll booking status every 4 s to catch incoming driver offers.
    // Scheduled bookings use direct-accept (no bidding), so polling is skipped for them.
    useEffect(() => {
        if (!activeBooking || activeBooking.bookingType === 'schedule_driver') {
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
                    {(driverArriving || tripInProgress) && animatedDriverCoord && (
                        <Marker
                            coordinate={animatedDriverCoord}
                            anchor={{ x: 0.5, y: 0.5 }}
                            tracksViewChanges={trackMarker}
                            zIndex={999}
                        >
                            <Animated.View
                                style={{
                                    transform: [{
                                        rotate: animatedDriverHeading.interpolate({
                                            inputRange: [-3600, 3600],
                                            outputRange: ['-3600deg', '3600deg'],
                                            extrapolate: 'extend',
                                        }),
                                    }],
                                }}
                            >
                                <View style={{
                                    backgroundColor: '#FFFFFF',
                                    width: 46, height: 46, borderRadius: 23,
                                    elevation: 6, shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 4.5, shadowOffset: { width: 0, height: 2 },
                                    justifyContent: 'center', alignItems: 'center',
                                    borderWidth: 2, borderColor: '#7ED957',
                                }}>
                                    {/* Direction pointer notch */}
                                    <View style={{
                                        position: 'absolute',
                                        top: 2,
                                        width: 0, height: 0,
                                        backgroundColor: 'transparent',
                                        borderStyle: 'solid',
                                        borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 5,
                                        borderLeftColor: 'transparent', borderRightColor: 'transparent',
                                        borderBottomColor: '#7ED957',
                                    }} />
                                    <Image
                                        source={{ uri: DRIVER_MARKER_BASE64 }}
                                        style={{ width: 36, height: 36 }}
                                        resizeMode="contain"
                                    />
                                </View>
                            </Animated.View>
                        </Marker>
                    )}
                    {!tripInProgress && (pickupCoordinate || (pickup === '' && (initialRegion || isLocationLoading))) && (
                        <Marker coordinate={pickupCoordinate || initialRegion || defaultRegion} tracksViewChanges={trackMarker} anchor={{ x: 0.5, y: 1 }}>
                            <View style={{ alignItems: 'center', paddingBottom: 2 }}>
                                <View style={{
                                    backgroundColor: '#FFFFFF',
                                    width: 40, height: 40, borderRadius: 10,
                                    elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
                                    justifyContent: 'center', alignItems: 'center',
                                    borderWidth: 1.5, borderColor: '#E0E0E0',
                                }}>
                                    {isLocationLoading ? (
                                        <Animated.View style={{
                                            transform: [{
                                                rotate: spinAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['0deg', '360deg'],
                                                }),
                                            }],
                                        }}>
                                            <MaterialCommunityIcons name="loading" size={24} color="#000000" />
                                        </Animated.View>
                                    ) : (
                                        <MaterialCommunityIcons name="walk" size={24} color="#000000" />
                                    )}
                                </View>
                                <View style={{ width: 2, height: 14, backgroundColor: '#000000' }} />
                                <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#000000' }} />
                            </View>
                        </Marker>
                    )}
                    {!(driverArriving && !driverArrived) && dropoffCoordinate && (
                        <Marker coordinate={dropoffCoordinate}>
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
                    snapPoints={[0.48, 0.65, 0.80, 0.92]}
                    initialSnap={0}
                    backgroundColor={theme.background}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ flex: 1 }}
                        keyboardVerticalOffset={0}
                    >
                    <ScrollView
                        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
                        keyboardShouldPersistTaps="always"
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={true}
                    >
                        <LocationInputCard
                            pickupLocation={pickup}
                            setPickupLocation={setPickup}
                            setPickupCoordinate={setPickupCoordinate}
                            dropoffLocation={dropoff}
                            setDropoffLocation={setDropoff}
                            setDropoffCoordinate={setDropoffCoordinate}
                            onInputFocus={() => sheetRef.current?.snapToIndex(3)}
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

                            {/* ── Driver Now card ── */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row', alignItems: 'center', padding: 16,
                                    borderRadius: 14, borderWidth: 1.5,
                                    borderColor: scheduleType === 'now' ? theme.primary : theme.border,
                                    backgroundColor: scheduleType === 'now' ? theme.success : theme.background,
                                    gap: 16,
                                }}
                                activeOpacity={0.7}
                                onPress={() => {
                                    setScheduleType('now');
                                    // Expand the sheet to full-screen so fare + request button are all visible
                                    sheetRef.current?.snapToIndex(3);
                                }}
                            >
                                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: scheduleType === 'now' ? '#D5F0D9' : '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
                                    <Ionicons name="flash" size={22} color={scheduleType === 'now' ? theme.primaryDark : theme.icon} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, color: theme.text, fontWeight: '700', marginBottom: 3 }}>Driver Now</Text>
                                    <Text style={{ fontSize: 13, color: theme.secondaryText, lineHeight: 18 }}>Quickest arrival. Nearest available driver assigned immediately.</Text>
                                </View>
                                <Ionicons name={scheduleType === 'now' ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={scheduleType === 'now' ? theme.primary : '#D1D5DB'} />
                            </TouchableOpacity>

                            {/* ── Schedule Driver card ── */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row', alignItems: 'center', padding: 16,
                                    borderRadius: 14, borderWidth: 1.5,
                                    borderColor: scheduleType === 'schedule' ? theme.primary : theme.border,
                                    backgroundColor: scheduleType === 'schedule' ? theme.success : theme.background,
                                    gap: 16,
                                }}
                                activeOpacity={0.7}
                                onPress={() => {
                                    setScheduleType('schedule');
                                    // Snap up so the date/time pickers are fully visible
                                    sheetRef.current?.snapToIndex(2);
                                }}
                            >
                                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: scheduleType === 'schedule' ? '#D5F0D9' : '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
                                    <MaterialCommunityIcons name="calendar-clock" size={22} color={scheduleType === 'schedule' ? theme.primaryDark : theme.icon} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, color: theme.text, fontWeight: '700', marginBottom: 3 }}>Schedule Driver</Text>
                                    <Text style={{ fontSize: 13, color: theme.secondaryText, lineHeight: 18 }}>Book for later. Guarantee a driver for a specific date and time.</Text>
                                </View>
                                <Ionicons name={scheduleType === 'schedule' ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={scheduleType === 'schedule' ? theme.primary : '#D1D5DB'} />
                            </TouchableOpacity>

                            {/* ── Date & Time pickers (Schedule only) ── */}
                            {scheduleType === 'schedule' && (
                                <View style={{ marginTop: 8, gap: 10 }}>
                                    {/* Section label */}
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.secondaryText, textTransform: 'uppercase', letterSpacing: 0.6 }}>Pickup date & time</Text>

                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        {/* Date button */}
                                        <TouchableOpacity
                                            style={{
                                                flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
                                                paddingVertical: 14, paddingHorizontal: 16,
                                                backgroundColor: theme.background,
                                                borderRadius: 12, borderWidth: 1.5, borderColor: theme.primary,
                                            }}
                                            activeOpacity={0.7}
                                            onPress={() => setShowDatePicker(true)}
                                        >
                                            <Ionicons name="calendar" size={20} color={theme.primary} />
                                            <View>
                                                <Text style={{ fontSize: 11, color: theme.secondaryText, fontWeight: '500', marginBottom: 2 }}>Date</Text>
                                                <Text style={{ fontSize: 15, color: theme.text, fontWeight: '700' }}>
                                                    {scheduleDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>

                                        {/* Time button */}
                                        <TouchableOpacity
                                            style={{
                                                flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
                                                paddingVertical: 14, paddingHorizontal: 16,
                                                backgroundColor: theme.background,
                                                borderRadius: 12, borderWidth: 1.5, borderColor: theme.primary,
                                            }}
                                            activeOpacity={0.7}
                                            onPress={() => setShowTimePicker(true)}
                                        >
                                            <Ionicons name="time" size={20} color={theme.primary} />
                                            <View>
                                                <Text style={{ fontSize: 11, color: theme.secondaryText, fontWeight: '500', marginBottom: 2 }}>Time</Text>
                                                <Text style={{ fontSize: 15, color: theme.text, fontWeight: '700' }}>
                                                    {scheduleDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Summary pill */}
                                    <View style={{
                                        flexDirection: 'row', alignItems: 'center', gap: 8,
                                        backgroundColor: theme.success, borderRadius: 10,
                                        paddingVertical: 10, paddingHorizontal: 14,
                                    }}>
                                        <Ionicons name="checkmark-circle" size={16} color={theme.primaryDark} />
                                        <Text style={{ fontSize: 13, color: theme.primaryDark, fontWeight: '600' }}>
                                            {scheduleDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                            {'  ·  '}
                                            {scheduleDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </Text>
                                    </View>
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
                    </KeyboardAvoidingView>
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
                                        ? scheduleType === 'schedule'
                                            ? `Schedule Ride — AED ${Math.max(0, fareResult.recommendedFare + fareAdjustment).toFixed(2)}`
                                            : `Request Ride — AED ${Math.max(0, fareResult.recommendedFare + fareAdjustment).toFixed(2)}`
                                        : `Confirm ${scheduleType === 'schedule' ? 'Schedule' : 'Locations'}`}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Searching for driver panel — driver_now only */}
                {activeBooking && !driverArriving && activeBooking.bookingType !== 'schedule_driver' && (
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
                            <TouchableOpacity
                                onPress={handleCancelRide}
                                activeOpacity={0.8}
                                style={{
                                    height: 48, borderRadius: 12,
                                    borderWidth: 1.5, borderColor: Colors.light.red,
                                    justifyContent: 'center', alignItems: 'center',
                                }}
                            >
                                <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.light.red }}>Retry Delete</Text>
                            </TouchableOpacity>
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

                {/* Scheduled ride confirmation panel */}
                {activeBooking && !driverArriving && activeBooking.bookingType === 'schedule_driver' && (
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
                        {/* Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <View style={{
                                width: 40, height: 40, borderRadius: 20,
                                backgroundColor: Colors.light.success,
                                justifyContent: 'center', alignItems: 'center',
                            }}>
                                <Ionicons name="calendar-outline" size={22} color={Colors.light.primaryDark} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.light.text }}>
                                    Ride Scheduled!
                                </Text>
                                <Text style={{ fontSize: 13, color: Colors.light.secondaryText, marginTop: 2 }}>
                                    You'll be notified when a driver accepts
                                </Text>
                            </View>
                        </View>

                        {/* Scheduled time badge */}
                        {activeBooking.scheduledTime && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                backgroundColor: Colors.light.success,
                                borderRadius: 10,
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                marginBottom: 16,
                            }}>
                                <Ionicons name="time-outline" size={18} color={Colors.light.primaryDark} />
                                <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.light.primaryDark }}>
                                    {new Date(activeBooking.scheduledTime).toLocaleString(undefined, {
                                        weekday: 'short', month: 'short', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                </Text>
                            </View>
                        )}

                        {/* Route summary */}
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

                        {/* Fare */}
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: Colors.light.border,
                            marginBottom: 16,
                        }}>
                            <Text style={{ fontSize: 14, color: Colors.light.secondaryText }}>Offered fare</Text>
                            <Text style={{ fontSize: 20, fontWeight: '800', color: Colors.light.primary }}>
                                AED {activeBooking.estimatedFare.toFixed(2)}
                            </Text>
                        </View>

                        {/* Cancel */}
                        <TouchableOpacity
                            onPress={handleCancelRide}
                            activeOpacity={0.8}
                            style={{
                                height: 48, borderRadius: 12,
                                borderWidth: 1.5, borderColor: Colors.light.red,
                                justifyContent: 'center', alignItems: 'center',
                            }}
                        >
                            <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.light.red }}>Cancel Schedule</Text>
                        </TouchableOpacity>

                        {/* Quick link to scheduled rides */}
                        <TouchableOpacity
                            onPress={() => {
                                clearBookingState(activeBooking._id);
                                router.push('/scheduled_rides');
                            }}
                            activeOpacity={0.8}
                            style={{
                                height: 48, borderRadius: 12,
                                backgroundColor: Colors.light.primary,
                                justifyContent: 'center', alignItems: 'center',
                                marginTop: 10,
                                flexDirection: 'row',
                                gap: 8,
                            }}
                        >
                            <Ionicons name="calendar-outline" size={18} color="#fff" />
                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>View Scheduled Rides</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Driver on the way panel */}
                {activeBooking && (driverArriving || tripInProgress) && (acceptedDriver || activeBooking.driver) && (
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
                        {(() => {
                            const driver = acceptedDriver ||
                                (typeof activeBooking.driver === 'object' ? activeBooking.driver as any : null);
                            if (!driver) return null;
                            return (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.light.background, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.light.border }}>
                                <Image
                                    source={{ uri: getAvatarUrl(driver.avatar) }}
                                    style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: Colors.light.border }}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.light.text }}>
                                        {driver.name || 'Driver'}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                                        <Ionicons name="star" size={13} color={Colors.light.amber} />
                                        <Text style={{ fontSize: 13, color: Colors.light.secondaryText, fontWeight: '500' }}>
                                            {driver.rating != null ? driver.rating.toFixed(1) : '5.0'}
                                        </Text>
                                    </View>
                                </View>
                                {/* Call + Chat buttons replacing car info */}
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    {/* Call */}
                                    <TouchableOpacity
                                        onPress={() => {
                                            const phone = (driver.phone as string | undefined)?.replace(/\s+/g, '');
                                            if (!phone) {
                                                Alert.alert('No phone number', 'Driver phone number is not available.');
                                                return;
                                            }
                                            Linking.openURL(`tel:${phone}`);
                                        }}
                                        activeOpacity={0.8}
                                        style={{
                                            width: 42, height: 42, borderRadius: 21,
                                            backgroundColor: '#22C55E',
                                            alignItems: 'center', justifyContent: 'center',
                                            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
                                        }}
                                    >
                                        <Ionicons name="call" size={20} color="#fff" />
                                    </TouchableOpacity>
                                    {/* Chat */}
                                    <TouchableOpacity
                                        onPress={() => setShowChat(true)}
                                        activeOpacity={0.8}
                                        style={{
                                            width: 42, height: 42, borderRadius: 21,
                                            backgroundColor: Colors.light.primary,
                                            alignItems: 'center', justifyContent: 'center',
                                            shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                                            shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
                                        }}
                                    >
                                        <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            );
                        })()}

                        {/* Driver Arrived Notification — shown when driver sets status 'arriving' */}
                        {!tripInProgress && driverArrived && (
                            <View style={{
                                marginTop: 16,
                                borderRadius: 12,
                                borderWidth: 1.5,
                                borderColor: Colors.light.primary,
                                backgroundColor: Colors.light.success,
                                padding: 14,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                            }}>
                                <Ionicons name="checkmark-circle" size={22} color={Colors.light.primaryDark} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.light.primaryDark }}>
                                        Driver has arrived!
                                    </Text>
                                    <Text style={{ fontSize: 12, color: Colors.light.primaryDark, marginTop: 2 }}>
                                        Please head to the pickup location.
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* "I'm Coming" button — customer taps to tell driver they're on the way */}
                        {!tripInProgress && driverArrived && activeBooking && (() => {
                            const dId = acceptedDriverId ||
                                (activeBooking.driver
                                    ? (typeof activeBooking.driver === 'object'
                                        ? (activeBooking.driver as any)._id
                                        : activeBooking.driver as string)
                                    : null);
                            if (!dId) return null;
                            return (
                            <TouchableOpacity
                                onPress={() => {
                                    emitCustomerComing(activeBooking._id, dId, user?.name);
                                    Alert.alert(
                                        'On My Way!',
                                        'The driver has been notified that you\'re coming.',
                                        [
                                            {
                                                text: 'OK',
                                                onPress: () => {
                                                    setIsCustomerComing(true);
                                                },
                                            },
                                        ],
                                        { cancelable: false }
                                    );
                                }}
                                disabled={isCustomerComing}
                                activeOpacity={isCustomerComing ? 1 : 0.85}
                                style={{
                                    marginTop: 12,
                                    height: 52,
                                    borderRadius: 14,
                                    backgroundColor: isCustomerComing ? '#9CA3AF' : Colors.light.primary,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    gap: 8,
                                    opacity: isCustomerComing ? 0.8 : 1,
                                }}
                            >
                                <Ionicons
                                    name={isCustomerComing ? "checkmark-circle" : "walk"}
                                    size={20}
                                    color="#fff"
                                />
                                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>
                                    {isCustomerComing ? "Driver Notified" : "I'm Coming"}
                                </Text>
                            </TouchableOpacity>
                            );
                        })()}

                        {/* Trip in progress indicator */}
                        {tripInProgress && (
                            <View style={{
                                marginTop: 16,
                                borderRadius: 12,
                                backgroundColor: Colors.light.success,
                                padding: 14,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                            }}>
                                <ActivityIndicator size="small" color={Colors.light.primaryDark} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.light.primaryDark }}>
                                        Ride in progress
                                    </Text>
                                    <Text style={{ fontSize: 12, color: Colors.light.primaryDark, marginTop: 2 }}>
                                        Sit back and relax — heading to your destination.
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Cancel button — works before and after ride has started */}
                        <TouchableOpacity
                            onPress={openCancelModal}
                            disabled={isCancelling}
                            activeOpacity={0.8}
                            style={{
                                marginTop: 14,
                                height: 46,
                                borderRadius: 12,
                                borderWidth: 1.5,
                                borderColor: Colors.light.red,
                                justifyContent: 'center',
                                alignItems: 'center',
                                flexDirection: 'row',
                                gap: 6,
                                backgroundColor: '#FEF2F2',
                            }}
                        >
                            <Ionicons name="close-circle-outline" size={18} color={Colors.light.red} />
                            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.light.red }}>
                                Cancel Ride
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ── In-ride Chat Modal ───────────────────────────────────── */}
                {activeBooking && (() => {
                    const driver = acceptedDriver ||
                        (typeof activeBooking.driver === 'object' ? activeBooking.driver as any : null);
                    const driverId = acceptedDriverId ||
                        (activeBooking.driver
                            ? (typeof activeBooking.driver === 'object'
                                ? (activeBooking.driver as any)._id
                                : activeBooking.driver as string)
                            : null);
                    if (!driver || !driverId) return null;
                    return (
                        <ChatModal
                            visible={showChat}
                            onClose={() => setShowChat(false)}
                            bookingId={activeBooking._id}
                            myId={user?._id ?? ''}
                            myName={user?.name ?? 'Customer'}
                            recipientId={driverId}
                            recipientName={driver.name ?? 'Driver'}
                        />
                    );
                })()}

                {/* ── Cancel Reason Modal ─────────────────────────────────── */}
                <Modal
                    visible={showCancelModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowCancelModal(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                    >
                        <TouchableOpacity
                            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
                            activeOpacity={1}
                            onPress={() => !isCancelling && setShowCancelModal(false)}
                        >
                            <TouchableOpacity
                                activeOpacity={1}
                                style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    backgroundColor: Colors.light.background,
                                    borderTopLeftRadius: 24,
                                    borderTopRightRadius: 24,
                                    paddingHorizontal: 20,
                                    paddingTop: 8,
                                    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
                                }}
                            >
                                {/* Handle bar */}
                                <View style={{
                                    width: 40, height: 4, borderRadius: 2,
                                    backgroundColor: Colors.light.border,
                                    alignSelf: 'center',
                                    marginBottom: 20,
                                }} />

                                <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.light.text, marginBottom: 4 }}>
                                    Cancel Ride
                                </Text>
                                <Text style={{ fontSize: 13, color: Colors.light.secondaryText, marginBottom: 20 }}>
                                    {tripInProgress
                                        ? 'The ride is in progress. Please choose a reason to cancel/stop:'
                                        : 'Please let us know why you\'re cancelling.'}
                                </Text>

                                {/* Preset reasons */}
                                {(tripInProgress
                                    ? [
                                        'Emergency / Stop ride immediately',
                                        'Driver took wrong route',
                                        'Vehicle issue / safety concern',
                                        'Changed destination or plans',
                                        'Other',
                                    ]
                                    : [
                                        'Driver is taking too long',
                                        'I made a wrong booking',
                                        'Found another ride',
                                        'Changed my plans',
                                        'Emergency',
                                        'Other',
                                    ]
                                ).map((reason) => (
                                    <TouchableOpacity
                                        key={reason}
                                        onPress={() => { setCancelReason(reason); setCancelCustomText(''); }}
                                        activeOpacity={0.75}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 13,
                                            paddingHorizontal: 4,
                                            borderBottomWidth: StyleSheet.hairlineWidth,
                                            borderBottomColor: Colors.light.border,
                                            gap: 12,
                                        }}
                                    >
                                        {/* Radio circle */}
                                        <View style={{
                                            width: 22, height: 22, borderRadius: 11,
                                            borderWidth: 2,
                                            borderColor: cancelReason === reason ? Colors.light.primary : Colors.light.border,
                                            backgroundColor: cancelReason === reason ? Colors.light.primary : 'transparent',
                                            alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {cancelReason === reason && (
                                                <View style={{
                                                    width: 8, height: 8, borderRadius: 4,
                                                    backgroundColor: '#fff',
                                                }} />
                                            )}
                                        </View>
                                        <Text style={{
                                            fontSize: 15,
                                            color: cancelReason === reason ? Colors.light.text : Colors.light.secondaryText,
                                            fontWeight: cancelReason === reason ? '600' : '400',
                                            flex: 1,
                                        }}>
                                            {reason}
                                        </Text>
                                    </TouchableOpacity>
                                ))}

                                {/* Custom text input — shown only when "Other" is selected */}
                                {cancelReason === 'Other' && (
                                    <TextInput
                                        value={cancelCustomText}
                                        onChangeText={setCancelCustomText}
                                        placeholder="Describe your reason…"
                                        placeholderTextColor={Colors.light.secondaryText}
                                        multiline
                                        maxLength={200}
                                        style={{
                                            marginTop: 12,
                                            borderWidth: 1.5,
                                            borderColor: Colors.light.primary,
                                            borderRadius: 12,
                                            padding: 12,
                                            fontSize: 14,
                                            color: Colors.light.text,
                                            minHeight: 80,
                                            textAlignVertical: 'top',
                                        }}
                                    />
                                )}

                                {/* Action buttons */}
                                <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                                    <TouchableOpacity
                                        onPress={() => setShowCancelModal(false)}
                                        disabled={isCancelling}
                                        activeOpacity={0.8}
                                        style={{
                                            flex: 1, height: 50, borderRadius: 12,
                                            borderWidth: 1.5, borderColor: Colors.light.border,
                                            justifyContent: 'center', alignItems: 'center',
                                        }}
                                    >
                                        <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.light.secondaryText }}>
                                            Keep Ride
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleCancelWithReason}
                                        disabled={isCancelling || !cancelReason || (cancelReason === 'Other' && !cancelCustomText.trim())}
                                        activeOpacity={0.8}
                                        style={{
                                            flex: 1, height: 50, borderRadius: 12,
                                            backgroundColor: (!cancelReason || (cancelReason === 'Other' && !cancelCustomText.trim()))
                                                ? Colors.light.border
                                                : Colors.light.red,
                                            justifyContent: 'center', alignItems: 'center',
                                        }}
                                    >
                                        {isCancelling ? (
                                            <ActivityIndicator size="small" color="#fff" />
                                        ) : (
                                            <Text style={{
                                                fontSize: 15, fontWeight: '700',
                                                color: (!cancelReason || (cancelReason === 'Other' && !cancelCustomText.trim()))
                                                    ? Colors.light.secondaryText
                                                    : '#fff',
                                            }}>
                                                Cancel Ride
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </Modal>
            </View>
        </GestureHandlerRootView>
    );
}
