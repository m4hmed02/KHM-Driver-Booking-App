import React, { forwardRef, useImperativeHandle } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SPRING_CONFIG = { damping: 50, stiffness: 300, mass: 0.8 };

export interface DraggableBottomSheetRef {
    snapToIndex: (index: number) => void;
}

export interface DraggableBottomSheetProps {
    /**
     * Snap points as fractions of screen height FROM the bottom.
     * e.g. [0.45, 0.70, 0.93] — must be sorted ascending.
     */
    snapPoints?: number[];
    initialSnap?: number;
    children: React.ReactNode;
    backgroundColor?: string;
}

export const DraggableBottomSheet = forwardRef<DraggableBottomSheetRef, DraggableBottomSheetProps>(({
    snapPoints = [0.45, 0.70, 0.93],
    initialSnap = 0,
    children,
    backgroundColor = '#FFFFFF',
}, ref) => {
    /**
     * Convert each fraction to a translateY value.
     * fraction=0.45  →  translateY = SCREEN_HEIGHT * 0.55   (less visible)
     * fraction=0.93  →  translateY = SCREEN_HEIGHT * 0.07   (most visible)
     *
     * Result array is DESCENDING in translateY (largest = least visible first).
     */
    const snaps = snapPoints.map((f) => SCREEN_HEIGHT * (1 - f));

    // Correct clamping: largest translateY = least visible (snaps[0])
    //                   smallest translateY = most visible  (snaps[last])
    const maxTranslateY = snaps[0];
    const minTranslateY = snaps[snaps.length - 1];

    const translateY = useSharedValue(snaps[initialSnap]);
    const startY    = useSharedValue(snaps[initialSnap]);

    const panGesture = Gesture.Pan()
        .onStart(() => {
            'worklet';
            startY.value = translateY.value;
        })
        .onUpdate((event) => {
            'worklet';
            const next = startY.value + event.translationY;
            // clamp: don't go above most-visible or below least-visible snap
            translateY.value = Math.min(Math.max(next, minTranslateY), maxTranslateY);
        })
        .onEnd((event) => {
            'worklet';
            const currentY = translateY.value;
            const isFastSwipe = Math.abs(event.velocityY) > 500;
            let target = snaps[0];

            if (isFastSwipe) {
                // Find closest snap index
                let closestIdx = 0;
                let closestDist = Math.abs(snaps[0] - currentY);
                for (let i = 1; i < snaps.length; i++) {
                    const d = Math.abs(snaps[i] - currentY);
                    if (d < closestDist) { closestDist = d; closestIdx = i; }
                }
                // snaps are descending: higher index = smaller translateY = more visible
                if (event.velocityY > 0) {
                    // swiping down → more hidden → lower index (higher translateY)
                    const nextIdx = Math.max(closestIdx - 1, 0);
                    target = snaps[nextIdx];
                } else {
                    // swiping up → more visible → higher index (lower translateY)
                    const nextIdx = Math.min(closestIdx + 1, snaps.length - 1);
                    target = snaps[nextIdx];
                }
            } else {
                // Snap to nearest
                let nearest = snaps[0];
                let nearestDist = Math.abs(snaps[0] - currentY);
                for (let i = 1; i < snaps.length; i++) {
                    const d = Math.abs(snaps[i] - currentY);
                    if (d < nearestDist) { nearestDist = d; nearest = snaps[i]; }
                }
                target = nearest;
            }

            translateY.value = withSpring(target, SPRING_CONFIG);
            startY.value = target;
        });

    useImperativeHandle(ref, () => ({
        snapToIndex: (index: number) => {
            'worklet';
            // Index 0 = highest fraction (most visible) in snapping logic??
            // Let's check snaps array: SCREEN_HEIGHT * (1 - f)
            // if snapPoints = [0.45, 0.70, 0.93], snaps = [0.55H, 0.3H, 0.07H]
            // We want index 2 to be the 0.93 fraction (highest).
            const target = snaps[index];
            if (target !== undefined) {
                translateY.value = withSpring(target, SPRING_CONFIG);
                startY.value = target;
            }
        }
    }));

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.sheet, animatedStyle, { backgroundColor }]}>
                {/* Drag handle */}
                <View style={styles.handleContainer}>
                    <View style={styles.handle} />
                </View>
                {children}
            </Animated.View>
        </GestureDetector>
    );
});

const styles = StyleSheet.create({
    sheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: SCREEN_HEIGHT,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 16,
        zIndex: 100,
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D1D5DB',
    },
});
