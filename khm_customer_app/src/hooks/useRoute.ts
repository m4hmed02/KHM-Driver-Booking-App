import { useState, useCallback } from 'react';
import polyline from '@mapbox/polyline';
import Constants from 'expo-constants';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

// In-memory timestamp to prevent repeated calls to Google when daily quota limit (429) is active
let googleQuotaExceededUntil = 0;

/**
 * Fetch driving route from free OpenStreetMap / OSRM routing service.
 * Used as automatic fallback whenever Google Routes API quota is exhausted (429) or unavailable.
 */
async function fetchOSRMRoute(origin: Coordinate, destination: Coordinate): Promise<{
  coords: Coordinate[];
  distance: number;
  duration: string;
} | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coords: Coordinate[] = route.geometry.coordinates.map((pt: [number, number]) => ({
        latitude: pt[1],
        longitude: pt[0],
      }));
      return {
        coords,
        distance: Math.round(route.distance),
        duration: `${Math.round(route.duration)}s`,
      };
    }
  } catch (err) {
    console.warn('[useRoute] OSRM fallback request failed:', err);
  }
  return null;
}

export const useRoute = () => {
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(async (origin: Coordinate, destination: Coordinate) => {
    if (!origin || !destination) return;

    // Check if origin and destination are virtually identical (< 5 meters)
    const dLat = Math.abs(origin.latitude - destination.latitude);
    const dLng = Math.abs(origin.longitude - destination.longitude);
    if (dLat < 0.00005 && dLng < 0.00005) {
      setRouteCoordinates([origin, destination]);
      setDistance(0);
      setDuration('0s');
      return;
    }

    setIsLoading(true);
    setError(null);

    const apiKey =
      process.env.EXPO_PUBLIC_GOOGLE_MAP_API_KEY_ANDROID ||
      Constants.expoConfig?.android?.config?.googleMaps?.apiKey;

    const now = Date.now();
    const canUseGoogle = apiKey && now > googleQuotaExceededUntil;

    if (canUseGoogle) {
      try {
        const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: {
                  latitude: origin.latitude,
                  longitude: origin.longitude,
                },
              },
            },
            destination: {
              location: {
                latLng: {
                  latitude: destination.latitude,
                  longitude: destination.longitude,
                },
              },
            },
            travelMode: 'DRIVE',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const encodedPolyline = route.polyline?.encodedPolyline;
            if (encodedPolyline) {
              const decoded = polyline.decode(encodedPolyline);
              const coords = decoded.map((point: [number, number]) => ({
                latitude: point[0],
                longitude: point[1],
              }));
              setRouteCoordinates(coords);
            }
            setDistance(route.distanceMeters ?? null);
            setDuration(route.duration ?? null);
            setIsLoading(false);
            return;
          }
        } else {
          if (response.status === 429) {
            // Rate limit / daily quota limit exceeded. Backoff from Google for 15 minutes.
            googleQuotaExceededUntil = Date.now() + 15 * 60 * 1000;
            console.warn('[useRoute] Google Routes API 429 (Daily Quota Exceeded). Seamlessly switching to OSRM road routing.');
          } else {
            console.warn(`[useRoute] Google Routes API returned status ${response.status}. Falling back to OSRM.`);
          }
        }
      } catch (err) {
        console.warn('[useRoute] Google Routes API error. Falling back to OSRM:', err);
      }
    }

    // ── Fallback: OSRM (Free OpenStreetMap turn-by-turn road network) ──────────
    const osrmResult = await fetchOSRMRoute(origin, destination);
    if (osrmResult && osrmResult.coords.length > 0) {
      setRouteCoordinates(osrmResult.coords);
      setDistance(osrmResult.distance);
      setDuration(osrmResult.duration);
      setError(null);
      setIsLoading(false);
      return;
    }

    // If both failed, connect points as last fallback
    setRouteCoordinates([origin, destination]);
    setError('Could not calculate road route.');
    setIsLoading(false);
  }, []);

  return { fetchRoute, routeCoordinates, distance, duration, isLoading, error, clearRoute: useCallback(() => {
    setRouteCoordinates([]);
    setDistance(null);
    setDuration(null);
    setError(null);
  }, []) };
};
