import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useStyles } from '../styles/modeselection.style';
import { Header } from '../components/Header';
import { useTheme } from '../hooks/use-theme';
import { useRouter } from 'expo-router';

export default function ModeSelection() {
    const [selectedMode, setSelectedMode] = useState<string>('now');
    const styles = useStyles();
    const theme = useTheme();
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            {/* Header */}
            <Header title="Select Mode" />

            <ScrollView
                contentContainerStyle={styles.contentContainer}
                alwaysBounceVertical={false}
                bounces={false}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.mainTitle}>How would you like to book?</Text>
                <Text style={styles.subtitle}>
                    Select a service option tailored to your immediate or future needs.
                </Text>

                {/* Option 1: Driver Now */}
                <TouchableOpacity
                    style={[styles.card, selectedMode === 'now' && styles.cardSelected]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedMode('now')}
                >
                    <View style={[styles.iconContainer, selectedMode === 'now' && styles.iconContainerSelected]}>
                        <Ionicons
                            name="flash"
                            size={28}
                            color={selectedMode === 'now' ? theme.primary : theme.icon}
                        />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.cardTitle}>Driver Now</Text>
                        <Text style={styles.cardDescription}>
                            Quickest arrival. Nearest available driver will be assigned immediately.
                        </Text>
                    </View>
                    <View style={styles.radioContainer}>
                        {selectedMode === 'now' ? (
                            <Ionicons name="checkmark-circle" size={28} color={theme.primary} />
                        ) : (
                            <View style={styles.radioCircle} />
                        )}
                    </View>
                </TouchableOpacity>

                {/* Option 2: Schedule Driver */}
                <TouchableOpacity
                    style={[styles.card, selectedMode === 'schedule' && styles.cardSelected]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedMode('schedule')}
                >
                    <View style={[styles.iconContainer, selectedMode === 'schedule' && styles.iconContainerSelected]}>
                        <MaterialCommunityIcons
                            name="calendar-clock"
                            size={28}
                            color={selectedMode === 'schedule' ? theme.primary : theme.icon}
                        />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.cardTitle}>Schedule Driver</Text>
                        <Text style={styles.cardDescription}>
                            Book for later. Guarantee a driver for a specific date and time.
                        </Text>
                    </View>
                    <View style={styles.radioContainer}>
                        {selectedMode === 'schedule' ? (
                            <Ionicons name="checkmark-circle" size={28} color={theme.primary} />
                        ) : (
                            <View style={styles.radioCircle} />
                        )}
                    </View>
                </TouchableOpacity>

                {/* Option 3: Contract Driver */}
                <TouchableOpacity
                    style={[styles.card, selectedMode === 'contract' && styles.cardSelected]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedMode('contract')}
                >
                    <View style={[styles.iconContainer, selectedMode === 'contract' && styles.iconContainerSelected]}>
                        <MaterialCommunityIcons
                            name="handshake-outline"
                            size={28}
                            color={selectedMode === 'contract' ? theme.primary : theme.icon}
                        />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.cardTitle}>Contract Driver</Text>
                        <Text style={styles.cardDescription}>
                            Daily or Weekly basis. Secure a dedicated driver for extended periods.
                        </Text>
                    </View>
                    <View style={styles.radioContainer}>
                        {selectedMode === 'contract' ? (
                            <Ionicons name="checkmark-circle" size={28} color={theme.primary} />
                        ) : (
                            <View style={styles.radioCircle} />
                        )}
                    </View>
                </TouchableOpacity>


                <TouchableOpacity
                    style={styles.continueButton}
                    activeOpacity={0.8}
                    onPress={() => { router.push('/location_picker') }}>
                    <Text style={styles.continueButtonText}>Continue</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}