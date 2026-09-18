import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Booking, CreateBookingPayload } from './type';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const getAuthHeader = async () => {
  const token = await SecureStore.getItemAsync('user_token');
  return { Authorization: `Bearer ${token}` };
};

export const createBookingApi = async (payload: CreateBookingPayload): Promise<Booking> => {
  const headers = await getAuthHeader();
  try {
    const response = await axios.post(`${API_URL}/bookings`, payload, { headers });
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.message || 'Failed to create booking';
    throw new Error(message);
  }
};

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

// --- NEW BIDDING APIS ---

// For Driver: Submit or update a fare offer for a ride request
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

// For Customer: Accept a specific driver's fare offer
export const acceptDriverOfferApi = async (bookingId: string, driverId: string): Promise<Booking> => {
  const headers = await getAuthHeader();
  try {
    const response = await axios.patch(
      `${API_URL}/bookings/${bookingId}/accept-offer`,
      { driverId },
      { headers }
    );
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.message || 'Failed to accept driver offer';
    throw new Error(message);
  }
};

// For Customer: Reject a specific driver's fare offer
export const rejectDriverOfferApi = async (bookingId: string, driverId: string): Promise<Booking> => {
  const headers = await getAuthHeader();
  try {
    const response = await axios.patch(
      `${API_URL}/bookings/${bookingId}/reject-offer`,
      { driverId },
      { headers }
    );
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.message || 'Failed to reject driver offer';
    throw new Error(message);
  }
};