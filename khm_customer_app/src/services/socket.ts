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

export interface ChatMessagePayload {
    bookingId: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
}

export interface ServerToClientEvents {
    driver_location_update: (payload: DriverLocationPayload) => void;
    booking_status_updated: (payload: BookingStatusUpdatedPayload) => void;
    new_driver_offer: (booking: any) => void;
    // In-ride chat message forwarded by the server
    chat_message: (payload: ChatMessagePayload) => void;
}

// ─── Singleton management ────────────────────────────────────────────────────

let socket: Socket<ServerToClientEvents> | null = null;
let registeredUserId: string | null = null;

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';
const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

/**
 * Create and connect the socket with the customer's auth token.
 * Safe to call multiple times — will reuse an existing connected socket.
 */
export const connectSocket = (token: string, userId?: string): Socket<ServerToClientEvents> => {
    if (userId) {
        registeredUserId = userId;
    }

    if (!socket) {
        socket = io(SERVER_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1500,
        }) as Socket<ServerToClientEvents>;

        socket.on('connect', () => {
            console.log('[CustomerSocket] Connected:', socket?.id);
            // Re-register userId on connect and reconnect
            if (registeredUserId) {
                socket?.emit('register' as any, registeredUserId);
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

    if (registeredUserId && socket.connected) {
        socket.emit('register' as any, registeredUserId);
    }

    return socket;
};

/**
 * Joins a specific booking room for real-time broadcasts
 */
export const joinBookingRoom = (bookingId: string): void => {
    if (!socket || !bookingId) return;
    socket.emit('join_booking' as any, bookingId);
};

/**
 * Get the current socket instance. Returns null if not connected.
 */
export const getSocket = (): Socket<ServerToClientEvents> | null => socket;

/**
 * Tell the driver "I'm Coming" after they arrive at the pickup.
 */
export const emitCustomerComing = (bookingId: string, driverId: string, customerName?: string): void => {
    if (!socket?.connected) return;
    socket.emit('customer_coming' as any, { bookingId, driverId, customerName });
};

/**
 * Send a chat message to the other party via the server relay.
 */
export const emitChatMessage = (
    bookingId: string,
    recipientId: string,
    senderId: string,
    senderName: string,
    text: string,
): void => {
    if (!socket?.connected) return;
    socket.emit('chat_message' as any, {
        bookingId,
        recipientId,
        senderId,
        senderName,
        text,
        timestamp: Date.now(),
    });
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
