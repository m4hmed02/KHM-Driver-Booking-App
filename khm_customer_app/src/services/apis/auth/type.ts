export interface User {
    _id: string;
    name: string;
    phone: string;
    email: string;
    avatar: string;
    token: string;
}

export interface LoginPayload {
    phone: string;
    password: string;
}

export interface RegisterPayload {
    name: string;
    phone: string;
    email: string;
    password: string;
    avatar?: {
        uri: string;
        name: string;
        type: string;
    };
}