import axios from 'axios';
import { LoginPayload, RegisterPayload, User } from './type';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const loginApi = async (payload: LoginPayload): Promise<User> => {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Login failed');
    }

    return data;
};

export const registerApi = async (payload: RegisterPayload): Promise<User> => {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('phone', payload.phone);
    formData.append('email', payload.email);
    formData.append('password', payload.password);

    if (payload.avatar) {
        formData.append('avatar', {
            uri: payload.avatar.uri,
            name: payload.avatar.name || 'avatar.jpg',
            type: payload.avatar.type || 'image/jpeg',
        } as any);
    }

    try {
        const response = await axios.post(`${API_URL}/auth/register`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    } catch (error: any) {
        const message = error.response?.data?.message || 'Registration failed';
        throw new Error(message);
    }
};