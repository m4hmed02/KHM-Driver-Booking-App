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

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
      >
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={getAvatarSource()}
              style={styles.profileImage}
            />
          </View>
          <Text style={styles.name}>{user?.name || 'User'}</Text>
          <Text style={styles.contactInfo}>{user?.phone || ''}</Text>
          <Text style={styles.contactInfo}>
            {user?.email && user.email.trim() !== '' ? user.email : 'Link Your email'}
          </Text>
        </View>

        <View style={styles.menuCard}>
          <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="settings-outline" size={20} color={Colors.light.primary} />
            </View>
            <Text style={styles.menuText}>Settings</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.light.icon} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="help-circle-outline" size={20} color={Colors.light.primary} />
            </View>
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.light.icon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleLogout}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="log-out-outline" size={20} color="#ff3b30" />
            </View>
            <Text style={[styles.menuText, { color: '#ff3b30' }]}>Logout</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.light.icon} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Ionicons name="home-outline" size={24} color={Colors.light.icon} />
          <Text style={[styles.navText, { color: Colors.light.icon }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/trip_history')}>
          <Ionicons name="time-outline" size={24} color={Colors.light.icon} />
          <Text style={[styles.navText, { color: Colors.light.icon }]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={24} color={Colors.light.primary} />
          <Text style={[styles.navText, { color: Colors.light.primary }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}