import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { loginApi, registerApi, verifyLoginOtpApi } from '../services/apis/auth/authService';
import { LoginPayload, LoginResponse, RegisterPayload, User } from '../services/apis/auth/type';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (payload: LoginPayload) => Promise<LoginResponse>;
    verifyLoginOtp: (phone: string, otp: string) => Promise<User>;
    register: (payload: RegisterPayload) => Promise<User>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const loadSession = async () => {
            try {
                const storedSession = await SecureStore.getItemAsync('user_session');
                if (storedSession) {
                    setUser(JSON.parse(storedSession));
                }
            } catch (error) {
                console.error('Session load error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSession();
    }, []);

    const saveSession = async (userData: User) => {
        setUser(userData);
        await SecureStore.setItemAsync('user_session', JSON.stringify(userData));
        if (userData.token) {
            await SecureStore.setItemAsync('user_token', userData.token);
        }
    };

    const login = async (payload: LoginPayload): Promise<LoginResponse> => {
        const res = await loginApi(payload);
        if (res.token && res._id) {
            await saveSession(res as User);
        }
        return res;
    };

    const verifyLoginOtp = async (phone: string, otp: string): Promise<User> => {
        const userData = await verifyLoginOtpApi({ phone, otp });
        await saveSession(userData);
        return userData;
    };

    const register = async (payload: RegisterPayload): Promise<User> => {
        const userData = await registerApi(payload);
        return userData;
    };

    const logout = async () => {
        setUser(null);
        await SecureStore.deleteItemAsync('user_session');
        await SecureStore.deleteItemAsync('user_token');
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, verifyLoginOtp, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be wrapped in an AuthProvider');
    return context;
};