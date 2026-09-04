import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStyles } from '../styles/finddriver.styles';

interface FindDriverProps {
  onCancel: () => void;
}

export function FindDriver({ onCancel }: FindDriverProps) {
  const styles = useStyles();
  
  // Simple pulsing animation for the outer radar circles
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.radarContainer, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.radarMiddle}>
          <View style={styles.radarInner}>
            <MaterialCommunityIcons name="car" size={32} color="#FFF" />
          </View>
        </View>
      </Animated.View>

      <Text style={styles.title}>Finding your driver...</Text>
      
      <Text style={styles.subtitle}>
        Please wait while we connect you with a nearby KHM driver.
      </Text>

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.7}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}
