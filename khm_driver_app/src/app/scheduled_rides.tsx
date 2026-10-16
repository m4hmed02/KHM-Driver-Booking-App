/**
 * Driver — Scheduled Rides
 *
 * Two tabs:
 *   Available  — scheduled bookings in 'requesting' status the driver can accept
 *   My Rides   — scheduled bookings already accepted by this driver
 *
 * Accepting a scheduled booking navigates the driver directly to active_ride
 * where the normal lifecycle (I Have Arrived → Start Ride → Complete Ride) runs.
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
    acceptScheduledBookingApi,
    getScheduledBookingsApi,
    getBookingStatusApi,
    updateBookingStatusApi,
} from '../services/apis/booking/bookingService';
import { Booking } from '../services/apis/booking/type';
import { useAuth } from '../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function timeUntil(iso: string | null): string {
    if (!iso) return '';
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return 'Now';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `in ${h}h ${m}m`;
    return `in ${m}m`;
}

function statusLabel(status: Booking['status']): { text: string; color: string; bg: string } {
    switch (status) {
        case 'requesting': return { text: 'Open',        color: Colors.light.amber,      bg: '#FEF3C7' };
        case 'accepted':   return { text: 'Accepted',    color: Colors.light.primaryDark, bg: Colors.light.success };
        case 'arriving':   return { text: 'Arriving',    color: Colors.light.primaryDark, bg: Colors.light.success };
        case 'started':    return { text: 'In Progress', color: Colors.light.blue,        bg: '#EFF6FF' };
        case 'completed':  return { text: 'Completed',   color: '#15803D',                bg: '#DCFCE7' };
        case 'cancelled':  return { text: 'Cancelled',   color: Colors.light.red,         bg: '#FEE2E2' };
        default:           return { text: status,        color: Colors.light.secondaryText, bg: Colors.light.border };
    }
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface AvailableCardProps {
    booking: Booking;
    onAccept: (booking: Booking) => void;
    accepting: boolean;
}

function AvailableCard({ booking, onAccept, accepting }: AvailableCardProps) {
    const until = timeUntil(booking.scheduledTime);
    return (
        <View style={s.card}>
            {/* Time */}
            <View style={s.timeRow}>
                <MaterialCommunityIcons name="calendar-clock" size={16} color={Colors.light.primaryDark} />
                <Text style={s.timeText}>{formatScheduledTime(booking.scheduledTime)}</Text>
                {until ? <Text style={s.untilBadge}>{until}</Text> : null}
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

            {/* Fare + accept */}
            <View style={s.cardFooter}>
                <View>
                    <Text style={s.fareLabel}>Customer offer</Text>
                    <Text style={s.fareAmount}>AED {booking.estimatedFare?.toFixed(2) ?? '—'}</Text>
                </View>
                <TouchableOpacity
                    style={[s.acceptBtn, accepting && s.btnDisabled]}
                    onPress={() => onAccept(booking)}
                    disabled={accepting}
                    activeOpacity={0.8}
                >
                    {accepting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                            <Text style={s.acceptBtnText}>Accept</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

interface MyRideCardProps {
    booking: Booking;
    onOpen: (booking: Booking) => void;
}

function MyRideCard({ booking, onOpen }: MyRideCardProps) {
    const badge = statusLabel(booking.status);
    const isActive = ['accepted', 'arriving', 'started'].includes(booking.status);
    return (
        <View style={s.card}>
            <View style={s.cardTopRow}>
                <View style={[s.badge, { backgroundColor: badge.bg }]}>
                    <View style={[s.badgeDot, { backgroundColor: badge.color }]} />
                    <Text style={[s.badgeText, { color: badge.color }]}>{badge.text}</Text>
                </View>
                <Text style={s.timeSmall}>{formatScheduledTime(booking.scheduledTime)}</Text>
            </View>

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

            <View style={s.cardFooter}>
                <Text style={s.fareAmount}>AED {booking.estimatedFare?.toFixed(2) ?? '—'}</Text>
                {isActive && (
                    <TouchableOpacity
                        style={s.openBtn}
                        onPress={() => onOpen(booking)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="navigate-outline" size={15} color="#fff" />
                        <Text style={s.openBtnText}>Open Ride</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ScheduledRides() {
    const router = useRouter();
    const navigation = useNavigation();
    const { user } = useAuth();

    const [available, setAvailable] = useState<Booking[]>([]);
    const [myRides, setMyRides] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [tab, setTab] = useState<'available' | 'my'>('available');

    const fetchData = useCallback(async (showRefresh = false) => {
        if (showRefresh) setIsRefreshing(true);
        try {
            const all = await getScheduledBookingsApi();
            const driverId = (user as any)?._id ?? '';

            // Available = requesting status, not yet accepted by anyone
            setAvailable(all.filter(b => b.status === 'requesting'));

            // My rides = accepted by this driver (driver field matches)
            setMyRides(
                all.filter(b => {
                    if (!b.driver) return false;
                    const id = typeof b.driver === 'string' ? b.driver : (b.driver as any)._id;
                    return id === driverId;
                })
            );
        } catch {
            // silent
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Poll every 15 s to catch new scheduled requests
    useEffect(() => {
        const id = setInterval(() => fetchData(), 15000);
        return () => clearInterval(id);
    }, [fetchData]);

    const handleAccept = useCallback(async (booking: Booking) => {
        Alert.alert(
            'Accept Ride',
            `Accept this scheduled ride for ${formatScheduledTime(booking.scheduledTime)}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Accept',
                    onPress: async () => {
                        setAcceptingId(booking._id);
                        try {
                            await acceptScheduledBookingApi(booking._id);
                            // Navigate to active_ride immediately
                            router.push({
                                pathname: '/active_ride',
                                params: { bookingId: booking._id },
                            } as any);
                        } catch (err) {
                            Alert.alert('Error', err instanceof Error ? err.message : 'Could not accept ride.');
                        } finally {
                            setAcceptingId(null);
                        }
                    },
                },
            ],
        );
    }, [router]);

    const handleOpen = useCallback((booking: Booking) => {
        router.push({
            pathname: '/active_ride',
            params: { bookingId: booking._id },
        } as any);
    }, [router]);

    const displayed = tab === 'available' ? available : myRides;

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
                        style={[s.tab, tab === 'available' && s.tabActive]}
                        onPress={() => setTab('available')}
                        activeOpacity={0.8}
                    >
                        <Text style={[s.tabText, tab === 'available' && s.tabTextActive]}>
                            Available ({available.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[s.tab, tab === 'my' && s.tabActive]}
                        onPress={() => setTab('my')}
                        activeOpacity={0.8}
                    >
                        <Text style={[s.tabText, tab === 'my' && s.tabTextActive]}>
                            My Rides ({myRides.length})
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {isLoading ? (
                    <View style={s.centred}>
                        <ActivityIndicator size="large" color={Colors.light.primary} />
                        <Text style={s.loadingText}>Loading scheduled rides…</Text>
                    </View>
                ) : displayed.length === 0 ? (
                    <View style={s.centred}>
                        <MaterialCommunityIcons
                            name="calendar-blank-outline"
                            size={52}
                            color={Colors.light.border}
                        />
                        <Text style={s.emptyTitle}>
                            {tab === 'available'
                                ? 'No scheduled rides available'
                                : 'No accepted scheduled rides'}
                        </Text>
                        <Text style={s.emptySubtitle}>
                            {tab === 'available'
                                ? 'Check back later — new rides appear here as customers book them.'
                                : 'Accept a scheduled ride from the Available tab.'}
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={displayed}
                        keyExtractor={item => item._id}
                        renderItem={({ item }) =>
                            tab === 'available' ? (
                                <AvailableCard
                                    booking={item}
                                    onAccept={handleAccept}
                                    accepting={acceptingId === item._id}
                                />
                            ) : (
                                <MyRideCard booking={item} onOpen={handleOpen} />
                            )
                        }
                        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={isRefreshing}
                                onRefresh={() => fetchData(true)}
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
    container: { flex: 1, backgroundColor: Colors.light.background },

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
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.light.success,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.light.text },

    tabs: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 4,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        padding: 4,
    },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
    tabActive: {
        backgroundColor: Colors.light.background,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    tabText: { fontSize: 14, fontWeight: '500', color: Colors.light.secondaryText },
    tabTextActive: { color: Colors.light.text, fontWeight: '700' },

    centred: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 60 },
    loadingText: { fontSize: 14, color: Colors.light.secondaryText, marginTop: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text, textAlign: 'center' },
    emptySubtitle: {
        fontSize: 13, color: Colors.light.secondaryText,
        textAlign: 'center', paddingHorizontal: 40,
    },

    card: {
        backgroundColor: Colors.light.background,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.light.border,
        padding: 16,
        marginBottom: 12,
        gap: 12,
    },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    badge: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    badgeDot: { width: 7, height: 7, borderRadius: 3.5 },
    badgeText: { fontSize: 12, fontWeight: '600' },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    timeText: { fontSize: 14, fontWeight: '600', color: Colors.light.text, flex: 1 },
    timeSmall: { fontSize: 12, color: Colors.light.secondaryText },
    untilBadge: {
        fontSize: 12, fontWeight: '600',
        color: Colors.light.primaryDark,
        backgroundColor: Colors.light.success,
        paddingHorizontal: 8, paddingVertical: 2,
        borderRadius: 10,
    },

    routeBox: {
        borderRadius: 10, borderWidth: 1,
        borderColor: Colors.light.border,
        padding: 12, gap: 6,
    },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dotGreen: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.light.primary },
    routeDivider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.light.border, marginLeft: 20 },
    routeText: { flex: 1, fontSize: 13, color: Colors.light.text, fontWeight: '500' },

    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    fareLabel: { fontSize: 12, color: Colors.light.secondaryText, marginBottom: 2 },
    fareAmount: { fontSize: 16, fontWeight: '700', color: Colors.light.primaryDark },

    acceptBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 18, height: 44,
        borderRadius: 10,
    },
    acceptBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    openBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: Colors.light.primary,
        paddingHorizontal: 16, height: 44,
        borderRadius: 10,
    },
    openBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
    btnDisabled: { opacity: 0.5 },
});
