import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, ScrollView, StyleSheet, Dimensions, ActivityIndicator, Linking, AppState } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Location from 'expo-location';
import { LocationInputCard } from '../components/LocationInputCard';
import { DraggableBottomSheet, DraggableBottomSheetRef } from '../components/DraggableBottomSheet';
import { useStyles } from '../styles/locationpicker.styles';
import { useTheme } from '../hooks/use-theme';
import { useRouter, useNavigation } from 'expo-router';
import { useRoute } from '../hooks/useRoute';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Home() {
    const styles = useStyles();
    const theme = useTheme();
    const router = useRouter();
    const navigation = useNavigation();
    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');
    const [pickupCoordinate, setPickupCoordinate] = useState<{latitude: number, longitude: number} | null>(null);
    const [dropoffCoordinate, setDropoffCoordinate] = useState<{latitude: number, longitude: number} | null>(null);

    const [scheduleType, setScheduleType] = useState<'now' | 'schedule'>('now');
    const [scheduleDate, setScheduleDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isGpsEnabled, setIsGpsEnabled] = useState(true);
    const [isLocationLoading, setIsLocationLoading] = useState(true);
    
    const [focusedInput, setFocusedInput] = useState<'pickup' | 'dropoff' | null>(null);

    const { fetchRoute, routeCoordinates } = useRoute();
    const mapRef = useRef<MapView>(null);
    const sheetRef = useRef<DraggableBottomSheetRef>(null);

    const [initialRegion, setInitialRegion] = useState<{latitude: number, longitude: number, latitudeDelta: number, longitudeDelta: number} | null>(null);

    const defaultRegion = {
        latitude: 25.1972,
        longitude: 55.2744,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    };

    const isButtonDisabled = !pickup.trim() || !dropoff.trim();

    useEffect(() => {
        const fetchLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setIsGpsEnabled(false);
                    setInitialRegion(defaultRegion);
                    setIsLocationLoading(false);
                    return;
                }
                const enabled = await Location.hasServicesEnabledAsync();
                setIsGpsEnabled(enabled);

                if (enabled) {
                    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    const newRegion = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    };
                    setInitialRegion(newRegion);
                } else {
                    setInitialRegion(defaultRegion);
                }
            } catch (error) {
                console.warn('Error fetching location', error);
                setIsGpsEnabled(false);
                setInitialRegion(defaultRegion);
            } finally {
                setIsLocationLoading(false);
            }
        };
        fetchLocation();

        // When the user returns from Settings (app comes to foreground), re-fetch location
        const appStateListener = AppState.addEventListener('change', async (nextState) => {
            if (nextState === 'active') {
                try {
                    const { status } = await Location.getForegroundPermissionsAsync();
                    if (status !== 'granted') return;
                    const enabled = await Location.hasServicesEnabledAsync();
                    setIsGpsEnabled(enabled);
                    if (enabled) {
                        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        const newRegion = {
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        };
                        setInitialRegion(newRegion);
                        // Animate to the new live location
                        const bottomSheetFraction = 0.52;
                        const latOffset = (newRegion.latitudeDelta / 2) * ((SCREEN_HEIGHT * (1 - bottomSheetFraction)) / SCREEN_HEIGHT) * 0.5;
                        mapRef.current?.animateCamera({
                            center: {
                                latitude: newRegion.latitude - latOffset,
                                longitude: newRegion.longitude,
                            },
                            zoom: 14,
                        }, { duration: 800 });
                    }
                } catch (error) {
                    console.warn('Error re-fetching location on app focus', error);
                }
            }
        });

        const checkGps = async () => {
            try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setIsGpsEnabled(false);
                    return;
                }
                const enabled = await Location.hasServicesEnabledAsync();
                setIsGpsEnabled(enabled);
            } catch (error) {
                console.warn('Error checking GPS status', error);
            }
        };
        checkGps();
        const interval = setInterval(checkGps, 5000);
        return () => {
            clearInterval(interval);
            appStateListener.remove();
        };
    }, []);

    // Animate map to show marker at top-center when initialRegion is set
    useEffect(() => {
        if (!isLocationLoading && initialRegion && mapRef.current) {
            // Offset the camera center southward so the marker appears in the top portion,
            // with the bottom sheet occupying the lower 52% of the screen.
            const bottomSheetFraction = 0.52;
            const visibleMapHeight = SCREEN_HEIGHT * (1 - bottomSheetFraction);
            // 1 degree latitude ≈ 111,320 meters; adjust based on zoom/delta
            const latOffset = (initialRegion.latitudeDelta / 2) * (visibleMapHeight / SCREEN_HEIGHT) * 0.5;

            mapRef.current.animateCamera({
                center: {
                    latitude: initialRegion.latitude - latOffset,
                    longitude: initialRegion.longitude,
                },
                zoom: 14,
            }, { duration: 800 });
        }
    }, [isLocationLoading, initialRegion]);

    useEffect(() => {
        if (pickupCoordinate && dropoffCoordinate) {
            fetchRoute(pickupCoordinate, dropoffCoordinate);
        }
    }, [pickupCoordinate, dropoffCoordinate, fetchRoute]);

    useEffect(() => {
        if (pickupCoordinate && dropoffCoordinate && routeCoordinates.length > 0 && mapRef.current) {
            // Snap sheet to the smallest height (index 0)
            sheetRef.current?.snapToIndex(0);

            // Fit map to show both markers and the route, adding bottom padding to avoid the bottom sheet
            mapRef.current.fitToCoordinates(
                [pickupCoordinate, dropoffCoordinate, ...routeCoordinates],
                {
                    edgePadding: {
                        top: 100,
                        right: 50,
                        bottom: (SCREEN_HEIGHT * 0.52) + 50, // 0.52 is the lowest snap point of the bottom sheet
                        left: 50,
                    },
                    animated: true,
                }
            );
        }
    }, [routeCoordinates, pickupCoordinate, dropoffCoordinate]);

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (selectedDate) {
            const d = new Date(scheduleDate);
            d.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            setScheduleDate(d);
        }
    };

    const handleTimeChange = (event: any, selectedTime?: Date) => {
        if (Platform.OS === 'android') setShowTimePicker(false);
        if (selectedTime) {
            const d = new Date(scheduleDate);
            d.setHours(selectedTime.getHours(), selectedTime.getMinutes());
            setScheduleDate(d);
        }
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            {isLocationLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={{ marginTop: 16, fontSize: 15, color: theme.secondaryText, fontWeight: '500' }}>
                        Finding your location...
                    </Text>
                </View>
            ) : (
            <View style={{ flex: 1 }}>
                {/* Drawer Menu Button */}
                <TouchableOpacity
                    style={{
                        position: 'absolute',
                        top: Platform.OS === 'ios' ? 60 : 40,
                        left: 20,
                        zIndex: 1000,
                        backgroundColor: theme.background,
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 6,
                        elevation: 5,
                    }}
                    onPress={() => (navigation as any).toggleDrawer()}
                >
                    <Ionicons name="menu" size={28} color={theme.text} />
                </TouchableOpacity>

                {!isGpsEnabled && (
                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                            if (Platform.OS === 'ios') {
                                Linking.openURL('App-Prefs:Privacy&path=LOCATION');
                            } else {
                                Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
                            }
                        }}
                        style={{
                            position: 'absolute',
                            top: Platform.OS === 'ios' ? 50 : 30,
                            left: 16,
                            right: 16,
                            backgroundColor: '#FEF08A',
                            padding: 12,
                            borderRadius: 8,
                            zIndex: 1000,
                            flexDirection: 'row',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.12,
                            shadowRadius: 4,
                            elevation: 4,
                        }}
                    >
                        <Ionicons name="warning" size={22} color="#A16207" style={{ marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: '#A16207', fontWeight: '700', fontSize: 13 }}>
                                GPS / Location is turned off
                            </Text>
                            <Text style={{ color: '#A16207', fontSize: 12, marginTop: 2 }}>
                                Tap here to open Location Settings and enable it.
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#A16207" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                )}
                <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={initialRegion || defaultRegion} showsUserLocation={true}>
                    {routeCoordinates.length > 0 && (
                        <Polyline coordinates={routeCoordinates} strokeWidth={6} strokeColor={theme.primary} />
                    )}
                    {(pickupCoordinate || (pickup === '' && initialRegion)) && (
                        <Marker coordinate={pickupCoordinate || initialRegion!}>
                            <View style={{ alignItems: 'center' }}>
                                <View style={[styles.markerPin, { backgroundColor: theme.blue, width: 36, height: 36, borderRadius: 18, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }]}>
                                    <MaterialCommunityIcons name="crosshairs-gps" size={18} color={theme.background} />
                                </View>
                                <View style={[styles.markerLine, { backgroundColor: theme.blue, height: 16 }]} />
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.blue, marginTop: -2 }} />
                            </View>
                        </Marker>
                    )}
                    {(dropoffCoordinate || (dropoff === '' && initialRegion)) && (
                        <Marker coordinate={dropoffCoordinate || initialRegion!}>
                            <View style={{ alignItems: 'center' }}>
                                <View style={[styles.markerPin, { backgroundColor: theme.primary, width: 36, height: 36, borderRadius: 18, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }]}>
                                    <Ionicons name="location-sharp" size={18} color={theme.background} />
                                </View>
                                <View style={[styles.markerLine, { backgroundColor: theme.primary, height: 16 }]} />
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary, marginTop: -2 }} />
                            </View>
                        </Marker>
                    )}
                </MapView>

                <DraggableBottomSheet
                    ref={sheetRef}
                    snapPoints={[0.52, 0.65, 0.75]}
                    initialSnap={0}
                    backgroundColor={theme.background}
                >
                    <ScrollView
                        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <LocationInputCard
                            pickupLocation={pickup}
                            setPickupLocation={setPickup}
                            setPickupCoordinate={setPickupCoordinate}
                            dropoffLocation={dropoff}
                            setDropoffLocation={setDropoff}
                            setDropoffCoordinate={setDropoffCoordinate}
                            onInputFocus={() => sheetRef.current?.snapToIndex(2)}
                            onFocusChange={setFocusedInput}
                        />

                        {!focusedInput && (
                            <View style={{ marginTop: 24, marginBottom: 4, gap: 12 }}>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: scheduleType === 'now' ? theme.primary : theme.border, backgroundColor: scheduleType === 'now' ? theme.success : theme.background, gap: 16 }}
                                activeOpacity={0.7}
                                onPress={() => setScheduleType('now')}
                            >
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: scheduleType === 'now' ? '#D5F0D9' : '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
                                    <Ionicons name="flash" size={20} color={scheduleType === 'now' ? theme.primaryDark : theme.icon} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, color: theme.text, fontWeight: '600', marginBottom: 4 }}>Driver Now</Text>
                                    <Text style={{ fontSize: 13, color: theme.secondaryText, lineHeight: 18 }}>Quickest arrival. Nearest available driver will be assigned immediately.</Text>
                                </View>
                                <Ionicons name={scheduleType === 'now' ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={scheduleType === 'now' ? theme.primary : '#D1D5DB'} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: scheduleType === 'schedule' ? theme.primary : theme.border, backgroundColor: scheduleType === 'schedule' ? theme.success : theme.background, gap: 16 }}
                                activeOpacity={0.7}
                                onPress={() => {
                                    setScheduleType('schedule');
                                    // Snap up the bottom sheet slightly so the date/time selectors are visible
                                    sheetRef.current?.snapToIndex(1);
                                }}
                            >
                                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: scheduleType === 'schedule' ? '#D5F0D9' : '#F3F4F6', justifyContent: 'center', alignItems: 'center' }}>
                                    <MaterialCommunityIcons name="calendar-clock" size={20} color={scheduleType === 'schedule' ? theme.primaryDark : theme.icon} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 16, color: theme.text, fontWeight: '600', marginBottom: 4 }}>Schedule Driver</Text>
                                    <Text style={{ fontSize: 13, color: theme.secondaryText, lineHeight: 18 }}>Book for later. Guarantee a driver for a specific date and time.</Text>
                                </View>
                                <Ionicons name={scheduleType === 'schedule' ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={scheduleType === 'schedule' ? theme.primary : '#D1D5DB'} />
                            </TouchableOpacity>

                            {scheduleType === 'schedule' && (
                                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                                    <TouchableOpacity
                                        style={{ flex: 1, height: 48, backgroundColor: theme.background, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border }}
                                        activeOpacity={0.7}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Ionicons name="calendar-outline" size={20} color={theme.icon} />
                                            <Text style={{ fontSize: 14, color: theme.text, fontWeight: '500' }}>{scheduleDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{ flex: 1, height: 48, backgroundColor: theme.background, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border }}
                                        activeOpacity={0.7}
                                        onPress={() => setShowTimePicker(true)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Ionicons name="time-outline" size={20} color={theme.icon} />
                                            <Text style={{ fontSize: 14, color: theme.text, fontWeight: '500' }}>{scheduleDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                        )}

                        {showDatePicker && scheduleType === 'schedule' && (
                            <DateTimePicker value={scheduleDate} mode="date" display="default" onChange={handleDateChange} minimumDate={new Date()} />
                        )}
                        {showTimePicker && scheduleType === 'schedule' && (
                            <DateTimePicker value={scheduleDate} mode="time" display="default" onChange={handleTimeChange} />
                        )}
                    </ScrollView>
                </DraggableBottomSheet>

                {/* Confirm button — always visible, floats above the sheet */}
                {!focusedInput && (
                    <View style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        paddingHorizontal: 20,
                        paddingBottom: 24,
                        paddingTop: 12,
                        backgroundColor: theme.background,
                        zIndex: 200,
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: theme.border,
                    }}>
                        <TouchableOpacity
                            style={[styles.confirmButton, isButtonDisabled && styles.confirmButtonDisabled]}
                            activeOpacity={0.8}
                            disabled={isButtonDisabled}
                            onPress={() => router.push('/trip_details')}
                        >
                            <Text style={[styles.confirmButtonText, isButtonDisabled && styles.confirmButtonTextDisabled]}>
                                Confirm {scheduleType === 'schedule' ? 'Schedule' : 'Locations'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
            )}
        </GestureHandlerRootView>
    );
}
