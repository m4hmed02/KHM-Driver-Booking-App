/**
 * useAnimatedMarker
 *
 * Smoothly animates a map marker from its current position to a new
 * coordinate using linear interpolation over `duration` milliseconds.
 * The bearing (rotation angle) is also animated along the shortest
 * angular path so the icon never spins the "long way round".
 *
 * Returns:
 *   - animatedCoord   — a plain {latitude, longitude} object updated every
 *                       animation frame, suitable for <Marker coordinate={…}>.
 *                       We use a ref-driven rAF loop so the coordinate object
 *                       identity changes on every frame, causing react-native-maps
 *                       to re-render the marker position without triggering a full
 *                       React reconciliation cycle.
 *   - animatedHeading — an Animated.Value in degrees, ready to drive a
 *                       transform: [{rotate}] via interpolate().
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

export interface AnimatedCoord {
    latitude: number;
    longitude: number;
}

interface UseAnimatedMarkerOptions {
    /** Animation duration in ms. Default 1800. */
    duration?: number;
}

interface UseAnimatedMarkerReturn {
    /** Live interpolated coordinate — pass straight to <Marker coordinate={…}> */
    animatedCoord: AnimatedCoord | null;
    /** Animated.Value for bearing degrees — use with .interpolate() for rotation */
    animatedHeading: Animated.Value;
    /** Push a new real-world coordinate into the animation pipeline */
    updateTarget: (lat: number, lng: number) => void;
    /** Seed the initial position without any animation (call once on first fix) */
    setInitial: (lat: number, lng: number) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Haversine bearing from (lat1,lng1) → (lat2,lng2), returns 0..360 */
function bearingBetween(
    lat1: number, lng1: number,
    lat2: number, lng2: number,
): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLng = toRad(lng2 - lng1);
    const rlat1 = toRad(lat1);
    const rlat2 = toRad(lat2);
    const y = Math.sin(dLng) * Math.cos(rlat2);
    const x = Math.cos(rlat1) * Math.sin(rlat2) - Math.sin(rlat1) * Math.cos(rlat2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Returns the shortest signed delta to rotate from `from` to `to` degrees.
 * e.g. from=350, to=10 → +20 (not -340).
 */
function shortestAngleDelta(from: number, to: number): number {
    let delta = ((to - from) % 360 + 360) % 360;
    if (delta > 180) delta -= 360;
    return delta;
}

/** Ease-in-out interpolation */
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnimatedMarker(
    options: UseAnimatedMarkerOptions = {},
): UseAnimatedMarkerReturn {
    const DURATION = options.duration ?? 1800;

    const [animatedCoord, setAnimatedCoord] = useState<AnimatedCoord | null>(null);
    const animatedHeading = useRef(new Animated.Value(0)).current;

    const fromCoordRef     = useRef<AnimatedCoord | null>(null);
    const toCoordRef       = useRef<AnimatedCoord | null>(null);
    const startTimeRef     = useRef<number | null>(null);
    const rafRef           = useRef<number | null>(null);
    const currentHeadingRef = useRef<number>(0);
    const headingAnimRef   = useRef<Animated.CompositeAnimation | null>(null);

    // ── rAF animation loop ────────────────────────────────────────────────────

    const tick = useCallback(() => {
        const from = fromCoordRef.current;
        const to   = toCoordRef.current;
        const t0   = startTimeRef.current;
        if (!from || !to || t0 === null) return;

        const elapsed = Date.now() - t0;
        const rawT = Math.min(elapsed / DURATION, 1);

        // Ease-in-out cubic for a natural glide feel
        const t = rawT < 0.5
            ? 2 * rawT * rawT
            : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

        setAnimatedCoord({
            latitude:  lerp(from.latitude,  to.latitude,  t),
            longitude: lerp(from.longitude, to.longitude, t),
        });

        if (rawT < 1) {
            rafRef.current = requestAnimationFrame(tick);
        } else {
            setAnimatedCoord({ latitude: to.latitude, longitude: to.longitude });
            fromCoordRef.current = { latitude: to.latitude, longitude: to.longitude };
            startTimeRef.current = null;
            rafRef.current = null;
        }
    }, [DURATION]);

    // ── Public API ────────────────────────────────────────────────────────────

    const setInitial = useCallback((lat: number, lng: number) => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        fromCoordRef.current = { latitude: lat, longitude: lng };
        toCoordRef.current   = { latitude: lat, longitude: lng };
        startTimeRef.current = null;
        setAnimatedCoord({ latitude: lat, longitude: lng });
        animatedHeading.setValue(0);
        currentHeadingRef.current = 0;
    }, [animatedHeading]);

    const updateTarget = useCallback((lat: number, lng: number) => {
        const current = fromCoordRef.current;

        if (!current) {
            setInitial(lat, lng);
            return;
        }

        if (current.latitude === lat && current.longitude === lng) return;

        // ── Bearing ───────────────────────────────────────────────────────────
        const dLat = Math.abs(lat - current.latitude);
        const dLng = Math.abs(lng - current.longitude);
        if (dLat > 0.00003 || dLng > 0.00003) {
            const rawBearing = bearingBetween(current.latitude, current.longitude, lat, lng);
            const delta = shortestAngleDelta(currentHeadingRef.current % 360, rawBearing);
            const targetHeading = currentHeadingRef.current + delta;
            currentHeadingRef.current = targetHeading;

            if (headingAnimRef.current) headingAnimRef.current.stop();
            headingAnimRef.current = Animated.timing(animatedHeading, {
                toValue: targetHeading,
                duration: DURATION,
                useNativeDriver: false,
            });
            headingAnimRef.current.start(() => { headingAnimRef.current = null; });
        }

        // ── Position ──────────────────────────────────────────────────────────
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }

        fromCoordRef.current = animatedCoord ?? current;
        toCoordRef.current   = { latitude: lat, longitude: lng };
        startTimeRef.current = Date.now();
        rafRef.current = requestAnimationFrame(tick);
    }, [animatedCoord, animatedHeading, DURATION, setInitial, tick]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            if (headingAnimRef.current) headingAnimRef.current.stop();
        };
    }, []);

    return { animatedCoord, animatedHeading, updateTarget, setInitial };
}
