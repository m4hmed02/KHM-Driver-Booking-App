import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, Platform,
    StyleSheet, Dimensions, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { getAvailableBookingsApi, makeDriverOfferApi } from '../services/apis/booking/bookingService';
import { Booking } from '../services/apis/booking/type';
import { useRoute } from '../hooks/useRoute';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatDistance = (km: number) =>
    km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

const timeSince = (iso: string) => {
    const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    return `${Math.floor(diffMin / 60)}h ago`;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AvailableRequests() {
    const router = useRouter();
    const mapRef = useRef<MapView>(null);
    const { fetchRoute, routeCoordinates, isLoading: isRouteLoading } = useRoute();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [offerFare, setOfferFare] = useState<number>(0);
    const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Data fetching ──────────────────────────────────────────────────────────

    const fetchBookings = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setIsRefreshing(true);
        try {
            const data = await getAvailableBookingsApi();
            setBookings(data);
        } catch {
            // silent — keep stale list visible
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    // Initial load + 8-second poll to keep the list fresh
    useEffect(() => {
        fetchBookings();
        pollRef.current = setInterval(() => fetchBookings(), 8000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [fetchBookings]);

    // ── Selection: show on map only when driver taps a row ────────────────────

    const handleSelectBooking = useCallback((booking: Booking) => {
        // Tapping the same row a second time deselects it
        if (selectedBooking?._id === booking._id) {
            setSelectedBooking(null);
            return;
        }
        setSelectedBooking(booking);
        setOfferFare(booking.estimatedFare ?? 0);

        // Fetch the polyline between pickup and dropoff
        fetchRoute(
            { latitude: booking.pickupLocation.latitude, longitude: booking.pickupLocation.longitude },
            { latitude: booking.dropoffLocation.latitude, longitude: booking.dropoffLocation.longitude },
        );
    }, [selectedBooking, fetchRoute]);

    // Fit map to show full route once polyline is ready — ONLY when there is
    // a selected booking driving this route fetch.
    useEffect(() => {
        if (!selectedBooking || routeCoordinates.length === 0 || !mapRef.current) return;
        const { pickupLocation, dropoffLocation } = selectedBooking;
        mapRef.current.fitToCoordinates(
            [
                { latitude: pickupLocation.latitude, longitude: pickupLocation.longitude },
                { latitude: dropoffLocation.latitude, longitude: dropoffLocation.longitude },
                ...routeCoordinates,
            ],
            {
                edgePadding: {
                    top: 80,
                    right: 50,
                    // leave room for the bottom detail card (~40% of screen)
                    bottom: SCREEN_HEIGHT * 0.42,
                    left: 50,
                },
                animated: true,
            },
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeCoordinates]);

    // ── Offer submission ───────────────────────────────────────────────────────

    const handleSubmitOffer = async () => {
        if (!selectedBooking) return;
        if (offerFare <= 0) {
            Alert.alert('Invalid fare', 'Please enter a fare greater than 0.');
            return;
        }
        setIsSubmittingOffer(true);
        try {
            await makeDriverOfferApi(selectedBooking._id, offerFare);
            Alert.alert('Offer sent', 'Your fare offer has been sent to the customer.', [
                { text: 'OK', onPress: () => setSelectedBooking(null) },
            ]);
        } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send offer.');
        } finally {
            setIsSubmittingOffer(false);
        }
    };

    // ── Render helpers ─────────────────────────────────────────────────────────

    const renderBookingRow = ({ item }: { item: Booking }) => {
        const isSelected = selectedBooking?._id === item._id;
        return (
            <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => handleSelectBooking(item)}
                style={[s.row, isSelected && s.rowSelected]}
            >
                {/* Left: route dots */}
                <View style={s.dotColumn}>
                    <View style={s.dotPickup} />
                    <View style={s.dotLine} />
                    <MaterialCommunityIcons name="flag-checkered" size={14} color={Colors.light.text} />
                </View>

                {/* Centre: addresses */}
                <View style={s.addressColumn}>
                    <Text style={s.addressText} numberOfLines={1}>
                        {item.pickupLocation.address}
                    </Text>
                    <Text style={s.addressTextSmall} numberOfLines={1}>
                        {item.dropoffLocation.address}
                    </Text>
                </View>

                {/* Right: fare + time */}
                <View style={s.metaColumn}>
                    <Text style={s.fareText}>AED {item.estimatedFare?.toFixed(2) ?? '—'}</Text>
                    <Text style={s.timeText}>{timeSince(item.createdAt)}</Text>
                </View>

                {/* Selected checkmark */}
                {isSelected && (
                    <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={Colors.light.primary}
                        style={{ marginLeft: 6 }}
                    />
                )}
            </TouchableOpacity>
        );
    };

    // ── Map markers for selected booking ──────────────────────────────────────

    const mapContent = selectedBooking ? (
        <>
            {routeCoordinates.length > 0 && (
                <Polyline
                    coordinates={routeCoordinates}
                    strokeColor={Colors.light.primary}
                    strokeWidth={5}
                />
            )}
            {/* Pickup marker */}
            <Marker
                coordinate={{
                    latitude: selectedBooking.pickupLocation.latitude,
                    longitude: selectedBooking.pickupLocation.longitude,
                }}
            >
                <View style={s.markerWrap}>
                    <View style={s.markerPickup}>
                        <MaterialCommunityIcons name="walk" size={18} color="#fff" />
                    </View>
                    <View style={s.markerPin} />
                    <View style={s.markerDot} />
                </View>
            </Marker>
            {/* Dropoff marker */}
            <Marker
                coordinate={{
                    latitude: selectedBooking.dropoffLocation.latitude,
                    longitude: selectedBooking.dropoffLocation.longitude,
                }}
            >
                <View style={s.markerWrap}>
                    <View style={s.markerDropoff}>
                        <MaterialCommunityIcons name="flag-checkered" size={16} color="#fff" />
                    </View>
                    <View style={s.markerPin} />
                    <View style={s.markerDot} />
                </View>
            </Marker>
        </>
    ) : null;

    // ── Bottom detail card (shown when a row is selected) ─────────────────────

    const detailCard = selectedBooking ? (
        <View style={s.detailCard}>
            {/* Route summary */}
            <View style={s.detailRouteBox}>
                <View style={s.detailRow}>
                    <View style={s.dotPickupSm} />
                    <Text style={s.detailAddr} numberOfLines={2}>
                        {selectedBooking.pickupLocation.address}
                    </Text>
                </View>
                <View style={[s.detailRow, { marginTop: 8 }]}>
                    <MaterialCommunityIcons name="flag-checkered" size={12} color={Colors.light.text} />
                    <Text style={[s.detailAddr, { marginLeft: 8 }]} numberOfLines={2}>
                        {selectedBooking.dropoffLocation.address}
                    </Text>
                </View>
            </View>

            {/* Fare row: show customer offer + let driver adjust */}
            <View style={s.fareRow}>
                <TouchableOpacity
                    onPress={() => setOfferFare(f => Math.max(0, f - 5))}
                    style={[s.fareBtn, offerFare <= 0 && s.fareBtnDisabled]}
                    activeOpacity={0.75}
                >
                    <Ionicons
                        name="remove"
                        size={20}
                        color={offerFare <= 0 ? Colors.light.secondaryText : '#fff'}
                    />
                </TouchableOpacity>

                <View style={{ alignItems: 'center' }}>
                    <Text style={s.fareLabel}>Your offer</Text>
                    <Text style={s.fareAmount}>AED {offerFare.toFixed(2)}</Text>
                    {selectedBooking.estimatedFare != null && (
                        <Text style={s.fareCustomerHint}>
                            Customer offer: AED {selectedBooking.estimatedFare.toFixed(2)}
                        </Text>
                    )}
                </View>

                <TouchableOpacity
                    onPress={() => setOfferFare(f => f + 5)}
                    style={s.fareBtn}
                    activeOpacity={0.75}
                >
                    <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Loading route hint */}
            {isRouteLoading && (
                <View style={s.routeLoadingRow}>
                    <ActivityIndicator size="small" color={Colors.light.primary} />
                    <Text style={s.routeLoadingText}>Loading route…</Text>
                </View>
            )}

            {/* Actions */}
            <View style={s.detailActions}>
                <TouchableOpacity
                    onPress={() => setSelectedBooking(null)}
                    style={s.cancelBtn}
                    activeOpacity={0.8}
                >
                    <Text style={s.cancelBtnText}>Dismiss</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleSubmitOffer}
                    disabled={isSubmittingOffer}
                    style={s.offerBtn}
                    activeOpacity={0.8}
                >
                    {isSubmittingOffer ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={s.offerBtnText}>Send Offer</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    ) : null;

    // ── Main render ────────────────────────────────────────────────────────────

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: Colors.light.background }}>

                {/* Back button */}
                <TouchableOpacity
                    style={s.backBtn}
                    onPress={() => router.back()}
                    activeOpacity={0.8}
                >
                    <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
                </TouchableOpacity>

                {/* ── Map (top 55% of screen) ── */}
                <MapView
                    ref={mapRef}
                    style={s.map}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    showsUserLocation
                    initialRegion={{
                        latitude: 25.1972,
                        longitude: 55.2744,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    }}
                >
                    {mapContent}
                </MapView>

                {/* ── Bottom panel ── */}
                <View style={s.bottomPanel}>
                    {/* Header */}
                    <View style={s.panelHeader}>
                        <Text style={s.panelTitle}>Available Requests</Text>
                        {!isLoading && (
                            <Text style={s.panelCount}>{bookings.length} nearby</Text>
                        )}
                    </View>

                    {/* List */}
                    {isLoading ? (
                        <View style={s.centred}>
                            <ActivityIndicator size="large" color={Colors.light.primary} />
                            <Text style={s.loadingText}>Finding requests…</Text>
                        </View>
                    ) : bookings.length === 0 ? (
                        <View style={s.centred}>
                            <MaterialCommunityIcons
                                name="car-off"
                                size={40}
                                color={Colors.light.border}
                            />
                            <Text style={s.emptyText}>No requests right now</Text>
                            <Text style={s.emptySubText}>Pull down to refresh</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={bookings}
                            keyExtractor={item => item._id}
                            renderItem={renderBookingRow}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 12 }}
                            refreshControl={
                                <RefreshControl
                                    refreshing={isRefreshing}
                                    onRefresh={() => fetchBookings(true)}
                                    tintColor={Colors.light.primary}
                                    colors={[Colors.light.primary]}
                                />
                            }
                        />
                    )}
                </View>

                {/* Detail card overlays bottom panel when a row is selected */}
                {detailCard}
            </View>
        </GestureHandlerRootView>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const MAP_HEIGHT = SCREEN_HEIGHT * 0.52;

const s = StyleSheet.create({
    map: {
        width: SCREEN_WIDTH,
        height: MAP_HEIGHT,
    },

    backBtn: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 16,
        zIndex: 100,
        backgroundColor: Colors.light.background,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 5,
    },

    // ── Bottom panel ────────────────────────────────────────────────────────────
    bottomPanel: {
        flex: 1,
        backgroundColor: Colors.light.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: -20,
        paddingHorizontal: 16,
        paddingTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 10,
    },
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    panelTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.light.text,
    },
    panelCount: {
        fontSize: 13,
        color: Colors.light.secondaryText,
    },
    centred: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 40,
        gap: 10,
    },
    loadingText: {
        fontSize: 14,
        color: Colors.light.secondaryText,
        marginTop: 8,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.light.text,
    },
    emptySubText: {
        fontSize: 13,
        color: Colors.light.secondaryText,
    },

    // ── List row ────────────────────────────────────────────────────────────────
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: Colors.light.background,
        borderWidth: 1,
        borderColor: Colors.light.border,
        gap: 10,
    },
    rowSelected: {
        borderColor: Colors.light.primary,
        backgroundColor: Colors.light.success,
    },
    dotColumn: {
        width: 16,
        alignItems: 'center',
        gap: 2,
    },
    dotPickup: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.light.primary,
    },
    dotLine: {
        width: 1.5,
        height: 14,
        backgroundColor: Colors.light.border,
    },
    addressColumn: {
        flex: 1,
        gap: 4,
    },
    addressText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.light.text,
    },
    addressTextSmall: {
        fontSize: 12,
        color: Colors.light.secondaryText,
    },
    metaColumn: {
        alignItems: 'flex-end',
        gap: 2,
    },
    fareText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.light.primaryDark,
    },
    timeText: {
        fontSize: 11,
        color: Colors.light.secondaryText,
    },

    // ── Map markers ─────────────────────────────────────────────────────────────
    markerWrap: {
        alignItems: 'center',
    },
    markerPickup: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: Colors.light.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    markerDropoff: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: Colors.light.text,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    markerPin: {
        width: 2,
        height: 10,
        backgroundColor: Colors.light.text,
    },
    markerDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.light.text,
    },

    // ── Detail card ─────────────────────────────────────────────────────────────
    detailCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.light.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 14,
    },
    detailRouteBox: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.light.border,
        padding: 14,
        marginBottom: 16,
        gap: 2,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dotPickupSm: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.light.primary,
    },
    detailAddr: {
        flex: 1,
        fontSize: 13,
        color: Colors.light.text,
        fontWeight: '500',
    },
    fareRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingHorizontal: 8,
    },
    fareBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.light.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fareBtnDisabled: {
        backgroundColor: Colors.light.border,
    },
    fareLabel: {
        fontSize: 11,
        color: Colors.light.secondaryText,
        fontWeight: '500',
    },
    fareAmount: {
        fontSize: 26,
        fontWeight: '800',
        color: Colors.light.text,
        letterSpacing: -0.5,
    },
    fareCustomerHint: {
        fontSize: 11,
        color: Colors.light.secondaryText,
        marginTop: 2,
    },
    routeLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'center',
        marginBottom: 10,
    },
    routeLoadingText: {
        fontSize: 12,
        color: Colors.light.secondaryText,
    },
    detailActions: {
        flexDirection: 'row',
        gap: 10,
    },
    cancelBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: Colors.light.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.secondaryText,
    },
    offerBtn: {
        flex: 2,
        height: 48,
        borderRadius: 12,
        backgroundColor: Colors.light.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    offerBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
});
