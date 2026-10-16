/**
 * useRoadSnappedMarker
 *
 * Smoothly interpolates a map marker between consecutive GPS fixes using a
 * setInterval-based approach (~60 fps) with no OSRM/network dependency.
 *
 * Why no OSRM
 * ───────────
 * Road-snapping fetches add unpredictable latency. By the time the path
 * arrives a new GPS fix has already come in, causing queued segments to pile
 * up and the marker to rush across the map to catch up. Linear interpolation
 * between real GPS fixes is indistinguishable at driving speeds and is
 * always instantaneous.
 *
 * Why setInterval instead of requestAnimationFrame
 * ─────────────────────────────────────────────────
 * rAF is tied to React's render scheduler and gets throttled/batched during
 * heavy renders, producing visible stutter. A raw interval fires independently
 * of React and delivers consistent 60 fps.
 *
 * Why all animation state lives in refs
 * ──────────────────────────────────────
 * Calling setState inside rAF/setInterval closures that regenerate on every
 * render causes the "maximum update depth exceeded" loop. Keeping mutable
 * state in refs and only touching React state via a ref-stable setter
 * eliminates that entirely.
 *
 * Public API
 * ──────────
 *   animatedCoord   — { latitude, longitude } updated ~60 fps during movement
 *   animatedHeading — Animated.Value (degrees) for marker rotation
 *   updateTarget    — call with each new GPS fix
 *   setInitial      — seed position instantly (first fix, no animation)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnimatedCoord {
    latitude: number;
    longitude: number;
}

interface UseRoadSnappedMarkerOptions {
    /**
     * How long (ms) to spend animating the marker to each new GPS fix.
     * Set this slightly below your location-emit interval so the marker
     * arrives just before the next fix.
     * Default: 4000 ms  (works well with a 5 s socket-emit interval)
     */
    duration?: number;
}

interface UseRoadSnappedMarkerReturn {
    animatedCoord: AnimatedCoord | null;
    animatedHeading: Animated.Value;
    updateTarget: (lat: number, lng: number) => void;
    setInitial: (lat: number, lng: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toRad = (d: number) => (d * Math.PI) / 180;

function bearing(
    fromLat: number, fromLng: number,
    toLat: number,   toLng: number,
): number {
    const dLng = toRad(toLng - fromLng);
    const la = toRad(fromLat);
    const lb = toRad(toLat);
    const y = Math.sin(dLng) * Math.cos(lb);
    const x = Math.cos(la) * Math.sin(lb) - Math.sin(la) * Math.cos(lb) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function shortestDelta(from: number, to: number): number {
    let d = ((to - from) % 360 + 360) % 360;
    if (d > 180) d -= 360;
    return d;
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

// Ease-in-out cubic — gentle start and end
function ease(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRoadSnappedMarker(
    options: UseRoadSnappedMarkerOptions = {},
): UseRoadSnappedMarkerReturn {
    const DURATION = options.duration ?? 4000;
    const TICK_MS  = 16; // ~60 fps

    // The only React state — causes the Marker coordinate prop to update
    const [animatedCoord, setAnimatedCoordState] = useState<AnimatedCoord | null>(null);

    // All mutable animation state in refs — never triggers re-renders
    const animatedHeading   = useRef(new Animated.Value(0)).current;
    const cumulativeHeading = useRef(0);
    const headingAnim       = useRef<Animated.CompositeAnimation | null>(null);

    const fromCoord     = useRef<AnimatedCoord | null>(null);
    const toCoord       = useRef<AnimatedCoord | null>(null);
    const currentCoord  = useRef<AnimatedCoord | null>(null); // Tracks live interpolated position
    const startTime     = useRef<number>(0);
    const intervalId    = useRef<ReturnType<typeof setInterval> | null>(null);

    // Ref-stable setter — safe to call from interval without dep arrays
    const setCoord = useRef(setAnimatedCoordState);
    useEffect(() => { setCoord.current = setAnimatedCoordState; }, []);

    // ── Heading animator (ref-stable, never recreated) ────────────────────────
    const animateHeadingTo = useRef((target: number, dur: number) => {
        const delta = shortestDelta(cumulativeHeading.current % 360, target);
        const next  = cumulativeHeading.current + delta;
        cumulativeHeading.current = next;
        if (headingAnim.current) headingAnim.current.stop();
        headingAnim.current = Animated.timing(animatedHeading, {
            toValue: next,
            duration: dur,
            useNativeDriver: false,
        });
        headingAnim.current.start(() => { headingAnim.current = null; });
    }).current;

    // ── Interval tick (ref-stable via double-assignment pattern) ─────────────
    // The ref always points to the latest closure so the interval callback
    // never goes stale without being recreated.
    const tickRef = useRef<() => void>(() => {});
    tickRef.current = () => {
        const from = fromCoord.current;
        const to   = toCoord.current;
        if (!from || !to) return;

        const elapsed = Date.now() - startTime.current;
        const rawT    = Math.min(elapsed / DURATION, 1);
        const t       = ease(rawT);

        const interpolated: AnimatedCoord = {
            latitude:  lerp(from.latitude,  to.latitude,  t),
            longitude: lerp(from.longitude, to.longitude, t),
        };
        // Keep currentCoord up-to-date so new segments start from the right place
        currentCoord.current = interpolated;
        setCoord.current(interpolated);

        // Snap exactly and stop when done
        if (rawT >= 1) {
            setCoord.current(to);
            currentCoord.current = to;
            fromCoord.current = to;
            if (intervalId.current !== null) {
                clearInterval(intervalId.current);
                intervalId.current = null;
            }
        }
    };

    // ── Start a new interpolation segment ────────────────────────────────────
    const startSegment = useRef((from: AnimatedCoord, to: AnimatedCoord) => {
        // Rotate arrow to face the direction of travel
        const hdg = bearing(from.latitude, from.longitude, to.latitude, to.longitude);
        animateHeadingTo(hdg, Math.min(DURATION * 0.25, 600));

        fromCoord.current = from;
        toCoord.current   = to;
        startTime.current = Date.now();

        // Clear any previous interval before starting a new one
        if (intervalId.current !== null) {
            clearInterval(intervalId.current);
        }
        intervalId.current = setInterval(() => tickRef.current(), TICK_MS);
    }).current;

    // ── Public API ────────────────────────────────────────────────────────────

    const setInitial = useCallback((lat: number, lng: number) => {
        if (intervalId.current !== null) {
            clearInterval(intervalId.current);
            intervalId.current = null;
        }
        const coord: AnimatedCoord = { latitude: lat, longitude: lng };
        fromCoord.current    = coord;
        toCoord.current      = coord;
        currentCoord.current = coord;
        setCoord.current(coord);
        animatedHeading.setValue(0);
        cumulativeHeading.current = 0;
    // animatedHeading is a stable ref value — safe to list
    }, [animatedHeading]); // eslint-disable-line react-hooks/exhaustive-deps

    const updateTarget = useCallback((lat: number, lng: number) => {
        if (!fromCoord.current) {
            setInitial(lat, lng);
            return;
        }

        const to: AnimatedCoord = { latitude: lat, longitude: lng };

        // Ignore GPS jitter (< 1 m) — compare against current live position
        const liveFrom = currentCoord.current ?? fromCoord.current;
        const dLat = to.latitude  - liveFrom.latitude;
        const dLng = to.longitude - liveFrom.longitude;
        const approxMetres = Math.sqrt(dLat * dLat + dLng * dLng) * 111320;
        if (approxMetres < 1) return;

        // ── Start new segment from the CURRENT interpolated position ──────────
        // Using currentCoord (live animated position) instead of fromCoord
        // (the animation's original start) prevents the marker from jumping
        // backwards when a new GPS fix arrives mid-animation (the "to and fro" bug).
        startSegment(liveFrom, to);
    }, [setInitial]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalId.current !== null) clearInterval(intervalId.current);
            if (headingAnim.current) headingAnim.current.stop();
        };
    }, []);

    return { animatedCoord, animatedHeading, updateTarget, setInitial };
}
