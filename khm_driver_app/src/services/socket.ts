/**
 * Socket.io singleton for the Driver App.
 *
 * Usage:
 *   import { getSocket, connectSocket, disconnectSocket, emitDriverLocation } from '@/services/socket';
 *
 *   // Connect once the user is authenticated (pass the JWT token):
 *   connectSocket(token);
 *
 *   // Subscribe to events anywhere in the app:
 *   const socket = getSocket();
 *   socket.on('new_booking', (booking) => { ... });
 *
 *   // Emit driver location during an active ride:
 *   emitDriverLocation(bookingId, customerId, latitude, longitude);
 *
 *   // Clean up on logout:
 *   disconnectSocket();
 */

import { io, Socket } from 'socket.io-client';

// ─── Event type definitions ─────────────────────────────────────────────────

import { Booking } from './apis/booking/type';

export interface OfferAcceptedPayload {
    bookingId: string;
    driverId: string;
    booking: Booking;
}

export interface OfferRejectedPayload {
    bookingId: string;
    driverId: string;
}

export interface BookingStatusUpdatedPayload {
    bookingId: string;
    status: Booking['status'];
    booking?: Booking;
    customerId?: string;
}

export interface BookingDeletedPayload {
    bookingId: string;
}

export interface CustomerComingPayload {
    bookingId: string;
}

// Typed server-to-client events
export interface ServerToClientEvents {
    // A new ride request has been placed by a customer (all known aliases)
    new_booking_request: (booking: Booking) => void;
    new_booking: (booking: Booking) => void;
    ride_request: (booking: Booking) => void;
    booking_created: (booking: Booking) => void;
    newBooking: (booking: Booking) => void;
    rideRequest: (booking: Booking) => void;
    // The customer accepted this driver's offer
    offer_accepted: (payload: OfferAcceptedPayload | Booking) => void;
    // The customer rejected this driver's offer
    offer_rejected: (payload: OfferRejectedPayload) => void;
    // A booking's status changed (useful for staying in sync)
    booking_status_updated: (payload: BookingStatusUpdatedPayload) => void;
    // A booking was deleted / cancelled from the database (all known aliases)
    booking_deleted: (payload: BookingDeletedPayload) => void;
    booking_cancelled: (payload: BookingDeletedPayload) => void;
    booking_request_cancelled: (payload: BookingDeletedPayload) => void;
    booking_request_deleted: (payload: BookingDeletedPayload) => void;
    // Customer is on their way to the pickup (sent after driver marks "arrived")
    customer_coming: (payload: CustomerComingPayload) => void;
}

// ─── Singleton management ────────────────────────────────────────────────────

let socket: Socket<ServerToClientEvents> | null = null;

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
// Strip the /api suffix to get the base server URL for Socket.io
const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

/**
 * Create and connect the socket with the driver's auth token.
 * Safe to call multiple times — will reuse an existing connected socket.
 */
export const connectSocket = (token: string): Socket<ServerToClientEvents> => {
    if (socket) {
        return socket;
    }

    socket = io(SERVER_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
    }) as Socket<ServerToClientEvents>;

    socket.on('connect', () => {
        console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
        console.warn('[Socket] Connection error:', err.message);
    });

    // Debug all incoming events
    socket.onAny((eventName, ...args) => {
        console.log(`[Socket] Received event: ${eventName}`, JSON.stringify(args, null, 2));
    });

    return socket;
};

/**
 * Get the current socket instance. Returns null if not connected.
 */
export const getSocket = (): Socket<ServerToClientEvents> | null => socket;

/**
 * Emit the driver's current GPS position to the customer.
 * Call this inside a Location.watchPositionAsync subscription.
 */
export const emitDriverLocation = (
    bookingId: string,
    customerId: string,
    latitude: number,
    longitude: number,
): void => {
    if (!socket?.connected) return;
    socket.emit('driver_location_update' as any, { bookingId, customerId, latitude, longitude });
};

/**
 * Disconnect and destroy the socket. Call on logout.
 */
export const disconnectSocket = (): void => {
    if (socket) {
        socket.disconnect();
        socket = null;
        console.log('[Socket] Manually disconnected and cleared.');
    }
};
