import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useStyles } from '../styles/driverrequestcard.styles';
import { useTheme } from '../hooks/use-theme';
import { useRouter } from 'expo-router';

export interface DriverRequestProps {
  driverName: string;
  rating?: number;
  fare: string;
  imageUrl?: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function DriverRequestCard({
  driverName,
  rating = 4.8,
  fare,
  imageUrl,
  onAccept,
  onDecline,
}: DriverRequestProps) {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.card}>
      {/* Profile & Fare Header */}
      <View style={styles.headerRow}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.profileImage} />
        ) : (
          <View style={styles.profilePlaceholder}>
            <Ionicons name="person" size={24} color={theme.primary} />
          </View>
        )}

        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{driverName}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={theme.amber} />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        </View>

        <View style={styles.fareContainer}>
          <Text style={styles.fareLabel}>Offered Fare</Text>
          <Text style={styles.fareValue}>{fare}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.button, styles.declineButton]}
          activeOpacity={0.7}
          onPress={onDecline}
        >
          <MaterialCommunityIcons name="close" size={18} color={theme.red} />
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.acceptButton]}
          activeOpacity={0.8}
          onPress={() => router.push('/driver_assigned')}
        // onPress={onAccept}
        >
          <MaterialCommunityIcons name="check" size={18} color={theme.background} />
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
