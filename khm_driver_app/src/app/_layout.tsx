import * as NavigationBar from 'expo-navigation-bar';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { connectSocket, disconnectSocket } from '../services/socket';
import Profile from './profile';

SplashScreen.preventAutoHideAsync();

/**
 * Manages the Socket.io connection lifecycle tied to auth state.
 * Connects when a logged-in user is present; disconnects on logout.
 */
function SocketManager() {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.token) {
      connectSocket(user.token, user._id);
    } else {
      disconnectSocket();
    }
  }, [user?.token, user?._id]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    async function prepare() {
      await NavigationBar.setVisibilityAsync('hidden');
      await SplashScreen.hideAsync();
    }
    prepare();
  }, []);

  return (
    // GestureHandlerRootView MUST wrap the entire tree — especially the Drawer navigator
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <SocketManager />
          <StatusBar hidden={true} />
          <Drawer
            screenOptions={{
              headerShown: false,
              drawerStyle: {
                width: '70%',
                borderTopRightRadius: 24,
                borderBottomRightRadius: 24,
                overflow: 'hidden',
              },
            }}
            drawerContent={(props) => <Profile {...props} />}
          >
            <Drawer.Screen name="index" />
            <Drawer.Screen name="home" />
            <Drawer.Screen name="active_ride" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="profile" options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name="trip_history" />
            <Drawer.Screen
              name="trip_completed"
              options={{ drawerItemStyle: { display: 'none' } }}
            />
            <Drawer.Screen
              name="scheduled_rides"
              options={{ drawerItemStyle: { display: 'none' } }}
            />
          </Drawer>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
