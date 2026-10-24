import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { disconnectSocket } from '../services/socket';
import { DrawerContentScrollView } from 'expo-router/drawer';

export default function Profile(props?: any) {
    const router = useRouter();
    const navigation = props?.navigation || useNavigation();
    const insets = useSafeAreaInsets();
    const { user, isLoading, logout } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [imageError, setImageError] = useState(false);

    const closeDrawer = () => {
        if (navigation) {
            navigation.dispatch({ type: 'CLOSE_DRAWER' });
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        setIsLoggingOut(true);
                        try {
                            disconnectSocket();
                            await logout();
                            closeDrawer();
                            if (typeof router.canDismiss === 'function' && router.canDismiss()) {
                                router.dismissAll();
                            }
                            router.replace('/login');
                        } catch (error) {
                            console.error('Logout error:', error);
                            Alert.alert('Error', 'Failed to log out. Please try again.');
                        } finally {
                            setIsLoggingOut(false);
                        }
                    },
                },
            ]
        );
    };

    const navigateTo = (route: string) => {
        closeDrawer();
        // Small delay so drawer close animation doesn't clash with navigation
        setTimeout(() => router.push(route as any), 200);
    };

    if (isLoading || isLoggingOut) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
            </View>
        );
    }

    const getAvatarUri = (): string | null => {
        if (!user?.avatar || user.avatar.trim() === '') return null;
        if (user.avatar.startsWith('http')) return user.avatar;
        const baseUrl = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/api\/?$/, '');
        const cleanAvatar = user.avatar.replace(/\\/g, '/');
        return `${baseUrl}${cleanAvatar.startsWith('/') ? '' : '/'}${cleanAvatar}`;
    };

    const avatarUri = getAvatarUri();
    const defaultPlaceholder = require('../../assets/images/defaultAvatarPlaceholder.png');

    return (
        <DrawerContentScrollView {...props} contentContainerStyle={[styles.container, { paddingTop: insets.top || 20 }]}>

            {/* ── Close handle ── */}
            <TouchableOpacity style={styles.closeRow} onPress={closeDrawer} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={Colors.light.secondaryText} />
            </TouchableOpacity>

            {/* ── Avatar + name ── */}
            <View style={styles.profileSection}>
                <View style={styles.avatarWrapper}>
                    <Image
                        source={avatarUri && !imageError ? { uri: avatarUri } : defaultPlaceholder}
                        placeholder={defaultPlaceholder}
                        style={styles.avatar}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={200}
                        onError={() => setImageError(true)}
                    />
                    {/* Online indicator dot */}
                    <View style={styles.onlineDot} />
                </View>

                <Text style={styles.name}>{user?.name ?? 'Driver'}</Text>

                {user?.phone ? (
                    <Text style={styles.subText}>{user.phone}</Text>
                ) : null}

                {user?.email?.trim() ? (
                    <Text style={styles.subText}>{user.email}</Text>
                ) : null}

                {/* Driver badge */}
                <View style={styles.driverBadge}>
                    <Ionicons name="car" size={12} color={Colors.light.primary} />
                    <Text style={styles.driverBadgeText}>Driver</Text>
                </View>
            </View>

            <View style={styles.divider} />

            {/* ── Menu items ── */}
            <ScrollView
                style={styles.menu}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 16 }}
            >
                <MenuItem
                    icon="time-outline"
                    label="Trip History"
                    onPress={() => navigateTo('/trip_history')}
                />
                <MenuItem
                    icon="calendar-outline"
                    label="Scheduled Rides"
                    onPress={() => navigateTo('/scheduled_rides')}
                />
                <MenuItem
                    icon="settings-outline"
                    label="Settings"
                    onPress={() => {}}
                />
                <MenuItem
                    icon="help-circle-outline"
                    label="Help & Support"
                    onPress={() => {}}
                />
            </ScrollView>

            {/* ── Logout ── */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
                    <Ionicons name="log-out-outline" size={18} color="#fff" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </DrawerContentScrollView>
    );
}

// ─── MenuItem sub-component ───────────────────────────────────────────────────

function MenuItem({
    icon,
    label,
    onPress,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.menuIconBox}>
                <Ionicons name={icon} size={20} color={Colors.light.primary} />
            </View>
            <Text style={styles.menuLabel}>{label}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.light.secondaryText} />
        </TouchableOpacity>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Close button row
    closeRow: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        alignSelf: 'flex-end',
    },

    // Profile section
    profileSection: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 24,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 14,
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 3,
        borderColor: Colors.light.primary,
        backgroundColor: Colors.light.border,
        overflow: 'hidden',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: Colors.light.primary,
        borderWidth: 2,
        borderColor: Colors.light.background,
    },
    name: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.light.text,
        marginBottom: 4,
        textAlign: 'center',
    },
    subText: {
        fontSize: 13,
        color: Colors.light.secondaryText,
        marginBottom: 2,
        textAlign: 'center',
    },
    driverBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 10,
        backgroundColor: Colors.light.success,
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    driverBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.light.primary,
    },

    divider: {
        height: 1,
        backgroundColor: Colors.light.border,
        marginHorizontal: 20,
        marginBottom: 8,
    },

    // Menu
    menu: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderRadius: 12,
        gap: 12,
        marginBottom: 2,
    },
    menuIconBox: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: Colors.light.success,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: Colors.light.text,
    },

    // Logout
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.light.border,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.light.red,
        borderRadius: 12,
        paddingVertical: 14,
    },
    logoutText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
