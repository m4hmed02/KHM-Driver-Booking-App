import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Header } from '../components/Header';
import { useStyles } from '../styles/tripdetails.styles';
import { useTheme } from '../hooks/use-theme';
import { useRouter } from 'expo-router';

export default function TripDetails() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();

  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios'); // keep open on iOS
    if (selected) setDate(selected);
  };

  const onTimeChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selected) setTime(selected);
  };

  const formatDate = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;

  const formatTime = (d: Date) => {
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${String(h % 12 || 12).padStart(2, '0')}:${m} ${ampm}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Page Title */}
        <Text style={styles.pageTitle}>Trip Details</Text>
        <Text style={styles.pageSubtitle}>
          Please provide the specifics for your upcoming journey.
        </Text>

        {/* Schedule Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="calendar-month-outline" size={22} color={theme.primary} />
            <Text style={styles.cardHeaderText}>Schedule</Text>
          </View>

          <View style={styles.row}>
            {/* Date */}
            <View style={styles.flex1}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                activeOpacity={0.7}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={date ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                  {date ? formatDate(date) : 'mm/dd/yyyy'}
                </Text>
                <MaterialCommunityIcons name="calendar-blank-outline" size={18} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>

            {/* Time */}
            <View style={styles.flex1}>
              <Text style={styles.label}>Time</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                activeOpacity={0.7}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={time ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                  {time ? formatTime(time) : '--:-- --'}
                </Text>
                <Ionicons name="time-outline" size={18} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Native Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={date ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}

          {/* Native Time Picker */}
          {showTimePicker && (
            <DateTimePicker
              value={time ?? new Date()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}
        </View>

        {/* Vehicle Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="car-outline" size={22} color={theme.primary} />
            <Text style={styles.cardHeaderText}>Vehicle Information</Text>
          </View>

          {/* Make & Model row */}
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.label}>Make</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Toyota"
                placeholderTextColor={theme.secondaryText}
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.label}>Model</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Camry"
                placeholderTextColor={theme.secondaryText}
              />
            </View>
          </View>

          {/* Plate Number */}
          <View style={{ marginTop: 14 }}>
            <Text style={styles.label}>Plate Number</Text>
            <TextInput
              style={styles.input}
              placeholder="ABC-1234"
              placeholderTextColor={theme.secondaryText}
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Contact Phone Card */}
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Contact Phone</Text>
            <Text style={styles.badge}>AUTO-FILLED</Text>
          </View>
          <View style={styles.inputWithIcon}>
            <Ionicons name="call-outline" size={18} color={theme.secondaryText} />
            <Text style={styles.inputWithIconText}>+1 (555) 019-2837</Text>
          </View>

          {/* Driver Notes */}
          <View style={{ marginTop: 16 }}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Driver Notes</Text>
              <Text style={styles.badgeOptional}>OPTIONAL</Text>
            </View>
            <TextInput
              style={styles.notesInput}
              placeholder="Any special instructions for the driver..."
              placeholderTextColor={theme.secondaryText}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>
      </ScrollView>

      {/* Next Step Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.nextButton}
          activeOpacity={0.8}
          onPress={() => {
            router.push('/fare_estimate');
          }}
        >
          <Text style={styles.nextButtonText}>Next Step</Text>
          <Ionicons name="arrow-forward" size={20} color={theme.background} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}