export interface User {
    _id: string;
    name: string;
    phone: string;
    email: string;
    avatar: string;
    role?: string;
    token: string;
}

export interface LoginPayload {
    phone: string;
    password: string;
}

export interface LoginResponse {
    otpRequired?: boolean;
    phone?: string;
    message?: string;
    _id?: string;
    name?: string;
    email?: string;
    avatar?: string;
    role?: string;
    token?: string;
}

export interface VerifyLoginOtpPayload {
    phone: string;
    otp: string;
}

export interface SendRegisterOtpPayload {
    phone: string;
    email?: string;
}

export interface VerifyRegisterOtpPayload {
    phone: string;
    otp: string;
}

export interface RegisterPayload {
    name: string;
    phone: string;
    email: string;
    password: string;
    role?: string;
    otp: string;
    avatar?: {
        uri: string;
        name: string;
        type: string;
    };
}