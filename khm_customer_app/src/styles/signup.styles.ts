import { StyleSheet, Platform } from 'react-native';
import { Colors } from '../constants/theme';

const C = Colors.light;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: C.secondaryText,
    textAlign: 'center',
  },

  // ─── Avatar ────────────────────────────────────────────────────────────────
  avatarSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.primary,
    borderStyle: 'dashed',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholderIcon: {
    fontSize: 36,
  },
  avatarLabel: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '500',
    color: C.primary,
  },

  // ─── Form ──────────────────────────────────────────────────────────────────
  form: {
    gap: 16,
  },
  fieldWrapper: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    letterSpacing: 0.2,
  },
  requiredStar: {
    color: C.red,
  },
  optionalTag: {
    fontSize: 11,
    color: C.secondaryText,
    fontWeight: '400',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: '#FAFBFC',
    paddingHorizontal: 14,
    gap: 10,
  },
  inputRowFocused: {
    borderColor: C.primary,
    backgroundColor: C.background,
  },
  inputIcon: {
    fontSize: 18,
    width: 22,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    paddingVertical: 0,
  },
  passwordToggleText: {
    fontSize: 13,
    color: C.primary,
    fontWeight: '500',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },

  // ─── Section divider ───────────────────────────────────────────────────────
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  sectionDividerLabel: {
    fontSize: 12,
    color: C.secondaryText,
    fontWeight: '500',
  },

  // ─── Submit Button ─────────────────────────────────────────────────────────
  submitButton: {
    height: 54,
    borderRadius: 10,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: C.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ─── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 4,
  },
  footerText: {
    fontSize: 14,
    color: C.secondaryText,
  },
  footerLink: {
    fontSize: 14,
    color: C.primary,
    fontWeight: '600',
  },
});
