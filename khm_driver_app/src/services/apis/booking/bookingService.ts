import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Booking } from './type';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const getAuthHeader = async () => {
  const token = await SecureStore.getItemAsync('user_token');
  return { Authorization: `Bearer ${token}` };
};

// Fetch all rides currently in 'requesting' status — used by the driver home feed
export const getAvailableBookingsApi = async (): Promise<Booking[]> => {
  const headers = await getAuthHeader();
  try {
    const response = await axios.get(`${API_URL}/bookings/available`, { headers });
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.message || 'Failed to fetch available bookings';
    throw new Error(message);
  }
};

// Fetch a single booking by ID — used for polling active ride state
export const getBookingStatusApi = async (bookingId: string): Promise<Booking> => {
  const headers = await getAuthHeader();
  try {
    const response = await axios.get(`${API_URL}/bookings/${bookingId}`, { headers });
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.message || 'Failed to fetch booking status';
    throw new Error(message);
  }
};

// Update the booking status through the active ride lifecycle
// (arriving → started → completed)
export const updateBookingStatusApi = async (
  bookingId: string,
  status: Booking['status']
): Promise<Booking> => {
  const headers = await getAuthHeader();
  try {
    const response = await axios.patch(
      `${API_URL}/bookings/${bookingId}/status`,
      { status },
      { headers }
    );
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.message || 'Failed to update booking status';
    throw new Error(message);
  }
};

// Cancel an active booking with an optional reason (works before and after starting ride)
export const cancelBookingApi = async (bookingId: string, reason?: string): Promise<void> => {
  const headers = await getAuthHeader();
  try {
    await axios.delete(`${API_URL}/bookings/${bookingId}`, {
      headers,
      data: reason ? { reason } : undefined,
    });
  } catch (error: any) {
    const message = error.response?.data?.message || error.message || 'Failed to cancel booking';
    throw new Error(message);
  }
};

// Submit or update the driver's fare offer on a ride request
export const makeDriverOfferApi = async (bookingId: string, fare: number): Promise<Booking> => {
  const headers = await getAuthHeader();
  try {
    const response = await axios.post(
      `${API_URL}/bookings/${bookingId}/offers`,
      { fare },
      { headers }
    );
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.message || 'Failed to submit offer';
    throw new Error(message);
  }
};

// Fetch all scheduled bookings available for drivers to accept
export const getScheduledBookingsApi = async (): Promise<Booking[]> => {
  const headers = await getAuthHeader();
  try {
    const response = await axios.get(`${API_URL}/bookings/scheduled`, { headers });
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.message || 'Failed to fetch scheduled bookings';
    throw new Error(message);
  }
};

// Accept a scheduled booking directly (no bidding for scheduled rides)
export const acceptScheduledBookingApi = async (bookingId: string): Promise<Booking> => {
  const headers = await getAuthHeader();
  try {
    const response = await axios.patch(
      `${API_URL}/bookings/${bookingId}/accept-scheduled`,
      {},
      { headers }
    );
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.message || 'Failed to accept scheduled booking';
    throw new Error(message);
  }
};

// Fetch in-ride chat messages for a specific booking
export const getBookingMessagesApi = async (bookingId: string): Promise<any[]> => {
  const headers = await getAuthHeader();
  try {
    const response = await axios.get(`${API_URL}/bookings/${bookingId}/messages`, { headers });
    return response.data || [];
  } catch (error: any) {
    console.warn('[getBookingMessagesApi] Failed to load messages:', error?.message);
    return [];
  }
};

// Fetch all ride history for the logged-in driver
export const getMyBookingsApi = async (): Promise<Booking[]> => {
  const headers = await getAuthHeader();
  try {
    const response = await axios.get(`${API_URL}/bookings/my`, { headers });
    return response.data || [];
  } catch (error: any) {
    const message = error.response?.data?.message || 'Failed to fetch ride history';
    throw new Error(message);
  }
};
