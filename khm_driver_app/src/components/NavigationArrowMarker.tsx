import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface NavigationArrowMarkerProps {
    /**
     * Heading as an Animated.Value (degrees, 0 = North, increases clockwise).
     * Pass the `animatedHeading` returned by `useAnimatedMarker`.
     * A plain number is also accepted for static / initial renders.
     */
    heading?: Animated.Value | number;
    /**
     * Outer circle diameter. Defaults to 44.
     */
    size?: number;
    /**
     * Icon size inside circle. Defaults to 28.
     */
    arrowSize?: number;
    /**
     * Color of the navigation arrow. Defaults to '#0066FF'.
     */
    arrowColor?: string;
}

export const NavigationArrowMarker: React.FC<NavigationArrowMarkerProps> = ({
    heading = 0,
    size = 44,
    arrowSize = 28,
    arrowColor = '#0066FF',
}) => {
    // Accept either a raw number (static) or an Animated.Value (live).
    // Animated.Value.interpolate returns a string like "45deg" directly.
    const rotateStyle =
        heading instanceof Animated.Value
            ? {
                  transform: [
                      {
                          rotate: heading.interpolate({
                              inputRange: [-3600, 3600],
                              outputRange: ['-3600deg', '3600deg'],
                              extrapolate: 'extend',
                          }),
                      },
                  ],
              }
            : { transform: [{ rotate: `${heading}deg` }] };

    return (
        <View style={[styles.container, { width: size + 10, height: size + 10 }]}>
            <View
                style={[
                    styles.circle,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                    },
                ]}
            >
                {/* Animated.View handles the rotation so it runs without React re-renders */}
                <Animated.View
                    style={[
                        styles.arrowWrapper,
                        { width: arrowSize, height: arrowSize },
                        rotateStyle,
                    ]}
                >
                    <MaterialIcons name="navigation" size={arrowSize} color={arrowColor} />
                </Animated.View>
            </View>
        </View>
    );
};

export default NavigationArrowMarker;

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    circle: {
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.28,
        shadowRadius: 4.5,
        elevation: 6,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.95)',
    },
    arrowWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
