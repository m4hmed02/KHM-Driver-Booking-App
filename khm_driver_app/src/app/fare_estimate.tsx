import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Header } from '../components/Header';
import { RouteMap } from '../components/RouteMap';
import { FindDriver } from '../components/FindDriver';
import { DriverRequestCard } from '../components/DriverRequestCard';
import { useStyles } from '../styles/fare_estimate.styles';
import { useRouter } from 'expo-router';

export default function FareEstimate() {
    const styles = useStyles();
    const router = useRouter();
    const [isFindingDriver, setIsFindingDriver] = useState(false);
    const [showDriverRequest, setShowDriverRequest] = useState(false);

    // Animation value for the drop-down effect (starts off-screen top)
    const driverRequestAnim = useRef(new Animated.Value(-300)).current;

    // Simulate finding a driver after clicking confirm
    useEffect(() => {
        if (isFindingDriver) {
            // After 2.5 seconds of searching, drop the driver request card
            const timer = setTimeout(() => {
                setShowDriverRequest(true);
                Animated.spring(driverRequestAnim, {
                    toValue: 3, // Drop down into view (just below header)
                    friction: 5, // Bounciness
                    tension: 40, // Speed
                    useNativeDriver: true,
                }).start();
            }, 2500);
            return () => clearTimeout(timer);
        } else {
            // Reset state if canceled
            setShowDriverRequest(false);
            driverRequestAnim.setValue(-300);
        }
    }, [isFindingDriver]);

    // Dummy coordinates for the route
    const pickupCoords = { latitude: 25.1972, longitude: 55.2744 }; // Marina
    const dropoffCoords = { latitude: 25.2532, longitude: 55.3657 }; // Downtown

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <StatusBar hidden={true} />

            <View style={{ flex: 1, zIndex: 1 }}>
                <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                    {/* Map Section */}
                    <View style={styles.mapSection}>
                        <RouteMap pickupCoords={pickupCoords} dropoffCoords={dropoffCoords} />
                    </View>

                    {/* Content over map */}
                    <View style={[styles.contentContainer, isFindingDriver && { paddingHorizontal: 0 }]}>
                        {isFindingDriver ? (
                            <FindDriver onCancel={() => setIsFindingDriver(false)} />
                        ) : (
                            <>
                                {/* Trip Summary Card */}
                                <View style={styles.card}>
                                    <View style={styles.summaryHeader}>
                                        <Text style={styles.summaryTitle}>Trip Summary</Text>
                                        <View style={styles.timeChip}>
                                            <MaterialCommunityIcons name="clock-outline" size={14} color="#666" />
                                            <Text style={styles.timeText}>Today, 18:00</Text>
                                        </View>
                                    </View>

                                    <View style={styles.timelineContainer}>
                                        {/* Pickup */}
                                        <View style={styles.timelineItem}>
                                            <View style={styles.timelineIconContainer}>
                                                <View style={styles.dotOuter}>
                                                    <View style={styles.dotInner} />
                                                </View>
                                            </View>
                                            <View style={styles.timelineContent}>
                                                <Text style={styles.timelineLabel}>PICKUP</Text>
                                                <Text style={styles.timelineValue}>Marina</Text>
                                            </View>
                                        </View>

                                        {/* Line */}
                                        <View style={styles.timelineItem}>
                                            <View style={styles.timelineIconContainer}>
                                                <View style={styles.timelineLine} />
                                            </View>
                                        </View>

                                        {/* Destination */}
                                        <View style={styles.timelineItem}>
                                            <View style={styles.timelineIconContainer}>
                                                <View style={styles.pinIconContainer}>
                                                    <Ionicons name="location-outline" size={14} color="#666" />
                                                </View>
                                            </View>
                                            <View style={styles.timelineContent}>
                                                <Text style={styles.timelineLabel}>DESTINATION</Text>
                                                <Text style={styles.timelineValue}>Downtown</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                {/* Estimated Fare Card */}
                                <View style={[styles.card, styles.fareCard]}>
                                    <Text style={styles.fareLabel}>ESTIMATED FARE</Text>

                                    <View style={styles.fareValueContainer}>
                                        <Text style={styles.fareValue}>85.00 AED</Text>
                                        <FontAwesome5 name="money-bill-wave" size={24} color="#4CAF50" />
                                    </View>

                                    <Text style={styles.fareNote}>
                                        Final fare may vary based on exact route and travel time.
                                    </Text>
                                </View>
                            </>
                        )}

                    </View>
                </ScrollView>

                {/* Sticky Footer Button */}
                {!isFindingDriver && (
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.confirmButton}
                            activeOpacity={0.8}
                            onPress={() => setIsFindingDriver(true)}
                        >
                            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                )}
                {/* Absolute Overlay for Driver Request Card */}
                {showDriverRequest && (
                    <Animated.View
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 20,
                            right: 20,
                            transform: [{ translateY: driverRequestAnim }],
                            zIndex: 100, // Ensure it sits on top of everything
                        }}
                    >
                        <DriverRequestCard
                            driverName="Ahmed Khan"
                            rating={4.9}
                            fare="100 AED"
                            onAccept={() => {
                                // Proceed with accepted ride
                                setIsFindingDriver(false);
                                setShowDriverRequest(false);
                                router.back();
                            }}
                            onDecline={() => {
                                // Slide back up
                                Animated.timing(driverRequestAnim, {
                                    toValue: -300,
                                    duration: 300,
                                    useNativeDriver: true,
                                }).start(() => setShowDriverRequest(false));
                            }}
                        />
                    </Animated.View>
                )}
            </View>
        </SafeAreaView>
    );
}