import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useStyles } from '../styles/index.styles';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/use-theme';
import { Ionicons } from '@expo/vector-icons';
import { resendOtpApi } from '../services/apis/auth/authService';
import PhoneInputWithCountry, {
  CountryCode,
  validatePhone,
} from '../components/PhoneInputWithCountry';

export default function LoginScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const { login, verifyLoginOtp } = useAuth();

  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [countryCode, setCountryCode] = useState<CountryCode>('+971');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [fullPhone, setFullPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const timerRef = useRef<any>(null);

  // Reset all fields every time this screen is focused so that after logout
  // the user always lands on the credentials step with blank fields.
  useFocusEffect(
    useCallback(() => {
      setStep('credentials');
      setCountryCode('+971');
      setPhoneDigits('');
      setFullPhone('');
      setPassword('');
      setShowPassword(false);
      setOtp('');
      setLoading(false);
      setResending(false);
      setCountdown(0);
      if (timerRef.current) clearTimeout(timerRef.current);
    }, [])
  );

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

  // Step 1: Send credentials and request OTP
  const handleRequestLoginOtp = async () => {
    const validation = validatePhone(phoneDigits, countryCode);
    if (!validation.isValid) {
      Alert.alert('Phone Required', validation.error);
      return;
    }
    if (!password) {
      Alert.alert('Password Required', 'Please enter your password.');
      return;
    }

    const targetPhone = validation.fullNumber;
    setFullPhone(targetPhone);
    setLoading(true);
    try {
      console.log('[CustomerLogin] Submitting login request for phone:', targetPhone);
      const res = await login({ phone: targetPhone, password });
      console.log('[CustomerLogin] Received response:', res);
      if (res.otpRequired) {
        setStep('otp');
        setOtp('');
        setCountdown(30);
      } else {
        // If server authenticated directly (e.g. legacy fallback)
        router.replace('/home');
      }
    } catch (error: any) {
      console.error('[CustomerLogin] Login error:', error?.message || error);
      if (error.message === 'Network request failed' || error?.message?.toLowerCase().includes('network')) {
        Alert.alert('Network Error', 'Please connect to network and try again. Ensure backend server is reachable.');
      } else {
        Alert.alert('Login Failed', error.message || 'Username or password is incorrect.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and finish login
  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert('Required', 'Please enter the 6-digit OTP code.');
      return;
    }

    if (otp.trim().length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      console.log('[CustomerLogin] Verifying OTP:', otp.trim(), 'for phone:', fullPhone);
      await verifyLoginOtp(fullPhone, otp.trim());
      console.log('[CustomerLogin] OTP verified successfully, redirecting to /home');
      router.replace('/home');
    } catch (error: any) {
      console.error('[CustomerLogin] OTP verify error:', error?.message || error);
      Alert.alert('Verification Failed', error.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await resendOtpApi(fullPhone, 'login');
      setCountdown(30);
      Alert.alert('OTP Resent', 'A new verification code has been printed to the backend terminal.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <Image
            source={require('../../assets/images/khm_logo.png')}
            style={styles.logo}
            contentFit="contain"
          />

          {step === 'credentials' ? (
            <>
              {/* Heading */}
              <Text style={styles.title}>Welcome to KHM</Text>
              <Text style={styles.subtitle}>Enter your details to continue</Text>

              {/* Phone Input with Country Dropdown */}
              <PhoneInputWithCountry
                countryCode={countryCode}
                onCountryChange={setCountryCode}
                rawDigits={phoneDigits}
                onChangeDigits={(digits, full) => {
                  setPhoneDigits(digits);
                  setFullPhone(full);
                }}
                variant="login"
              />

              {/* Password Input */}
              <View style={[styles.inputContainer, { marginTop: 0, flexDirection: 'row', alignItems: 'center' }]}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingHorizontal: 10 }}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#999" />
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.primaryButton, loading && { opacity: 0.7 }]}
                onPress={handleRequestLoginOtp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Continue with Phone</Text>
                )}
              </TouchableOpacity>

              {/* OR Divider */}
              <View style={styles.orContainer}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.orLine} />
              </View>

              {/* Email Button */}
              <TouchableOpacity style={styles.secondaryButton}>
                <Text style={styles.mailIcon}>✉</Text>
                <Text style={styles.secondaryButtonText}>Continue with Email</Text>
              </TouchableOpacity>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account?</Text>
                <TouchableOpacity onPress={() => router.push('/signup')}>
                  <Text style={styles.footerLink}>Sign up</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Heading */}
              <Text style={styles.title}>Verify Code</Text>
              <Text style={[styles.subtitle, { textAlign: 'center', marginBottom: 16 }]}>
                Enter the 6-digit verification code sent for {fullPhone || phoneDigits}
              </Text>

              {/* Terminal Notice Banner */}
              <View style={localStyles.noticeCard}>
                <Ionicons name="terminal-outline" size={22} color="#15803d" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={localStyles.noticeTitle}>Backend Terminal OTP</Text>
                  <Text style={localStyles.noticeBody}>
                    Please check your backend server terminal to view the generated OTP.
                  </Text>
                </View>
              </View>

              {/* OTP Input */}
              <View style={[styles.inputContainer, { marginTop: 12, justifyContent: 'center' }]}>
                <TextInput
                  style={[styles.input, localStyles.otpInput]}
                  placeholder="• • • • • •"
                  keyboardType="number-pad"
                  placeholderTextColor="#bbb"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  autoFocus
                />
              </View>

              {/* Verify & Login Button */}
              <TouchableOpacity
                style={[styles.primaryButton, (loading || otp.length < 6) && { opacity: 0.7 }]}
                onPress={handleVerifyOtp}
                disabled={loading || otp.length < 6}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify & Login</Text>
                )}
              </TouchableOpacity>

              {/* Resend OTP */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ color: theme.secondaryText, fontSize: 14 }}>Didn't receive code? </Text>
                {resending ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : countdown > 0 ? (
                  <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 14 }}>
                    Resend in {countdown}s
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOtp}>
                    <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 14 }}>
                      Resend Code
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Back to credentials */}
              <TouchableOpacity
                onPress={() => setStep('credentials')}
                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}
                disabled={loading}
              >
                <Ionicons name="arrow-back-outline" size={16} color={theme.secondaryText} style={{ marginRight: 4 }} />
                <Text style={{ color: theme.secondaryText, fontSize: 14 }}>Change Phone / Password</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
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
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    fontWeight: '700',
  },
});