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
