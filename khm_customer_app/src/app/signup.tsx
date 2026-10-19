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
import { sendRegisterOtpApi, resendOtpApi } from '../services/apis/auth/authService';

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
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

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

  // ─── Step 1: Validate Details and Send Registration OTP ─────────────────────
  const handleRequestOtp = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required', 'Please enter your phone number.');
      return;
    }
    if (!password) {
      Alert.alert('Required', 'Please enter a password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[CustomerSignup] Sending register OTP request for phone:', phone.trim());
      await sendRegisterOtpApi({
        phone: phone.trim(),
        email: email.trim() || undefined,
      });
      console.log('[CustomerSignup] Register OTP sent successfully');
      setStep('otp');
      setOtp('');
      setCountdown(30);
    } catch (error: any) {
      console.error('[CustomerSignup] Send register OTP error:', error?.message || error);
      Alert.alert('Registration Error', error.message || 'Failed to send OTP.');
    } finally {
      setIsLoading(false);
    }
  }, [name, phone, email, password, confirmPassword]);

  // ─── Step 2: Verify OTP and Register ────────────────────────────────────────
  const handleCompleteRegistration = useCallback(async () => {
    if (!otp.trim()) {
      Alert.alert('Required', 'Please enter the 6-digit OTP code.');
      return;
    }
    if (otp.trim().length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a valid 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[CustomerSignup] Completing registration with OTP:', otp.trim());
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
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
      console.log('[CustomerSignup] Registration successful!');

      Alert.alert('Success', 'Account created successfully! Please log in.', [
        {
          text: 'OK',
          onPress: () => router.replace('/login'),
        },
      ]);
    } catch (error: any) {
      console.error('[CustomerSignup] Complete registration error:', error?.message || error);
      Alert.alert('Registration Failed', error.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }, [name, phone, email, password, otp, avatarUri, register, router]);

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await resendOtpApi(phone.trim(), 'register');
      setCountdown(30);
      Alert.alert('OTP Resent', 'A new verification code has been printed to the backend terminal.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'form' ? (
            <>
              {/* ── Header ── */}
              <View style={styles.header}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>
                  Join KHM and start booking rides
                </Text>
              </View>

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

              {/* ── Form ── */}
              <View style={styles.form}>
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
                      returnKeyType="next"
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField(null)}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                {/* Email */}
                <View style={styles.fieldWrapper}>
                  <Text style={styles.label}>
                    Email <Text style={styles.optionalTag}>(optional)</Text>
                  </Text>
                  <View style={rowStyle('email')}>
                    <Ionicons name="mail-outline" size={20} color={Colors.light.secondaryText} style={styles.inputIcon as any} />
                    <TextInput
                      style={styles.input}
                      placeholder="hello@example.com"
                      placeholderTextColor="#AAAAAA"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
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
                      onSubmitEditing={handleRequestOtp}
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
                  onPress={handleRequestOtp}
                  activeOpacity={0.85}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Continue</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* ── Footer ── */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account?</Text>
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
            </>
          ) : (
            <>
              {/* ── OTP Verification Step ── */}
              <View style={styles.header}>
                <Text style={styles.title}>Verify Phone</Text>
                <Text style={styles.subtitle}>
                  Enter the 6-digit verification code sent for {phone}
                </Text>
              </View>

              {/* Terminal Notice Card */}
              <View style={otpStyles.noticeCard}>
                <Ionicons name="terminal-outline" size={24} color="#15803d" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={otpStyles.noticeTitle}>Backend Terminal OTP</Text>
                  <Text style={otpStyles.noticeBody}>
                    Your registration verification OTP has been printed to the backend terminal console.
                  </Text>
                </View>
              </View>

              <View style={styles.form}>
                <View style={styles.fieldWrapper}>
                  <Text style={styles.label}>
                    Verification Code <Text style={styles.requiredStar}>*</Text>
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
                      onFocus={() => setFocusedField('otp')}
                      onBlur={() => setFocusedField(null)}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                {/* Complete Registration Button */}
                <TouchableOpacity
                  style={[styles.submitButton, (isLoading || otp.length < 6) && { opacity: 0.7 }]}
                  onPress={handleCompleteRegistration}
                  activeOpacity={0.85}
                  disabled={isLoading || otp.length < 6}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Verify & Create Account</Text>
                  )}
                </TouchableOpacity>

                {/* Resend OTP */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16 }}>
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

                {/* Back to Edit Form */}
                <TouchableOpacity
                  style={{ marginTop: 24, alignItems: 'center' }}
                  onPress={() => setStep('form')}
                  disabled={isLoading}
                >
                  <Text style={{ color: Colors.light.primary, fontSize: 14 }}>← Back to Edit Details</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const otpStyles = StyleSheet.create({
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
    width: '100%',
  },
  noticeTitle: {
    fontSize: 14,
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