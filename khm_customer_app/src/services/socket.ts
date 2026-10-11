/**
 * Socket.io singleton for the Customer App.
 *
 * Usage:
 *   import { getSocket, connectSocket, disconnectSocket, emitCustomerComing } from '@/services/socket';
 *
 *   // Connect once the user is authenticated (pass the JWT token):
 *   connectSocket(token, userId);
 *
 *   // Subscribe to events:
 *   const socket = getSocket();
 *   socket?.on('driver_location_update', ({ latitude, longitude }) => { ... });
 *   socket?.on('booking_status_updated', (booking) => { ... });
 *
 *   // Tell driver "I'm coming" after they tap "Arrived":
 *   emitCustomerComing(bookingId, driverId);
 *
 *   // Clean up on logout:
 *   disconnectSocket();
 */

import { io, Socket } from 'socket.io-client';

// ─── Event type definitions ─────────────────────────────────────────────────

export interface DriverLocationPayload {
    bookingId: string;
    latitude: number;
    longitude: number;
}

export interface BookingStatusUpdatedPayload {
    _id?: string;
    bookingId?: string;
    status: 'requesting' | 'accepted' | 'arriving' | 'started' | 'completed' | 'cancelled';
    [key: string]: any;
}

export interface ServerToClientEvents {
    driver_location_update: (payload: DriverLocationPayload) => void;
    booking_status_updated: (payload: BookingStatusUpdatedPayload) => void;
    new_driver_offer: (booking: any) => void;
}

// ─── Singleton management ────────────────────────────────────────────────────

let socket: Socket<ServerToClientEvents> | null = null;

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

/**
 * Create and connect the socket with the customer's auth token.
 * Safe to call multiple times — will reuse an existing connected socket.
 */
export const connectSocket = (token: string, userId?: string): Socket<ServerToClientEvents> => {
    if (socket?.connected) {
        return socket;
    }

    if (!socket) {
        socket = io(SERVER_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        }) as Socket<ServerToClientEvents>;

        socket.on('connect', () => {
            console.log('[CustomerSocket] Connected:', socket?.id);
            // Re-register userId on reconnect
            if (userId) {
                socket?.emit('register' as any, userId);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('[CustomerSocket] Disconnected:', reason);
        });

        socket.on('connect_error', (err) => {
            console.warn('[CustomerSocket] Connection error:', err.message);
        });

        socket.onAny((eventName, ...args) => {
            console.log(`[CustomerSocket] Event: ${eventName}`, JSON.stringify(args).substring(0, 200));
        });
    }

    if (userId) {
        // Register (or re-register) on the server's userId→socketId map
        socket.emit('register' as any, userId);
    }

    return socket;
};

/**
 * Get the current socket instance. Returns null if not connected.
 */
export const getSocket = (): Socket<ServerToClientEvents> | null => socket;

/**
 * Tell the driver "I'm Coming" after they arrive at the pickup.
 */
export const emitCustomerComing = (bookingId: string, driverId: string): void => {
    if (!socket?.connected) return;
    socket.emit('customer_coming' as any, { bookingId, driverId });
};

/**
 * Disconnect and destroy the socket. Call on logout.
 */
export const disconnectSocket = (): void => {
    if (socket) {
        socket.disconnect();
        socket = null;
        console.log('[CustomerSocket] Manually disconnected and cleared.');
    }
};
