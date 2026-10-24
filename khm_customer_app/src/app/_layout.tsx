import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, Platform } from 'react-native';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { AuthProvider } from '../context/AuthContext';
import Profile from './profile';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    async function prepare() {
      if (Platform.OS === 'android') {
        try {
          await NavigationBar.setVisibilityAsync('hidden');
        } catch {
          // Current activity may not be ready or available during app reloads
        }
      }
      try {
        await SplashScreen.hideAsync();
      } catch {
        // Splash screen may already be hidden
      }
    }
    prepare();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <StatusBar hidden={true} />
          <Drawer
            screenOptions={{
              headerShown: false,
              drawerStyle: {
                width: '70%',
                borderTopRightRadius: 24,
                borderBottomRightRadius: 24,
                overflow: 'hidden'
              }
            }}
            drawerContent={() => <Profile />}
          >
            <Drawer.Screen name='index' />
            <Drawer.Screen name='home' />
            <Drawer.Screen name='profile' options={{ drawerItemStyle: { display: 'none' } }} />
            <Drawer.Screen name='fare_estimate' />
            <Drawer.Screen name='driver_assigned' />
            <Drawer.Screen name='trip_completed' />
            <Drawer.Screen name='available_requests' />
            <Drawer.Screen name='scheduled_rides' />
          </Drawer>
        </SafeAreaView>
      </AuthProvider>
    </ThemeProvider>
  );
}