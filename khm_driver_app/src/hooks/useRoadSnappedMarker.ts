/**
 * useRoadSnappedMarker
 *
 * Animates a map marker along the actual road network between GPS updates
 * instead of straight-line interpolation.
 *
 * How it works
 * ────────────
 * 1. When updateTarget(lat, lng) is called a lightweight OSRM request is fired
 *    in the background to get the road polyline between the current position
 *    and the new one.
 * 2. The resulting array of road coordinates is pushed onto an animation queue.
 * 3. A requestAnimationFrame loop drains the queue sequentially — each queued
 *    segment is walked proportionally to elapsed time so the total traversal
 *    fits inside `duration` ms.
 * 4. Bearing is computed from the actual road geometry at every frame so the
 *    marker arrow always faces the true driving direction.
 * 5. If OSRM fails or the move is tiny (< ~5 m) straight-line is used instead
 *    so there is always a graceful fallback with no visible gap.
 *
 * Public API (identical to useAnimatedMarker — drop-in replacement)
 * ─────────────────────────────────────────────────────────────────
 *   animatedCoord   — {latitude, longitude} updated every rAF frame
 *   animatedHeading — Animated.Value (degrees) for marker rotation
 *   updateTarget    — push a new GPS fix into the pipeline
 *   setInitial      — seed position without animation (first fix)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnimatedCoord {
    latitude: number;
    longitude: number;
}

interface QueueEntry {
    /** Full road polyline for this segment (≥ 2 points) */
    path: AnimatedCoord[];
    /** Total ms to spend traversing this segment */
    duration: number;
}

interface UseRoadSnappedMarkerOptions {
    /**
     * Time budget in ms to animate each GPS-update segment.
     * Should roughly match the location-emit interval.
     * Default: 4500 ms (gives a slight buffer over the 5 s emit interval so
     * the marker arrives just before the next update).
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

/** Haversine bearing A→B, returns 0..360 */
function bearing(a: AnimatedCoord, b: AnimatedCoord): number {
    const dLng = toRad(b.longitude - a.longitude);
    const la = toRad(a.latitude);
    const lb = toRad(b.latitude);
    const y = Math.sin(dLng) * Math.cos(lb);
    const x = Math.cos(la) * Math.sin(lb) - Math.sin(la) * Math.cos(lb) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Haversine distance in metres */
function distanceM(a: AnimatedCoord, b: AnimatedCoord): number {
    const R = 6371000;
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Shortest signed rotation delta (-180..180) */
function shortestDelta(from: number, to: number): number {
    let d = ((to - from) % 360 + 360) % 360;
    if (d > 180) d -= 360;
    return d;
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

// ─── OSRM micro-route fetcher ─────────────────────────────────────────────────

/**
 * Fetch a driving polyline between two close coordinates from the public
 * OSRM demo server.  Returns an array of coordinates (road-snapped) or null
 * if the request fails / is too slow.
 *
 * We use a 3-second timeout so a slow network never blocks the animation queue.
 */
async function fetchRoadPath(
    from: AnimatedCoord,
    to: AnimatedCoord,
): Promise<AnimatedCoord[] | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    try {
        const url =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
            `?overview=full&geometries=geojson&steps=false`;

        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes?.length) return null;

        const pts: AnimatedCoord[] = data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng }),
        );
        return pts.length >= 2 ? pts : null;
    } catch {
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRoadSnappedMarker(
    options: UseRoadSnappedMarkerOptions = {},
): UseRoadSnappedMarkerReturn {
    const DURATION = options.duration ?? 4500;

    // ── State / refs ──────────────────────────────────────────────────────────

    const [animatedCoord, setAnimatedCoord] = useState<AnimatedCoord | null>(null);
    const animatedHeading = useRef(new Animated.Value(0)).current;

    /** The queue of road segments waiting to be animated */
    const queue = useRef<QueueEntry[]>([]);
    /** True while the rAF loop is running */
    const running = useRef(false);
    const rafRef = useRef<number | null>(null);

    /** Last position that was fully rendered (start of current segment) */
    const currentPosRef = useRef<AnimatedCoord | null>(null);
    /** Cumulative (unbounded) heading so Animated.timing never wraps */
    const cumulativeHeadingRef = useRef<number>(0);
    /** In-flight Animated.timing for heading */
    const headingAnimRef = useRef<Animated.CompositeAnimation | null>(null);

    // ── Heading helper ────────────────────────────────────────────────────────

    const animateHeadingTo = useCallback(
        (target: number, dur: number) => {
            const delta = shortestDelta(cumulativeHeadingRef.current % 360, target);
            const next = cumulativeHeadingRef.current + delta;
            cumulativeHeadingRef.current = next;
            if (headingAnimRef.current) headingAnimRef.current.stop();
            headingAnimRef.current = Animated.timing(animatedHeading, {
                toValue: next,
                duration: dur,
                useNativeDriver: false,
            });
            headingAnimRef.current.start(() => {
                headingAnimRef.current = null;
            });
        },
        [animatedHeading],
    );

    // ── rAF animation loop ────────────────────────────────────────────────────

    const drainQueue = useCallback(() => {
        if (queue.current.length === 0) {
            running.current = false;
            rafRef.current = null;
            return;
        }

        const entry = queue.current[0];
        const { path, duration } = entry;

        // Pre-compute cumulative distances along the path for proportional progress
        const segLengths: number[] = [];
        let totalLength = 0;
        for (let i = 1; i < path.length; i++) {
            const d = distanceM(path[i - 1], path[i]);
            segLengths.push(d);
            totalLength += d;
        }
        // Fallback: straight line if all points are identical
        if (totalLength === 0) {
            setAnimatedCoord(path[path.length - 1]);
            currentPosRef.current = path[path.length - 1];
            queue.current.shift();
            rafRef.current = requestAnimationFrame(drainQueue);
            return;
        }

        const startTime = Date.now();

        // Kick off bearing animation for the first segment immediately
        if (path.length >= 2) {
            animateHeadingTo(bearing(path[0], path[1]), Math.min(duration * 0.3, 800));
        }

        const tick = () => {
            const elapsed = Date.now() - startTime;
            // Ease-in-out
            const rawT = Math.min(elapsed / duration, 1);
            const t = rawT < 0.5
                ? 2 * rawT * rawT
                : 1 - Math.pow(-2 * rawT + 2, 2) / 2;

            const targetDist = t * totalLength;

            // Walk segments to find which segment we're currently in
            let walked = 0;
            let segIdx = 0;
            for (let i = 0; i < segLengths.length; i++) {
                if (walked + segLengths[i] >= targetDist) {
                    segIdx = i;
                    break;
                }
                walked += segLengths[i];
                segIdx = i + 1; // clamp to last segment
            }
            segIdx = Math.min(segIdx, path.length - 2);

            const segStart = path[segIdx];
            const segEnd = path[segIdx + 1];
            const segLen = segLengths[segIdx] ?? 0;
            const segT = segLen > 0 ? (targetDist - walked) / segLen : 0;

            const lat = lerp(segStart.latitude, segEnd.latitude, segT);
            const lng = lerp(segStart.longitude, segEnd.longitude, segT);
            setAnimatedCoord({ latitude: lat, longitude: lng });

            // Update bearing when crossing segment boundaries
            if (segIdx < path.length - 2) {
                const segBearing = bearing(segStart, segEnd);
                animateHeadingTo(segBearing, Math.min(segLengths[segIdx] / (totalLength || 1) * duration, 600));
            }

            if (rawT < 1) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                // Snap to exact endpoint
                const last = path[path.length - 1];
                setAnimatedCoord(last);
                currentPosRef.current = last;
                queue.current.shift();
                // Immediately start next queued segment if one arrived while animating
                rafRef.current = requestAnimationFrame(drainQueue);
            }
        };

        rafRef.current = requestAnimationFrame(tick);
    }, [animateHeadingTo]);

    // ── Enqueue a road segment ────────────────────────────────────────────────

    const enqueue = useCallback(
        (path: AnimatedCoord[], dur: number) => {
            queue.current.push({ path, duration: dur });
            if (!running.current) {
                running.current = true;
                rafRef.current = requestAnimationFrame(drainQueue);
            }
        },
        [drainQueue],
    );

    // ── Public API ────────────────────────────────────────────────────────────

    const setInitial = useCallback(
        (lat: number, lng: number) => {
            // Cancel any in-flight animation
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            queue.current = [];
            running.current = false;
            const coord: AnimatedCoord = { latitude: lat, longitude: lng };
            currentPosRef.current = coord;
            setAnimatedCoord(coord);
            animatedHeading.setValue(0);
            cumulativeHeadingRef.current = 0;
        },
        [animatedHeading],
    );

    const updateTarget = useCallback(
        (lat: number, lng: number) => {
            const from = currentPosRef.current;

            // No starting position yet — just seed
            if (!from) {
                setInitial(lat, lng);
                return;
            }

            const to: AnimatedCoord = { latitude: lat, longitude: lng };

            // Skip duplicate / negligible moves (< ~2 m)
            if (distanceM(from, to) < 2) return;

            const dist = distanceM(from, to);

            // For very short hops (< 30 m) skip the network call — straight-line
            // is accurate enough and avoids latency for tiny emulator ticks.
            if (dist < 30) {
                enqueue([from, to], DURATION);
                // Update currentPosRef immediately so the next call has the right origin
                currentPosRef.current = to;
                return;
            }

            // Update currentPosRef optimistically so concurrent calls chain correctly
            currentPosRef.current = to;

            // Fetch road path in background; enqueue whatever we get
            fetchRoadPath(from, to).then((path) => {
                if (path && path.length >= 2) {
                    enqueue(path, DURATION);
                } else {
                    // OSRM failed — fall back to straight line
                    enqueue([from, to], DURATION);
                }
            });
        },
        [enqueue, setInitial, DURATION],
    );

    // Cleanup
    useEffect(() => {
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            if (headingAnimRef.current) headingAnimRef.current.stop();
        };
    }, []);

    return { animatedCoord, animatedHeading, updateTarget, setInitial };
}
