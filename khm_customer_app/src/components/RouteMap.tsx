import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/use-theme';

interface Coord {
  latitude: number;
  longitude: number;
}

interface RouteMapProps {
  pickupCoords: Coord;
  dropoffCoords: Coord;
}

// ─── Quadratic Bézier arc ────────────────────────────────────────────────────
//
// A great-circle arc between two nearby points (~20 km) is visually identical
// to a straight line. Instead we build a quadratic Bézier curve whose control
// point is displaced *perpendicularly* above the midpoint, giving a clear,
// beautiful arc like flight-path visualisers.
//
// curvature: 0 = straight line, 0.5 = very pronounced bow
// steps: number of polyline segments (more = smoother)

function buildArc(start: Coord, end: Coord, curvature = 0.35, steps = 100): Coord[] {
  // Mid-point in lat/lng space
  const midLat = (start.latitude + end.latitude) / 2;
  const midLng = (start.longitude + end.longitude) / 2;

  // Direction vector from start → end
  const dLat = end.latitude - start.latitude;
  const dLng = end.longitude - start.longitude;

  // Perpendicular direction (rotate 90° counter-clockwise): (dLng, -dLat)
  // Positive offset pushes the control point upward/northward
  const controlLat = midLat + dLng * curvature;
  const controlLng = midLng - dLat * curvature;

  const points: Coord[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;

    // Quadratic Bézier: P(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
    const lat = mt * mt * start.latitude + 2 * mt * t * controlLat + t * t * end.latitude;
    const lng = mt * mt * start.longitude + 2 * mt * t * controlLng + t * t * end.longitude;

    points.push({ latitude: lat, longitude: lng });
  }

  return points;
}

// Compute a bounding region that also fits the arc's apex (control point)
function regionForArc(start: Coord, end: Coord, curvature = 0.35) {
  const dLat = end.latitude - start.latitude;
  const dLng = end.longitude - start.longitude;
  const midLat = (start.latitude + end.latitude) / 2;
  const midLng = (start.longitude + end.longitude) / 2;

  // Apex of the arc (same sign convention as buildArc)
  const apexLat = midLat + dLng * curvature;
  const apexLng = midLng - dLat * curvature;

  const lats = [start.latitude, end.latitude, apexLat];
  const lngs = [start.longitude, end.longitude, apexLng];

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const pad = 0.04; // degrees of padding
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: maxLat - minLat + pad,
    longitudeDelta: maxLng - minLng + pad,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

const CURVATURE = 0.35;

export function RouteMap({ pickupCoords, dropoffCoords }: RouteMapProps) {
  const mapRef = useRef<MapView>(null);
  const theme = useTheme();

  const arcCoords = buildArc(pickupCoords, dropoffCoords, CURVATURE, 100);

  useEffect(() => {
    if (!mapRef.current) return;

    // Fit the map so the full arc (including its apex) is visible
    setTimeout(() => {
      mapRef.current?.fitToCoordinates(arcCoords, {
        edgePadding: { top: 60, right: 60, bottom: 80, left: 60 },
        animated: true,
      });
    }, 500);
  }, [pickupCoords, dropoffCoords]);

  const initialRegion = regionForArc(pickupCoords, dropoffCoords, CURVATURE);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
      >
        {/* ── Outer glow / halo ── */}
        <Polyline
          coordinates={arcCoords}
          strokeColor={`${theme.primary}33`} // 20 % opacity
          strokeWidth={12}
        />

        {/* ── Main arc line ── */}
        <Polyline
          coordinates={arcCoords}
          strokeColor={theme.primary}
          strokeWidth={3.5}
        />

        {/* ── Pickup Marker ── */}
        <Marker coordinate={pickupCoords} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.markerWrapper}>
            <View style={[styles.pulseRing, { borderColor: theme.primary }]} />
            <View style={[styles.markerRing, { borderColor: theme.primary }]}>
              <View style={[styles.markerDot, { backgroundColor: theme.primary }]} />
            </View>
          </View>
        </Marker>

        {/* ── Dropoff Marker ── */}
        <Marker coordinate={dropoffCoords} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.dropoffPin}>
            <Ionicons name="location" size={20} color={theme.primary} />
          </View>
        </Marker>
      </MapView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    height: '100%',
    width: '100%',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  markerWrapper: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    opacity: 0.3,
  },
  markerRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dropoffPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
});
