import axios from 'axios';
import {
    LoginPayload,
    LoginResponse,
    RegisterPayload,
    User,
    VerifyLoginOtpPayload,
    SendRegisterOtpPayload,
    VerifyRegisterOtpPayload
} from './type';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const loginApi = async (payload: LoginPayload): Promise<LoginResponse> => {
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

export const verifyLoginOtpApi = async (payload: VerifyLoginOtpPayload): Promise<User> => {
    const response = await fetch(`${API_URL}/auth/verify-login-otp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
    }

    return data;
};

export const sendRegisterOtpApi = async (payload: SendRegisterOtpPayload): Promise<{ success: boolean; phone: string; message: string }> => {
    const response = await fetch(`${API_URL}/auth/send-register-otp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Failed to send registration OTP');
    }

    return data;
};

export const verifyRegisterOtpApi = async (payload: VerifyRegisterOtpPayload): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_URL}/auth/verify-register-otp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Invalid or expired OTP');
    }

    return data;
};

export const resendOtpApi = async (phone: string, purpose: 'login' | 'register'): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, purpose }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Failed to resend OTP');
    }

    return data;
};

export const registerApi = async (payload: RegisterPayload): Promise<User> => {
    const formData = new FormData();
    formData.append('name', payload.name);
    formData.append('phone', payload.phone);
    formData.append('email', payload.email);
    formData.append('password', payload.password);
    formData.append('otp', payload.otp);
    if (payload.role) {
        formData.append('role', payload.role);
    }

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