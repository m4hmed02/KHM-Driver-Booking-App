import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles/signup.styles';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

type FocusedField =
  | 'name'
  | 'phone'
  | 'email'
  | 'password'
  | 'otp'
  | null;

export default function Signup() {
  const router = useRouter();
  const { register } = useAuth();

  // Form state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Animate content when step changes
    fadeAnim.setValue(0);
    translateYAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [step]);

  // ─── Avatar Picker ──────────────────────────────────────────────────────────
  const pickAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow access to your photo library to pick a profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  }, []);

  // ─── Step Validation & Progress ────────────────────────────────────────────────────
  const handleNextStep1 = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required', 'Please enter your phone number.');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (otp !== '1234') {
      Alert.alert('Invalid OTP', 'Please enter 1234 for testing.');
      return;
    }
    setStep(3);
  };

  const handleSignup = useCallback(async () => {
    if (!password) {
      Alert.alert('Required', 'Please enter a password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        name,
        phone,
        email,
        password,
        role: 'driver', // Set role to driver
        avatar: avatarUri ? {
          uri: avatarUri,
          name: avatarUri.split('/').pop() || 'avatar.jpg',
          type: 'image/jpeg',
        } : undefined,
      };

      await register(payload);

      Alert.alert('Success', 'Account created successfully!', [
        {
          text: 'OK',
          onPress: () => router.replace('/login')
        }
      ]);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }, [name, phone, password, avatarUri, register, router]);

  // ─── Helpers 
  const rowStyle = (field: FocusedField) =>
    focusedField === field
      ? [styles.inputRow, styles.inputRowFocused]
      : styles.inputRow;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1, justifyContent: 'center' }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {step === 1 ? 'Driver Account' : step === 2 ? 'Verify Phone' : 'Secure Account'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1 ? 'Join as a driver' : step === 2 ? 'Enter the OTP sent to your phone' : 'Create a secure password'}
            </Text>
          </View>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: translateYAnim }] }}>
            {/* ── Step 1: Profile & Details ── */}
            {step === 1 && (
              <View style={styles.form}>
                {/* ── Avatar ── */}
                <View style={styles.avatarSection}>
                  <TouchableOpacity
                    onPress={pickAvatar}
                    style={styles.avatarWrapper}
                    activeOpacity={0.8}
                    disabled={isLoading}
                  >
                    {avatarUri ? (
                      <Image
                        source={{ uri: avatarUri }}
                        style={styles.avatarImage}
                        contentFit="cover"
                      />
                    ) : (
                      <Ionicons name="camera-outline" size={36} color={Colors.light.primary} />
                    )}
                  </TouchableOpacity>
                  <Text style={styles.avatarLabel}>
                    {avatarUri ? 'Change photo' : 'Add profile photo'}
                  </Text>
                </View>

                {/* Full Name */}
                <View style={styles.fieldWrapper}>
                  <Text style={styles.label}>
                    Full Name <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={rowStyle('name')}>
                    <Ionicons name="person-outline" size={20} color={Colors.light.secondaryText} style={styles.inputIcon as any} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ahmed Al Mansouri"
                      placeholderTextColor="#AAAAAA"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                {/* Phone */}
                <View style={styles.fieldWrapper}>
                  <Text style={styles.label}>
                    Phone Number <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={rowStyle('phone')}>
                    <Ionicons name="call-outline" size={20} color={Colors.light.secondaryText} style={styles.inputIcon as any} />
                    <TextInput
                      style={styles.input}
                      placeholder="+971 50 123 4567"
                      placeholderTextColor="#AAAAAA"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      returnKeyType="done"
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField(null)}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleNextStep1}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitButtonText}>Next</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Step 2: OTP ── */}
            {step === 2 && (
              <View style={styles.form}>
                <View style={styles.fieldWrapper}>
                  <Text style={styles.label}>
                    Enter OTP (Static 1234) <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={rowStyle('otp')}>
                    <Ionicons name="keypad-outline" size={20} color={Colors.light.secondaryText} style={styles.inputIcon as any} />
                    <TextInput
                      style={styles.input}
                      placeholder="1234"
                      placeholderTextColor="#AAAAAA"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={4}
                      returnKeyType="done"
                      onFocus={() => setFocusedField('otp')}
                      onBlur={() => setFocusedField(null)}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleNextStep2}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitButtonText}>Verify & Next</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ marginTop: 16, alignItems: 'center' }}
                  onPress={() => setStep(1)}
                >
                  <Text style={{ color: Colors.light.primary, fontSize: 14 }}>Back to details</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Step 3: Password & Register ── */}
            {step === 3 && (
              <View style={styles.form}>
                {/* Email */}
                <View style={styles.fieldWrapper}>
                  <Text style={styles.label}>Email</Text>
                  <View style={rowStyle('email')}>
                    <Ionicons name="mail-outline" size={20} color={Colors.light.secondaryText} style={styles.inputIcon as any} />
                    <TextInput
                      style={styles.input}
                      placeholder="driver@example.com"
                      placeholderTextColor="#AAAAAA"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.fieldWrapper}>
                  <Text style={styles.label}>
                    Password <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={rowStyle('password')}>
                    <Ionicons name="lock-closed-outline" size={20} color={Colors.light.secondaryText} style={styles.inputIcon as any} />
                    <TextInput
                      style={styles.input}
                      placeholder="Min. 6 characters"
                      placeholderTextColor="#AAAAAA"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((p) => !p)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.passwordToggleText}>
                        {showPassword ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit */}
                <TouchableOpacity
                  style={[styles.submitButton, isLoading && { opacity: 0.7 }]}
                  onPress={handleSignup}
                  activeOpacity={0.85}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Register as Driver</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={{ marginTop: 16, alignItems: 'center' }}
                  onPress={() => setStep(2)}
                >
                  <Text style={{ color: Colors.light.primary, fontSize: 14 }}>Back to OTP</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* ── Footer ── */}
          {step === 1 && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have a driver account?</Text>
              <TouchableOpacity
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/login');
                  }
                }}
                disabled={isLoading}
              >
                <Text style={styles.footerLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}