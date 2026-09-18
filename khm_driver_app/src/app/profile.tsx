import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { styles } from '../styles/profile.styles';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  // 1. Add local state to manage the logout loading spinner
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true); // Start spinner
    try {
      await logout(); // Clears user state and SecureStore

      // 2. Clear the entire navigation history stack before replacing the route
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace('/login');

    } catch (error) {
      Alert.alert('Error', 'Failed to log out properly.');
      setIsLoggingOut(false); // Stop spinner if it fails
    }
  };

  // 3. Show spinner if context is loading OR if user is logging out
  if (isLoading || isLoggingOut) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  const serverBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || '';

  const getAvatarSource = () => {
    if (user?.avatar && user.avatar.trim() !== '') {
      const uri = user.avatar.startsWith('http')
        ? user.avatar
        : `${serverBaseUrl}${user.avatar}`;
      return { uri };
    }
    return require('../../assets/images/defaultAvatarPlaceholder.png');
  };

  return (
    <View style={styles.container}>

      <View style={{ flex: 1, paddingTop: 40, paddingHorizontal: 20, backgroundColor: Colors.light.background }}>
        
        <View style={{ alignItems: 'center', marginBottom: 20, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: Colors.light.border }}>
          <Image
            source={getAvatarSource()}
            style={{ width: 90, height: 90, borderRadius: 45, marginBottom: 16, borderWidth: 3, borderColor: Colors.light.primary }}
          />
          <Text style={{ fontSize: 24, fontWeight: '700', color: Colors.light.text, marginBottom: 4 }}>
            {user?.name || 'User'}
          </Text>
          <Text style={{ fontSize: 14, color: Colors.light.secondaryText }}>
            {user?.email && user.email.trim() !== '' ? user.email : 'Link your email'}
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ marginBottom: 20 }}>
            <TouchableOpacity style={[styles.menuItem, { paddingHorizontal: 0, borderBottomWidth: 1, borderBottomColor: Colors.light.border }]} onPress={() => router.push('/trip_history')}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="time-outline" size={20} color={Colors.light.primary} />
              </View>
              <Text style={styles.menuText}>Trip History</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.light.icon} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, { paddingHorizontal: 0, borderBottomWidth: 1, borderBottomColor: Colors.light.border }]}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="settings-outline" size={20} color={Colors.light.primary} />
              </View>
              <Text style={styles.menuText}>Settings</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.light.icon} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, { paddingHorizontal: 0 }]}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="help-circle-outline" size={20} color={Colors.light.primary} />
              </View>
              <Text style={styles.menuText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.light.icon} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Fixed Bottom Section for Logout */}
        <View style={{ paddingTop: 16, paddingBottom: 32 }}>
          <TouchableOpacity
            style={{ 
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 14, 
              borderRadius: 12, 
              backgroundColor: Colors.light.red 
            }}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}