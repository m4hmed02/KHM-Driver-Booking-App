import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
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
  | 'confirmPassword'
  | null;

export default function Signup() {
  const router = useRouter();
  const { register } = useAuth();

  // Form state
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  // ─── Validation & Submit ────────────────────────────────────────────────────
  const handleSignup = useCallback(async () => {
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
      const payload = {
        name,
        phone,
        email,
        password,
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
          onPress: () => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/login');
            }
          }
        }
      ]);
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }, [name, phone, email, password, confirmPassword, avatarUri, register, router]);

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
                <Text style={styles.submitButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            {/* Using router.back() to pop the screen */}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}