import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

export type CountryCode = '+971' | '+92';

export interface CountryOption {
  code: CountryCode;
  name: string;
  flag: string;
  digits: number;
  prefix: string;
  placeholder: string;
  example: string;
}

export const COUNTRIES: CountryOption[] = [
  {
    code: '+971',
    name: 'United Arab Emirates',
    flag: '🇦🇪',
    digits: 9,
    prefix: '5',
    placeholder: '50 123 4567',
    example: '50XXXXXXX',
  },
  {
    code: '+92',
    name: 'Pakistan',
    flag: '🇵🇰',
    digits: 10,
    prefix: '3',
    placeholder: '300 1234567',
    example: '300XXXXXXX',
  },
];

/**
 * Strips leading 0 and any non-digit characters.
 * Also automatically detects and strips pasted +971 or +92 prefixes.
 */
export function sanitizePhoneInput(
  text: string,
  currentCountry: CountryCode
): { cleanDigits: string; newCountry?: CountryCode } {
  let digits = text.replace(/\D/g, '');
  let detectedCountry: CountryCode | undefined = undefined;

  // Auto-detect pasted country code
  if (digits.startsWith('971')) {
    detectedCountry = '+971';
    digits = digits.slice(3);
  } else if (digits.startsWith('92')) {
    detectedCountry = '+92';
    digits = digits.slice(2);
  }

  // Strip all leading zeros so number begins immediately with mobile prefix (3 or 5)
  digits = digits.replace(/^0+/, '');

  const targetCountryCode = detectedCountry || currentCountry;
  const maxDigits = targetCountryCode === '+971' ? 9 : 10;
  if (digits.length > maxDigits) {
    digits = digits.slice(0, maxDigits);
  }

  return { cleanDigits: digits, newCountry: detectedCountry };
}

/**
 * Format digits for clean, readable display with spaces.
 */
export function formatPhoneDisplay(digits: string, countryCode: CountryCode): string {
  if (!digits) return '';
  if (countryCode === '+971') {
    // UAE: 50 123 4567 (9 digits total)
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
  } else {
    // Pakistan: 300 1234567 (10 digits total)
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  }
}

/**
 * Validates the phone number according to country rules.
 */
export function validatePhone(
  digits: string,
  countryCode: CountryCode
): { isValid: boolean; error?: string; fullNumber: string } {
  const clean = digits.replace(/\D/g, '').replace(/^0+/, '');

  if (!clean) {
    return {
      isValid: false,
      error: 'Please enter your phone number.',
      fullNumber: '',
    };
  }

  if (countryCode === '+971') {
    if (!clean.startsWith('5')) {
      return {
        isValid: false,
        error: 'UAE mobile number must start with 5 (e.g. 50, 52, 54, 55, 56, 58).',
        fullNumber: '',
      };
    }
    if (clean.length !== 9) {
      return {
        isValid: false,
        error: `UAE phone number must be 9 digits (entered ${clean.length}/9).`,
        fullNumber: '',
      };
    }
  } else if (countryCode === '+92') {
    if (!clean.startsWith('3')) {
      return {
        isValid: false,
        error: 'Pakistani mobile number must start with 3 (e.g. 300, 312, 333, etc.).',
        fullNumber: '',
      };
    }
    if (clean.length !== 10) {
      return {
        isValid: false,
        error: `Pakistani phone number must be 10 digits (entered ${clean.length}/10).`,
        fullNumber: '',
      };
    }
  }

  return {
    isValid: true,
    fullNumber: `${countryCode}${clean}`,
  };
}

interface PhoneInputWithCountryProps {
  countryCode: CountryCode;
  onCountryChange: (country: CountryCode) => void;
  rawDigits: string;
  onChangeDigits: (digits: string, fullInternational: string) => void;
  placeholder?: string;
  editable?: boolean;
  isFocused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  variant?: 'login' | 'signup';
}

export default function PhoneInputWithCountry({
  countryCode,
  onCountryChange,
  rawDigits,
  onChangeDigits,
  placeholder,
  editable = true,
  isFocused = false,
  onFocus,
  onBlur,
  containerStyle,
  variant = 'login',
}: PhoneInputWithCountryProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const activeCountry = useMemo(() => {
    return COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];
  }, [countryCode]);

  const handleTextChange = useCallback(
    (text: string) => {
      const { cleanDigits, newCountry } = sanitizePhoneInput(text, countryCode);
      if (newCountry && newCountry !== countryCode) {
        onCountryChange(newCountry);
        onChangeDigits(cleanDigits, `${newCountry}${cleanDigits}`);
      } else {
        onChangeDigits(cleanDigits, `${countryCode}${cleanDigits}`);
      }
    },
    [countryCode, onCountryChange, onChangeDigits]
  );

  const handleSelectCountry = useCallback(
    (country: CountryOption) => {
      onCountryChange(country.code);
      setModalVisible(false);

      // If user had existing digits, trim if switching to UAE (9 digits)
      let updatedDigits = rawDigits;
      if (country.code === '+971' && updatedDigits.length > 9) {
        updatedDigits = updatedDigits.slice(0, 9);
      }
      onChangeDigits(updatedDigits, `${country.code}${updatedDigits}`);
    },
    [onCountryChange, onChangeDigits, rawDigits]
  );

  const displayValue = useMemo(() => {
    return formatPhoneDisplay(rawDigits, countryCode);
  }, [rawDigits, countryCode]);

  const isSignupVariant = variant === 'signup';

  return (
    <>
      <View
        style={[
          styles.container,
          isSignupVariant ? styles.signupContainer : styles.loginContainer,
          isFocused && styles.focusedBorder,
          containerStyle,
        ]}
      >
        {/* Country Code Dropdown Trigger */}
        <TouchableOpacity
          style={styles.countryPickerButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
          disabled={!editable}
        >
          <Text style={styles.flagEmoji}>{activeCountry.flag}</Text>
          <Text style={styles.countryCodeText}>{activeCountry.code}</Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={Colors.light.secondaryText}
            style={styles.chevronIcon}
          />
        </TouchableOpacity>

        <View style={styles.verticalDivider} />

        {/* Local Number Input */}
        <TextInput
          style={styles.textInput}
          placeholder={placeholder || activeCountry.placeholder}
          placeholderTextColor="#9CA3AF"
          value={displayValue}
          onChangeText={handleTextChange}
          keyboardType="phone-pad"
          editable={editable}
          onFocus={onFocus}
          onBlur={onBlur}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={activeCountry.digits + 2} // allow for spacing
        />
      </View>

      {/* Country Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country Code</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.optionsList}>
              {COUNTRIES.map((item) => {
                const isSelected = item.code === countryCode;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[
                      styles.countryRow,
                      isSelected && styles.countryRowSelected,
                    ]}
                    onPress={() => handleSelectCountry(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.rowFlag}>{item.flag}</Text>
                    <View style={styles.rowInfo}>
                      <Text
                        style={[
                          styles.rowName,
                          isSelected && styles.rowNameSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.rowDetails}>
                        Format: {item.placeholder} ({item.digits} digits)
                      </Text>
                    </View>
                    <Text style={styles.rowCode}>{item.code}</Text>
                    {isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={Colors.light.primary}
                        style={{ marginLeft: 8 }}
                      />
                    ) : (
                      <View style={{ width: 22, marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E7EA',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    width: '100%',
  },
  loginContainer: {
    height: 56,
    borderRadius: 8,
    marginBottom: 24,
  },
  signupContainer: {
    height: 52,
    borderRadius: 10,
    backgroundColor: '#FAFBFC',
  },
  focusedBorder: {
    borderColor: Colors.light.primary,
    backgroundColor: '#FFFFFF',
  },
  countryPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: '100%',
    backgroundColor: '#F9FAFB',
  },
  flagEmoji: {
    fontSize: 20,
    marginRight: 6,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#14171A',
    marginRight: 4,
  },
  chevronIcon: {
    marginTop: 1,
  },
  verticalDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#E4E7EA',
  },
  textInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#14171A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#14171A',
  },
  modalCloseButton: {
    padding: 4,
  },
  optionsList: {
    gap: 8,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  countryRowSelected: {
    backgroundColor: '#E8F7EA',
    borderColor: Colors.light.primary,
  },
  rowFlag: {
    fontSize: 26,
    marginRight: 12,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#14171A',
  },
  rowNameSelected: {
    color: '#15803d',
  },
  rowDetails: {
    fontSize: 12,
    color: '#6C7580',
    marginTop: 2,
  },
  rowCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#14171A',
  },
});
