import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface NavigationArrowMarkerProps {
    /**
     * Orientation heading in degrees (0..360, where 0 is North).
     */
    heading?: number;
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
                <View
                    style={[
                        styles.arrowWrapper,
                        {
                            width: arrowSize,
                            height: arrowSize,
                            transform: [{ rotate: `${heading}deg` }],
                        },
                    ]}
                >
                    <MaterialIcons name="navigation" size={arrowSize} color={arrowColor} />
                </View>
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
