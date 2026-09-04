import { StyleSheet } from 'react-native';
import { useTheme } from '../hooks/use-theme';

export const useStyles = () => {
    const theme = useTheme();

    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.background,
        },
        keyboardView: {
            flex: 1,
        },
        content: {
            flex: 1,
            paddingHorizontal: 24,
            justifyContent: 'center',
            alignItems: 'center',
            paddingBottom: 40,
        },
        logo: {
            width: 200,
            height: 200,
            marginBottom: 5,
        },
        title: {
            fontSize: 32,
            fontWeight: '700',
            color: theme.text,
            marginBottom: 8,
        },
        subtitle: {
            fontSize: 16,
            color: theme.secondaryText,
            marginBottom: 32,
        },
        inputContainer: {
            flexDirection: 'row',
            height: 56,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 8,
            marginBottom: 24,
            width: '100%',
            backgroundColor: theme.background,
            overflow: 'hidden',
        },
        countryCodeSelector: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            backgroundColor: '#F9FAFB', // Slight offset not in theme
        },
        countryCodeText: {
            fontSize: 16,
            color: theme.text,
            marginRight: 8,
        },
        dropdownIcon: {
            fontSize: 10,
            color: theme.icon,
        },
        divider: {
            width: 1,
            height: '100%',
            backgroundColor: theme.border,
        },
        input: {
            flex: 1,
            paddingHorizontal: 16,
            fontSize: 16,
            color: theme.text,
        },
        primaryButton: {
            backgroundColor: theme.primary,
            width: '100%',
            height: 56,
            borderRadius: 8,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 32,
        },
        primaryButtonText: {
            color: theme.background, // white
            fontSize: 16,
            fontWeight: '600',
        },
        orContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            marginBottom: 32,
        },
        orLine: {
            flex: 1,
            height: 1,
            backgroundColor: theme.border,
        },
        orText: {
            paddingHorizontal: 16,
            color: theme.secondaryText,
            fontSize: 12,
            fontWeight: '500',
        },
        secondaryButton: {
            flexDirection: 'row',
            width: '100%',
            height: 56,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.border,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.background,
        },
        mailIcon: {
            fontSize: 18,
            marginRight: 12,
            color: theme.text,
        },
        secondaryButtonText: {
            color: theme.text,
            fontSize: 16,
            fontWeight: '600',
        },
        footer: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 32,
            gap: 4,
        },
        footerText: {
            fontSize: 14,
            color: theme.secondaryText,
        },
        footerLink: {
            fontSize: 14,
            color: theme.primary,
            fontWeight: '600',
        },
    });
};
