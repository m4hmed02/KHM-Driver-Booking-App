/**
 * Customer — Scheduled Rides
 *
 * Shows the customer's own bookings that were created as 'schedule_driver'.
 * Active/upcoming rides can be cancelled. Completed/cancelled rides are shown
 * as read-only history cards.
 *
 * Status flow reminder:
 *   requesting → accepted → arriving → started → completed
 *                                               → cancelled
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors } from '../constants/theme';
import {
    deleteBookingApi,
    getMyBookingsApi,
    updateBookingStatusApi,
} from '../services/apis/booking/bookingService';
import { Booking } from '../services/apis/booking/type';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES: Booking['status'][] = ['requesting', 'accepted', 'arriving', 'started'];
const DONE_STATUSES: Booking['status'][] = ['completed', 'cancelled'];

function formatScheduledTime(iso: string | null): string {
    if (!iso) return 'Driver Now';
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function statusLabel(status: Booking['status']): { text: string; color: string; bg: string } {
    switch (status) {
        case 'requesting':   return { text: 'Searching',    color: Colors.light.amber,       bg: '#FEF3C7' };
        case 'accepted':     return { text: 'Driver Found', color: Colors.light.primaryDark,  bg: Colors.light.success };
        case 'arriving':     return { text: 'Arriving',     color: Colors.light.primaryDark,  bg: Colors.light.success };
        case 'started':      return { text: 'In Progress',  color: Colors.light.blue,         bg: '#EFF6FF' };
        case 'completed':    return { text: 'Completed',    color: '#15803D',                 bg: '#DCFCE7' };
        case 'cancelled':    return { text: 'Cancelled',    color: Colors.light.red,          bg: '#FEE2E2' };
        default:             return { text: status,         color: Colors.light.secondaryText, bg: Colors.light.border };
    }
}

// ─── Booking card ─────────────────────────────────────────────────────────────

interface CardProps {
    booking: Booking;
    onCancel: (id: string) => void;
    onTrack: (booking: Booking) => void;
    cancelling: boolean;
}

function BookingCard({ booking, onCancel, onTrack, cancelling }: CardProps) {
    const badge = statusLabel(booking.status);
    const isActive = ACTIVE_STATUSES.includes(booking.status);
    const isTrackable = ['accepted', 'arriving', 'started'].includes(booking.status);

    return (
        <View style={s.card}>
            {/* Status badge */}
            <View style={[s.badge, { backgroundColor: badge.bg }]}>
                <View style={[s.badgeDot, { backgroundColor: badge.color }]} />
                <Text style={[s.badgeText, { color: badge.color }]}>{badge.text}</Text>
            </View>

            {/* Scheduled time */}
            <View style={s.timeRow}>
                <MaterialCommunityIcons
                    name={booking.bookingType === 'schedule_driver' ? 'calendar-clock' : 'flash'}
                    size={16}
                    color={Colors.light.primaryDark}
                />
                <Text style={s.timeText}>{formatScheduledTime(booking.scheduledTime)}</Text>
            </View>

            {/* Route */}
            <View style={s.routeBox}>
                <View style={s.routeRow}>
                    <View style={s.dotGreen} />
                    <Text style={s.routeText} numberOfLines={1}>
                        {booking.pickupLocation.address}
                    </Text>
                </View>
                <View style={s.routeDivider} />
                <View style={s.routeRow}>
                    <MaterialCommunityIcons name="flag-checkered" size={12} color={Colors.light.text} />
                    <Text style={s.routeText} numberOfLines={1}>
                        {booking.dropoffLocation.address}
                    </Text>
                </View>
            </View>

            {/* Fare */}
            <View style={s.fareRow}>
                <Text style={s.fareLabel}>Estimated Fare</Text>
                <Text style={s.fareAmount}>AED {booking.estimatedFare?.toFixed(2) ?? '—'}</Text>
            </View>

            {/* Actions */}
            {isActive && (
                <View style={s.actions}>
                    {isTrackable && (
                        <TouchableOpacity
                            style={s.trackBtn}
                            onPress={() => onTrack(booking)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="navigate" size={15} color="#fff" />
                            <Text style={s.trackBtnText}>Track Ride</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={[s.cancelBtn, cancelling && s.cancelBtnDisabled]}
                        onPress={() => onCancel(booking._id)}
                        disabled={cancelling}
                        activeOpacity={0.8}
                    >
                        {cancelling ? (
                            <ActivityIndicator size="small" color={Colors.light.red} />
                        ) : (
                            <Text style={s.cancelBtnText}>Cancel</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ScheduledRides() {
    const router = useRouter();
    const navigation = useNavigation();

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

    const fetchBookings = useCallback(async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        try {
            const all = await getMyBookingsApi();
            setBookings(all);
        } catch (err) {
            // silent — keep stale list
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const handleCancel = useCallback((id: string) => {
        Alert.alert(
            'Cancel Ride',
            'Are you sure you want to cancel this scheduled ride?',
            [
                { text: 'Keep it', style: 'cancel' },
                {
                    text: 'Cancel Ride',
                    style: 'destructive',
                    onPress: async () => {
                        setCancellingId(id);
                        try {
                            await updateBookingStatusApi(id, 'cancelled');
                            setBookings(prev =>
                                prev.map(b => b._id === id ? { ...b, status: 'cancelled' } : b)
                            );
                        } catch (err) {
                            Alert.alert('Error', err instanceof Error ? err.message : 'Could not cancel.');
                        } finally {
                            setCancellingId(null);
                        }
                    },
                },
            ],
        );
    }, []);

    const handleTrack = useCallback((booking: Booking) => {
        // Navigate to the trip_details screen (or active booking view)
        router.push({ pathname: '/trip_details', params: { bookingId: booking._id } } as any);
    }, [router]);

    const scheduled = bookings.filter(b => b.bookingType === 'schedule_driver');
    const upcoming  = scheduled.filter(b => ACTIVE_STATUSES.includes(b.status))
        .sort((a, b) => new Date(a.scheduledTime ?? 0).getTime() - new Date(b.scheduledTime ?? 0).getTime());
    const past = scheduled.filter(b => DONE_STATUSES.includes(b.status))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const displayed = tab === 'upcoming' ? upcoming : past;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={s.container}>
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity
                        style={s.backBtn}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Scheduled Rides</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Tabs */}
                <View style={s.tabs}>
                    <TouchableOpacity
                        style={[s.tab, tab === 'upcoming' && s.tabActive]}
                        onPress={() => setTab('upcoming')}
                        activeOpacity={0.8}
                    >
                        <Text style={[s.tabText, tab === 'upcoming' && s.tabTextActive]}>
                            Upcoming ({upcoming.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[s.tab, tab === 'past' && s.tabActive]}
                        onPress={() => setTab('past')}
                        activeOpacity={0.8}
                    >
                        <Text style={[s.tabText, tab === 'past' && s.tabTextActive]}>
                            Past ({past.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* List */}
                {isLoading ? (
                    <View style={s.centred}>
                        <ActivityIndicator size="large" color={Colors.light.primary} />
                        <Text style={s.loadingText}>Loading your rides…</Text>
                    </View>
                ) : displayed.length === 0 ? (
                    <View style={s.centred}>
                        <MaterialCommunityIcons
                            name="calendar-blank-outline"
                            size={52}
                            color={Colors.light.border}
                        />
                        <Text style={s.emptyTitle}>
                            {tab === 'upcoming' ? 'No upcoming scheduled rides' : 'No past scheduled rides'}
                        </Text>
                        {tab === 'upcoming' && (
                            <Text style={s.emptySubtitle}>
                                Book a scheduled ride from the home screen.
                            </Text>
                        )}
                    </View>
                ) : (
                    <FlatList
                        data={displayed}
                        keyExtractor={item => item._id}
                        renderItem={({ item }) => (
                            <BookingCard
                                booking={item}
                                onCancel={handleCancel}
                                onTrack={handleTrack}
                                cancelling={cancellingId === item._id}
                            />
                        )}
                        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
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
        </GestureHandlerRootView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 56 : 40,
        paddingBottom: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.light.border,
        backgroundColor: Colors.light.background,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.light.success,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.light.text,
    },

    // Tabs
    tabs: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 4,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 9,
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: Colors.light.background,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.light.secondaryText,
    },
    tabTextActive: {
        color: Colors.light.text,
        fontWeight: '700',
    },

    // Loading / empty
    centred: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingBottom: 60,
    },
    loadingText: {
        fontSize: 14,
        color: Colors.light.secondaryText,
        marginTop: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.text,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 13,
        color: Colors.light.secondaryText,
        textAlign: 'center',
        paddingHorizontal: 40,
    },

    // Card
    card: {
        backgroundColor: Colors.light.background,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.light.border,
        padding: 16,
        marginBottom: 12,
        gap: 12,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    badgeDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    timeText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
    },
    routeBox: {
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.light.border,
        padding: 12,
        gap: 6,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dotGreen: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.light.primary,
    },
    routeDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: Colors.light.border,
        marginLeft: 20,
    },
    routeText: {
        flex: 1,
        fontSize: 13,
        color: Colors.light.text,
        fontWeight: '500',
    },
    fareRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    fareLabel: {
        fontSize: 13,
        color: Colors.light.secondaryText,
    },
    fareAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.light.primaryDark,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
        paddingTop: 4,
    },
    trackBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 44,
        borderRadius: 10,
        backgroundColor: Colors.light.primary,
    },
    trackBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    cancelBtn: {
        flex: 1,
        height: 44,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: Colors.light.red,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtnDisabled: {
        opacity: 0.5,
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.red,
    },
});
