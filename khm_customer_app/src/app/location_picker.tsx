import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LocationInputCard } from '../components/LocationInputCard';
import { DraggableBottomSheet } from '../components/DraggableBottomSheet';
import { useStyles } from '../styles/locationpicker.styles';
import { useTheme } from '../hooks/use-theme';
import { useRouter } from 'expo-router';
import { useRoute } from '../hooks/useRoute';

export default function LocationPicker() {
    const styles = useStyles();
    const theme = useTheme();
    const router = useRouter();
    const [pickup, setPickup] = useState('');
    const [dropoff, setDropoff] = useState('');
    const [pickupCoordinate, setPickupCoordinate] = useState<{latitude: number, longitude: number} | null>(null);
    const [dropoffCoordinate, setDropoffCoordinate] = useState<{latitude: number, longitude: number} | null>(null);

    const [scheduleType, setScheduleType] = useState<'now' | 'schedule'>('now');
    const [scheduleDate, setScheduleDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const { fetchRoute, routeCoordinates } = useRoute();
    const mapRef = useRef<MapView>(null);

    const initialRegion = {
        latitude: 25.1972,
        longitude: 55.2744,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    };

    const isButtonDisabled = !pickup.trim() || !dropoff.trim();

    useEffect(() => {
        if (pickupCoordinate && dropoffCoordinate) {
            fetchRoute(pickupCoordinate, dropoffCoordinate);
        }
    }, [pickupCoordinate, dropoffCoordinate, fetchRoute]);

    useEffect(() => {
        if (pickupCoordinate && dropoffCoordinate && routeCoordinates.length > 0 && mapRef.current) {
            const lat1 = (pickupCoordinate.latitude * Math.PI) / 180;
            const lon1 = (pickupCoordinate.longitude * Math.PI) / 180;
            const lat2 = (dropoffCoordinate.latitude * Math.PI) / 180;
            const lon2 = (dropoffCoordinate.longitude * Math.PI) / 180;
            const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
            const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
            let bearing = (Math.atan2(y, x) * 180) / Math.PI;
            bearing = (bearing + 360) % 360;
            const heading = (bearing - 90 + 360) % 360;
            const centerLat = (pickupCoordinate.latitude + dropoffCoordinate.latitude) / 2;
            const centerLon = (pickupCoordinate.longitude + dropoffCoordinate.longitude) / 2;
            const dLat = Math.abs(pickupCoordinate.latitude - dropoffCoordinate.latitude);
            const dLon = Math.abs(pickupCoordinate.longitude - dropoffCoordinate.longitude);
            const maxDelta = Math.max(dLat, dLon);
            const zoom = Math.log2(360 / maxDelta) + 0.2;
            mapRef.current.animateCamera({ center: { latitude: centerLat, longitude: centerLon }, heading, zoom, pitch: 0 }, { duration: 1500 });
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
            <View style={{ flex: 1 }}>
                <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={initialRegion} showsUserLocation={true}>
                    {routeCoordinates.length > 0 && (
                        <Polyline coordinates={routeCoordinates} strokeWidth={6} strokeColor={theme.primary} />
                    )}
                    {(pickupCoordinate || pickup === '') && (
                        <Marker coordinate={pickupCoordinate || { latitude: 25.1972, longitude: 55.2744 }}>
                            <View style={{ alignItems: 'center' }}>
                                <View style={[styles.markerPin, { backgroundColor: theme.blue, width: 36, height: 36, borderRadius: 18, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }]}>
                                    <MaterialCommunityIcons name="crosshairs-gps" size={18} color={theme.background} />
                                </View>
                                <View style={[styles.markerLine, { backgroundColor: theme.blue, height: 16 }]} />
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.blue, marginTop: -2 }} />
                            </View>
                        </Marker>
                    )}
                    {(dropoffCoordinate || dropoff === '') && (
                        <Marker coordinate={dropoffCoordinate || { latitude: 25.2100, longitude: 55.2800 }}>
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
                    snapPoints={[0.52, 0.72, 0.93]}
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
                        />

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
                                onPress={() => setScheduleType('schedule')}
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

                        {showDatePicker && scheduleType === 'schedule' && (
                            <DateTimePicker value={scheduleDate} mode="date" display="default" onChange={handleDateChange} minimumDate={new Date()} />
                        )}
                        {showTimePicker && scheduleType === 'schedule' && (
                            <DateTimePicker value={scheduleDate} mode="time" display="default" onChange={handleTimeChange} />
                        )}
                    </ScrollView>
                </DraggableBottomSheet>

                {/* Confirm button — always visible, floats above the sheet */}
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
            </View>
        </GestureHandlerRootView>
    );
}
