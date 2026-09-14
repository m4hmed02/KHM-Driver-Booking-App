export interface FareSetting {
    vehicleType: string;
    baseFare: number;
    perKmRate: number;
    perMinuteRate: number;
}

export interface CalculateFarePayload {
    vehicleType?: string;
    distanceKm: number;
    durationMins: number;
}

export interface CalculateFareResponse {
    recommendedFare: number;
    vehicleType: string;
    distanceKm: number;
    durationMins: number;
}