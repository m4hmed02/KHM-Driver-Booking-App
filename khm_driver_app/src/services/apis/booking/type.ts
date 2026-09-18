export interface Location {
    address: string;
    latitude: number;
    longitude: number;
}

export interface CreateBookingPayload {
    pickupLocation: Location;
    dropoffLocation: Location;
    bookingType: 'driver_now' | 'schedule_driver' | 'contract_driver';
    scheduledTime?: string;
    estimatedFare?: number; // Added to pass the user's initial fare offer
    vehicleInfo?: {
        make?: string;
        model?: string;
        plateNumber?: string;
    };
}

export interface DriverInfo {
    _id: string;
    name: string;
    phone: string;
    avatar?: string;
    rating?: number; // Useful for the customer when choosing an offer
}

// NEW: Interface for driver fare offers
export interface Offer {
    _id: string;
    driver: DriverInfo;
    fare: number;
    status: 'pending' | 'accepted' | 'rejected';
}

export interface Booking {
    _id: string;
    customer: DriverInfo | string;
    driver: DriverInfo | string | null;
    pickupLocation: Location;
    dropoffLocation: Location;
    bookingType: string;
    scheduledTime: string | null;
    estimatedFare: number;
    offers: Offer[]; // NEW: Array of offers from different drivers
    status: 'requesting' | 'accepted' | 'arriving' | 'started' | 'completed' | 'cancelled';
    createdAt: string;
    updatedAt: string;
}