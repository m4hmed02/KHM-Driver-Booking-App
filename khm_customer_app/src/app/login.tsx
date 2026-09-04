import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator // 1. Import ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useStyles } from '../styles/index.styles';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const styles = useStyles();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); // 2. Add loading state
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Please enter both phone number and password');
      return;
    }

    setLoading(true);
    try {
      await login({ phone, password });
      router.replace('/home');
    } catch (error: any) {
      if (error.message === 'Network request failed' || error?.message?.toLowerCase().includes('network')) {
        Alert.alert('Network Error', 'Please connect to network and try again.');
      } else {
        Alert.alert('Login Failed', 'Username or password is incorrect.');
      }
    } finally {
      setLoading(false);
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

          {/* Heading */}
          <Text style={styles.title}>Welcome to KHM</Text>
          <Text style={styles.subtitle}>Enter your details to continue</Text>

          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.countryCodeSelector}>
              <Text style={styles.countryCodeText}>+971</Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TextInput
              style={styles.input}
              placeholder="50 123 4567"
              keyboardType="phone-pad"
              placeholderTextColor="#999"
              value={phone} // Bind state
              onChangeText={setPhone} // Update state
            />
          </View>

          {/* Password Input (Added since API requires password) */}
          <View style={[styles.inputContainer, { marginTop: 15, flexDirection: 'row', alignItems: 'center' }]}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              secureTextEntry={!showPassword}
              placeholderTextColor="#999"
              value={password} // Bind state
              onChangeText={setPassword} // Update state
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingHorizontal: 10 }}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && { opacity: 0.7 }]} // Dim button when loading
            onPress={handleLogin}
            disabled={loading} // Prevent multiple clicks
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" /> // Show spinner
            ) : (
              <Text style={styles.primaryButtonText}>Login</Text>
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}