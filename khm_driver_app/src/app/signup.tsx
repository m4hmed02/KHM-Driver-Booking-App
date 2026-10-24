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
  Easing,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles/signup.styles';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import {
  sendRegisterOtpApi,
  verifyRegisterOtpApi,
  resendOtpApi
} from '../services/apis/auth/authService';
import PhoneInputWithCountry, {
  CountryCode,
  validatePhone,
} from '../components/PhoneInputWithCountry';

type FocusedField =
  | 'name'
  | 'phone'
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'otp'
  | null;

export default function Signup() {
  const router = useRouter();
  const { register } = useAuth();

  // Form state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>('+971');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [fullPhone, setFullPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [countdown]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
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

  // ─── Step 1 -> Step 2: Validate details & send real OTP ──────────────────────
  const handleNextStep1 = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    const phoneVal = validatePhone(phoneDigits, countryCode);
    if (!phoneVal.isValid) {
      Alert.alert('Phone Required', phoneVal.error);
      return;
    }

    const targetPhone = phoneVal.fullNumber;
    setFullPhone(targetPhone);
    setIsLoading(true);
    try {
      console.log('[DriverSignup] Sending register OTP request for phone:', targetPhone);
      await sendRegisterOtpApi({
        phone: targetPhone,
        email: email.trim() || undefined,
      });
      console.log('[DriverSignup] Register OTP sent successfully');
      setStep(2);
      setOtp('');
      setCountdown(30);
    } catch (error: any) {
      console.error('[DriverSignup] Send register OTP error:', error?.message || error);
      Alert.alert('Validation Error', error.message || 'Failed to send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Step 2 -> Step 3: Verify OTP ───────────────────────────────────────────
  const handleNextStep2 = async () => {
    if (!otp.trim()) {
      Alert.alert('Required', 'Please enter the 6-digit OTP code.');
      return;
    }
    if (otp.trim().length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a valid 6-digit verification code.');
      return;
    }

    const targetPhone = fullPhone || `${countryCode}${phoneDigits}`;
    setIsLoading(true);
    try {
      console.log('[DriverSignup] Verifying OTP step 2:', otp.trim());
      await verifyRegisterOtpApi({
        phone: targetPhone,
        otp: otp.trim(),
      });
      console.log('[DriverSignup] OTP step 2 verified successfully');
      setStep(3);
    } catch (error: any) {
      console.error('[DriverSignup] OTP step 2 error:', error?.message || error);
      Alert.alert('Verification Failed', error.message || 'Invalid or expired OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await resendOtpApi(fullPhone || `${countryCode}${phoneDigits}`, 'register');
      setCountdown(30);
      Alert.alert('OTP Resent', 'A new verification code has been printed to the backend terminal.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  // ─── Step 3: Complete Driver Registration ───────────────────────────────────
  const handleSignup = useCallback(async () => {
    if (!password) {
      Alert.alert('Required', 'Please enter a password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    if (confirmPassword && password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[DriverSignup] Completing driver registration with OTP:', otp.trim());
      const payload = {
        name: name.trim(),
        phone: fullPhone || `${countryCode}${phoneDigits}`,
        email: email.trim(),
        password,
        role: 'driver',
        otp: otp.trim(),
        avatar: avatarUri
          ? {
              uri: avatarUri,
              name: avatarUri.split('/').pop() || 'avatar.jpg',
              type: 'image/jpeg',
            }
          : undefined,
      };

      await register(payload);
      console.log('[DriverSignup] Driver registration successful!');

      Alert.alert('Success', 'Driver account created successfully! Please log in.', [
        {
          text: 'OK',
          onPress: () => router.replace('/login'),
        },
      ]);
    } catch (error: any) {
      console.error('[DriverSignup] Registration error:', error?.message || error);
      Alert.alert('Registration Failed', error.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }, [name, fullPhone, countryCode, phoneDigits, email, password, confirmPassword, otp, avatarUri, register, router]);

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
          {/* ── Step Progress Indicator ── */}
          <View style={stepBarStyles.progressContainer}>
            <View style={[stepBarStyles.progressStep, step >= 1 && stepBarStyles.progressStepActive]} />
            <View style={[stepBarStyles.progressStep, step >= 2 && stepBarStyles.progressStepActive]} />
            <View style={[stepBarStyles.progressStep, step >= 3 && stepBarStyles.progressStepActive]} />
          </View>

          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {step === 1 ? 'Driver Account' : step === 2 ? 'Verify Phone' : 'Secure Account'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 1
                ? 'Join as a professional driver'
                : step === 2
                ? `Enter the OTP sent for ${fullPhone || phoneDigits}`
                : 'Create your account password'}
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
                  <PhoneInputWithCountry
                    countryCode={countryCode}
                    onCountryChange={setCountryCode}
                    rawDigits={phoneDigits}
                    onChangeDigits={(digits, full) => {
                      setPhoneDigits(digits);
                      setFullPhone(full);
                    }}
                    variant="signup"
                    editable={!isLoading}
                    isFocused={focusedField === 'phone'}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, isLoading && { opacity: 0.7 }]}
                  onPress={handleNextStep1}
                  activeOpacity={0.85}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Next</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* ── Step 2: Real Terminal OTP Verification ── */}
            {step === 2 && (
              <View style={styles.form}>
                {/* Terminal Notice Card */}
                <View style={otpStyles.noticeCard}>
                  <Ionicons name="terminal-outline" size={22} color="#15803d" style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={otpStyles.noticeTitle}>Backend Terminal OTP</Text>
                    <Text style={otpStyles.noticeBody}>
                      Please check your backend server terminal to view the generated OTP code.
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldWrapper}>
                  <Text style={styles.label}>
                    Enter 6-Digit OTP <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={rowStyle('otp')}>
                    <Ionicons name="keypad-outline" size={20} color={Colors.light.secondaryText} style={styles.inputIcon as any} />
                    <TextInput
                      style={[styles.input, otpStyles.otpInput]}
                      placeholder="• • • • • •"
                      placeholderTextColor="#AAAAAA"
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleNextStep2}
                      onFocus={() => setFocusedField('otp')}
                      onBlur={() => setFocusedField(null)}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, (isLoading || otp.length < 6) && { opacity: 0.7 }]}
                  onPress={handleNextStep2}
                  activeOpacity={0.85}
                  disabled={isLoading || otp.length < 6}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Verify & Next</Text>
                  )}
                </TouchableOpacity>

                {/* Resend OTP */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14 }}>
                  <Text style={{ color: Colors.light.secondaryText, fontSize: 14 }}>Didn't receive code? </Text>
                  {resending ? (
                    <ActivityIndicator size="small" color={Colors.light.primary} />
                  ) : countdown > 0 ? (
                    <Text style={{ color: Colors.light.primary, fontWeight: '600', fontSize: 14 }}>
                      Resend in {countdown}s
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handleResendOtp}>
                      <Text style={{ color: Colors.light.primary, fontWeight: '700', fontSize: 14 }}>
                        Resend Code
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={{ marginTop: 16, alignItems: 'center' }}
                  onPress={() => setStep(1)}
                  disabled={isLoading}
                >
                  <Text style={{ color: Colors.light.primary, fontSize: 14 }}>← Back to details</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Step 3: Password & Register ── */}
            {step === 3 && (
              <View style={styles.form}>
                {/* Email */}
                <View style={styles.fieldWrapper}>
                  <Text style={styles.label}>
                    Email <Text style={styles.optionalTag}>(optional)</Text>
                  </Text>
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
                      returnKeyType="next"
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

                {/* Confirm Password */}
                <View style={styles.fieldWrapper}>
                  <Text style={styles.label}>
                    Confirm Password <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={rowStyle('confirmPassword')}>
                    <Ionicons name="key-outline" size={20} color={Colors.light.secondaryText} style={styles.inputIcon as any} />
                    <TextInput
                      style={styles.input}
                      placeholder="Repeat your password"
                      placeholderTextColor="#AAAAAA"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      returnKeyType="done"
                      onSubmitEditing={handleSignup}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword((p) => !p)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.passwordToggleText}>
                        {showConfirmPassword ? 'Hide' : 'Show'}
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
                  disabled={isLoading}
                >
                  <Text style={{ color: Colors.light.primary, fontSize: 14 }}>← Back to OTP</Text>
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

const stepBarStyles = StyleSheet.create({
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E4E7EA',
  },
  progressStepActive: {
    backgroundColor: Colors.light.primary,
  },
});

const otpStyles = StyleSheet.create({
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 2,
  },
  noticeBody: {
    fontSize: 12,
    color: '#15803d',
    lineHeight: 16,
  },
  otpInput: {
    fontSize: 22,
    letterSpacing: 6,
    fontWeight: '700',
  },
});