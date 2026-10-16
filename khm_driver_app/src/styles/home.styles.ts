import { Dimensions, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },

    // ─── Map ──────────────────────────────────────────────────────────────────
    map: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    // ─── Header overlay (on top of map) ──────────────────────────────────────
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    menuButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.light.background,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 4,
    },
    recenterButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.light.background,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 4,
    },

    // ─── Marker callout ───────────────────────────────────────────────────────
    markerCallout: {
        backgroundColor: Colors.light.background,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
        minWidth: 80,
        alignItems: 'center',
    },
    markerFare: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.light.primary,
    },
    markerAddress: {
        fontSize: 10,
        color: Colors.light.secondaryText,
        marginTop: 2,
        textAlign: 'center',
    },

    // ─── Bottom Sheet ─────────────────────────────────────────────────────────
    sheetHeader: {
        paddingHorizontal: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sheetTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.light.text,
    },
    sheetCountBadge: {
        backgroundColor: Colors.light.success,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
    },
    sheetCountText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.light.primary,
    },
    rideList: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 24,
    },

    // ─── Empty / Loading states ───────────────────────────────────────────────
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 24,
    },
    emptyIcon: {
        marginBottom: 12,
        opacity: 0.35,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 13,
        color: Colors.light.secondaryText,
        textAlign: 'center',
        lineHeight: 18,
    },

    // ─── Ride Request Card ────────────────────────────────────────────────────
    rideCard: {
        backgroundColor: Colors.light.background,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.light.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    rideCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    fareContainer: {
        alignItems: 'flex-end',
    },
    fareLabel: {
        fontSize: 11,
        color: Colors.light.secondaryText,
        marginBottom: 2,
    },
    fareAmount: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.light.primary,
    },
    bookingType: {
        fontSize: 11,
        color: Colors.light.secondaryText,
        backgroundColor: Colors.light.border,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    customerName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
    },
    customerPhone: {
        fontSize: 12,
        color: Colors.light.secondaryText,
        marginTop: 1,
    },
    // Timeline route display
    routeContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 10,
    },
    routeTimeline: {
        alignItems: 'center',
        paddingTop: 3,
        width: 14,
    },
    routeDotGreen: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.light.primary,
        borderWidth: 2,
        borderColor: Colors.light.primary,
    },
    routeLine: {
        width: 2,
        flex: 1,
        backgroundColor: Colors.light.border,
        marginVertical: 3,
        minHeight: 18,
    },
    routeDotBlack: {
        width: 10,
        height: 10,
        borderRadius: 2,
        backgroundColor: Colors.light.text,
    },
    routeAddresses: {
        flex: 1,
        gap: 10,
    },
    routeAddress: {
        fontSize: 13,
        color: Colors.light.text,
        lineHeight: 18,
    },
    routeAddressSecondary: {
        fontSize: 13,
        color: Colors.light.secondaryText,
        lineHeight: 18,
    },
    // Ride card footer
    rideCardFooter: {
        flexDirection: 'row',
        gap: 10,
    },
    offerButton: {
        flex: 1,
        height: 44,
        borderRadius: 10,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    offerButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    offerButtonRequested: {
        backgroundColor: '#4CAF50',
        opacity: 0.88,
    },
    offerButtonRequestedContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewButton: {
        height: 44,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewButtonText: {
        color: Colors.light.primary,
        fontSize: 14,
        fontWeight: '600',
    },

    // ─── Offer Modal ──────────────────────────────────────────────────────────
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: Colors.light.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 32,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.light.border,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.light.text,
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 13,
        color: Colors.light.secondaryText,
        marginBottom: 20,
    },
    modalSection: {
        marginBottom: 20,
    },
    modalSectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.light.secondaryText,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    modalDetailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 10,
    },
    modalDetailText: {
        fontSize: 14,
        color: Colors.light.text,
        flex: 1,
        lineHeight: 20,
    },
    fareRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.success,
        borderRadius: 12,
        padding: 14,
        gap: 10,
    },
    fareRowText: {
        flex: 1,
    },
    fareRowLabel: {
        fontSize: 12,
        color: Colors.light.secondaryText,
        marginBottom: 2,
    },
    fareRowAmount: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.light.primary,
    },
    // Fare input
    fareInputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.light.text,
        marginBottom: 8,
    },
    fareInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: Colors.light.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 52,
        gap: 8,
    },
    fareInputRowFocused: {
        borderColor: Colors.light.primary,
    },
    fareInputCurrency: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.secondaryText,
    },
    fareInput: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: Colors.light.text,
    },
    fareHint: {
        fontSize: 12,
        color: Colors.light.secondaryText,
        marginTop: 6,
    },
    submitOfferButton: {
        height: 52,
        borderRadius: 12,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    submitOfferButtonDisabled: {
        opacity: 0.5,
    },
    submitOfferButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelModalButton: {
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    cancelModalButtonText: {
        fontSize: 14,
        color: Colors.light.secondaryText,
    },

    // ─── Tab bar ──────────────────────────────────────────────────────────────
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
        gap: 8,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: 'transparent',
    },
    tabItemActive: {
        backgroundColor: Colors.light.success,
    },
    tabLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.light.secondaryText,
    },
    tabLabelActive: {
        color: Colors.light.primaryDark,
    },
    tabBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: Colors.light.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    tabBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
    },

    // ─── Scheduled time badge (on ScheduledRideCard) ──────────────────────────
    scheduledTimeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: Colors.light.success,
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 10,
    },
    scheduledTimeText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.light.primaryDark,
    },

    // ─── Waiting for response overlay ─────────────────────────────────────────
    waitingContainer: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    waitingTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.light.text,
        marginTop: 16,
        marginBottom: 6,
    },
    waitingSubtitle: {
        fontSize: 13,
        color: Colors.light.secondaryText,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20,
    },
    cancelOfferButton: {
        height: 44,
        paddingHorizontal: 24,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: Colors.light.red,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelOfferButtonText: {
        color: Colors.light.red,
        fontSize: 14,
        fontWeight: '600',
    },
});
