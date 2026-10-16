/**
 * useRoadSnappedMarker
 *
 * Smoothly interpolates a map marker between consecutive GPS fixes.
 *
 * Design decisions
 * ────────────────
 * • No OSRM/network calls — road-snapping adds unpredictable latency that
 *   causes queued segments to pile up and the marker to "rush" to catch up.
 *   Linear interpolation between real GPS fixes looks identical at normal
 *   driving speeds and is always instantaneous.
 *
 * • setInterval at ~16 ms instead of requestAnimationFrame — rAF is tied to
 *   React's render scheduler and gets throttled / batched in ways that cause
 *   visible stuttering. A raw interval fires independently of React and gives
 *   a consistent 60 fps regardless of component re-render pressure.
 *
 * • React state is updated at most once per interval tick via a ref-stable
 *   setter — this prevents the "maximum update depth exceeded" loop that
 *   comes from calling setState inside effects/callbacks that regenerate on
 *   every render.
 *
 * • tracksViewChanges is NOT managed here — callers should set it to false
 *   after the first render (see usage note below).
 *
 * Public API
 * ──────────
 *   animatedCoord   — { latitude, longitude } updated ~60fps during movement
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
     * arrives just before the next fix comes in.
     * Default: 4000 ms  (works well with a 5 s emit interval)
     */
    duration?: number;
}

interface UseRoadSnappedMarkerReturn {
    animatedCoord: AnimatedCoord | null;
    animatedHeading: Animated.Value;
    updateTarget: (lat: number, lng: number) => void;
    setInitial: (lat: number, lng: number) => void;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

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

// Ease-in-out cubic — starts and ends gently
function ease(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRoadSnappedMarker(
    options: UseRoadSnappedMarkerOptions = {},
): UseRoadSnappedMarkerReturn {
    const DURATION = options.duration ?? 4000;
    const TICK_MS  = 16; // ~60 fps

    // The only React state — lat/lng pair shown on the map
    const [animatedCoord, setAnimatedCoordState] = useState<AnimatedCoord | null>(null);

    // All animation state in refs — never triggers re-renders
    const animatedHeading      = useRef(new Animated.Value(0)).current;
    const cumulativeHeading    = useRef(0);
    const headingAnim          = useRef<Animated.CompositeAnimation | null>(null);

    // Current interpolation segment
    const fromCoord     = useRef<AnimatedCoord | null>(null);
    const toCoord       = useRef<AnimatedCoord | null>(null);
    const currentCoord  = useRef<AnimatedCoord | null>(null); // Tracks live interpolated position
    const startTime     = useRef<number>(0);
    const intervalId    = useRef<ReturnType<typeof setInterval> | null>(null);

    // Stable setter ref — safe to call from the interval without dep arrays
    const setCoord = useRef(setAnimatedCoordState);
    useEffect(() => { setCoord.current = setAnimatedCoordState; }, []);

    // ── Heading animator ──────────────────────────────────────────────────────

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

    // ── Interval tick ─────────────────────────────────────────────────────────
    // Defined as a ref so it never gets a new identity and the interval closure
    // always calls the latest version.

    const tickRef = useRef(() => {
        const from = fromCoord.current;
        const to   = toCoord.current;
        if (!from || !to) return;

        const elapsed = Date.now() - startTime.current;
        const rawT    = Math.min(elapsed / DURATION, 1);
        const t       = ease(rawT);

        setCoord.current({
            latitude:  lerp(from.latitude,  to.latitude,  t),
            longitude: lerp(from.longitude, to.longitude, t),
        });

        // Snap to destination and stop interval when done
        if (rawT >= 1) {
            setCoord.current(to);
            fromCoord.current = to;
            if (intervalId.current !== null) {
                clearInterval(intervalId.current);
                intervalId.current = null;
            }
        }
    });

    // Keep tickRef current without recreating the interval
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
        // Update heading immediately so the arrow rotates before we start moving
        const hdg = bearing(from.latitude, from.longitude, to.latitude, to.longitude);
        animateHeadingTo(hdg, Math.min(DURATION * 0.25, 600));

        fromCoord.current = from;
        toCoord.current   = to;
        startTime.current = Date.now();

        // Clear any in-flight interval before starting a new one
        if (intervalId.current !== null) {
            clearInterval(intervalId.current);
        }
        intervalId.current = setInterval(() => tickRef.current(), TICK_MS);
    }).current;

    // ── Public API ────────────────────────────────────────────────────────────

    const setInitial = useCallback((lat: number, lng: number) => {
        // Stop any running animation
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [animatedHeading]);

    const updateTarget = useCallback((lat: number, lng: number) => {
        const from = fromCoord.current;

        if (!from) {
            setInitial(lat, lng);
            return;
        }

        const to: AnimatedCoord = { latitude: lat, longitude: lng };

        // Skip tiny moves (< 1 m) — compare against the live interpolated position
        const liveFrom = currentCoord.current ?? from;
        const dLat = to.latitude  - liveFrom.latitude;
        const dLng = to.longitude - liveFrom.longitude;
        const approxMetres = Math.sqrt(dLat * dLat + dLng * dLng) * 111320;
        if (approxMetres < 1) return;

        // ── Start new segment from the CURRENT interpolated position ──────────
        // Using currentCoord (live animated position) instead of fromCoord
        // (animation's original start) prevents the marker from jumping
        // backwards when a new GPS fix arrives mid-animation (the "to and fro" bug).
        startSegment(liveFrom, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setInitial]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalId.current !== null) clearInterval(intervalId.current);
            if (headingAnim.current) headingAnim.current.stop();
        };
    }, []);

    return { animatedCoord, animatedHeading, updateTarget, setInitial };
}
