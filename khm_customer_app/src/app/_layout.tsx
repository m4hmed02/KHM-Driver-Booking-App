import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { AuthProvider } from '../context/AuthContext'; // 1. Import your AuthProvider

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    async function prepare() {
      await NavigationBar.setVisibilityAsync('hidden');
      await SplashScreen.hideAsync();
    }
    prepare();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* 2. Wrap your main layout components with AuthProvider */}
      <AuthProvider>
        <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
          <StatusBar hidden={true} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name='index' />
            <Stack.Screen name='home' />
            <Stack.Screen name='location_picker' />
            <Stack.Screen name='mode_selection' />
            <Stack.Screen name='trip_details' />
            <Stack.Screen name='fare_estimate' />
            <Stack.Screen name='driver_assigned' />
            <Stack.Screen name='trip_in_progress' />
            <Stack.Screen name='trip_completed' />
          </Stack>
        </SafeAreaView>
      </AuthProvider>
    </ThemeProvider>
  );
}