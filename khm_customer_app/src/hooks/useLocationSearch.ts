import { useState, useEffect, useCallback } from 'react';
import Constants from 'expo-constants';

export interface PlaceSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string;
}

export interface PlaceDetails {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export const useLocationSearch = (query: string, isSearching: boolean) => {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getApiKey = () => {
    return (
      process.env.EXPO_PUBLIC_GOOGLE_MAP_API_KEY_ANDROID || 
      Constants.expoConfig?.android?.config?.googleMaps?.apiKey ||
      process.env.EXPO_PUBLIC_GOOGLE_MAP_API_KEY // Fallback
    );
  };

  const fetchSuggestions = useCallback(async (text: string) => {
    if (!text || text.length < 3) {
      setSuggestions([]);
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      setError('Google Maps API key not found');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({
          input: text,
          includedRegionCodes: ['ae'],
        }),
      });

      if (!response.ok) {
        throw new Error(`Autocomplete API failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.suggestions) {
        const parsedSuggestions = data.suggestions
          .filter((s: any) => s.placePrediction)
          .map((s: any) => ({
            placeId: s.placePrediction.placeId,
            primaryText: s.placePrediction.text.text,
            secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text || '',
          }));
        setSuggestions(parsedSuggestions);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Autocomplete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce logic
  useEffect(() => {
    if (!isSearching) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      fetchSuggestions(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query, fetchSuggestions, isSearching]);

  const fetchPlaceDetails = async (placeId: string): Promise<PlaceDetails | null> => {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    try {
      const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'location,formattedAddress',
        },
      });

      if (!response.ok) {
        throw new Error(`Place Details API failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.location && data.formattedAddress) {
        return {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          formattedAddress: data.formattedAddress,
        };
      }
      return null;
    } catch (err) {
      console.error('Place Details error:', err);
      return null;
    }
  };

  const clearSuggestions = () => setSuggestions([]);

  return { suggestions, isLoading, error, fetchPlaceDetails, clearSuggestions };
};
