import { useState, useCallback } from 'react';
import polyline from '@mapbox/polyline';
import Constants from 'expo-constants';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export const useRoute = () => {
  const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(async (origin: Coordinate, destination: Coordinate) => {
    setIsLoading(true);
    setError(null);
    
    // Try to get the API key from EXPO_PUBLIC variable, fallback to app.config.js/app.json
    const apiKey = 
      process.env.EXPO_PUBLIC_GOOGLE_MAP_API_KEY_ANDROID || 
      Constants.expoConfig?.android?.config?.googleMaps?.apiKey;

    if (!apiKey) {
      setError('Google Maps API key not found');
      setRouteCoordinates([origin, destination]);
      setIsLoading(false);
      return;
    }

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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Routes API Error Response:', response.status, errorText);
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Decode polyline using @mapbox/polyline
        const encodedPolyline = route.polyline?.encodedPolyline;
        if (encodedPolyline) {
          const decoded = polyline.decode(encodedPolyline);
          const coords = decoded.map((point: [number, number]) => ({
            latitude: point[0],
            longitude: point[1],
          }));
          setRouteCoordinates(coords);
        }

        setDistance(route.distanceMeters);
        setDuration(route.duration);
      } else {
        setError('No route found');
        setRouteCoordinates([origin, destination]);
      }
    } catch (err) {
      // NOTE: If this fails with a 403 Forbidden or similar, check your Google Cloud API key's "Application restrictions".
      // If it's set to "Android apps", it will block REST/HTTP calls like this fetch() request.
      // The Routes API requires the key to have no restriction or a different restriction type (like IP or HTTP referrers),
      // since the "Android apps" restriction only works for native SDK calls.
      // Also, verify that your Google Cloud Console Billing status is "Active".
      console.error('fetchRoute error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred fetching the route');
      setRouteCoordinates([origin, destination]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { fetchRoute, routeCoordinates, distance, duration, isLoading, error };
};
