export interface BookingLocation {
    address: string;
    latitude: number;
    longitude: number;
}

export interface DriverInfo {
    _id: string;
    name: string;
    phone: string;
    avatar?: string;
    rating?: number;
}

export interface CustomerInfo {
    _id: string;
    name: string;
    phone: string;
    avatar?: string;
    rating?: number;
}

export interface Offer {
    _id: string;
    driver: DriverInfo | string;
    fare: number;
    status: 'pending' | 'accepted' | 'rejected';
}

export interface Booking {
    _id: string;
    customer: CustomerInfo | string;
    driver: DriverInfo | string | null;
    pickupLocation: BookingLocation;
    dropoffLocation: BookingLocation;
    bookingType: string;
    scheduledTime: string | null;
    estimatedFare: number;
    offers: Offer[];
    status: 'requesting' | 'accepted' | 'arriving' | 'started' | 'completed' | 'cancelled';
    createdAt: string;
    updatedAt: string;
}
