import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import { styles } from '../styles/splash.styles';
import { useAuth } from '../context/AuthContext';

export default function SplashScreen() {
  const { user, isLoading } = useAuth();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true }),
          ])
        ),
      ]);
    };
    Animated.parallel([
      animateDot(dot1, 0),
      animateDot(dot2, 200),
      animateDot(dot3, 400),
    ]).start();
  }, []);

  const getDotStyle = (dot: Animated.Value) => ({
    opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }],
  });

  // Still loading session from SecureStore — show splash
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/khm_logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.dot, getDotStyle(dot1)]} />
          <Animated.View style={[styles.dot, getDotStyle(dot2)]} />
          <Animated.View style={[styles.dot, getDotStyle(dot3)]} />
        </View>
      </View>
    );
  }

  // Session loaded — redirect immediately using Redirect so this screen is
  // never placed in the back stack.
  if (user) {
    return <Redirect href="/home" />;
  }
  return <Redirect href="/login" />;
}
