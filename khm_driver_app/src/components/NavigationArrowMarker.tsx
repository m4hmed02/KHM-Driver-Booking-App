import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { DRIVER_MARKER_BASE64 } from '../constants/driverMarkerAsset';

interface NavigationArrowMarkerProps {
    /**
     * Heading as an Animated.Value (degrees, 0 = North, increases clockwise).
     * Pass the `animatedHeading` returned by `useRoadSnappedMarker`.
     * A plain number is also accepted for static / initial renders.
     */
    heading?: Animated.Value | number;
    /**
     * Outer circle diameter. Defaults to 46.
     */
    size?: number;
    /**
     * Icon size inside circle. Defaults to 36.
     */
    iconSize?: number;
}

export const NavigationArrowMarker: React.FC<NavigationArrowMarkerProps> = ({
    heading = 0,
    size = 46,
    iconSize = 36,
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
            <Animated.View style={rotateStyle}>
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
                    {/* Heading direction pointer notch */}
                    <View style={styles.directionPointer} />
                    <Image
                        source={{ uri: DRIVER_MARKER_BASE64 }}
                        style={{ width: iconSize, height: iconSize }}
                        contentFit="contain"
                    />
                </View>
            </Animated.View>
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
        borderWidth: 2,
        borderColor: '#7ED957',
    },
    directionPointer: {
        position: 'absolute',
        top: 2,
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 4,
        borderRightWidth: 4,
        borderBottomWidth: 5,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#7ED957',
    },
});
