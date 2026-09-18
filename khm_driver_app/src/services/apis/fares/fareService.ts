import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { FareSetting, CalculateFarePayload, CalculateFareResponse } from './type';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const getAuthHeader = async () => {
    const token = await SecureStore.getItemAsync('user_token');
    return { Authorization: `Bearer ${token}` };
};

export const getFareSettingsApi = async (): Promise<FareSetting[]> => {
    const headers = await getAuthHeader();
    try {
        const response = await axios.get(`${API_URL}/fares`, { headers });
        return response.data;
    } catch (error: any) {
        const message = error.response?.data?.message || 'Failed to fetch fare settings';
        throw new Error(message);
    }
};

export const calculateFareApi = async (payload: CalculateFarePayload): Promise<CalculateFareResponse> => {
    const headers = await getAuthHeader();
    try {
        const response = await axios.post(`${API_URL}/fares/calculate`, payload, { headers });
        return response.data;
    } catch (error: any) {
        const message = error.response?.data?.message || 'Failed to calculate fare';
        throw new Error(message);
    }
};